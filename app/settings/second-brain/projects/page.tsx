'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { Plus, ArrowLeft, X, Trash2, Calendar, ChevronLeft, ChevronRight, Pin, Star, GripVertical } from 'lucide-react';
import ProjectCard from '@/components/second-brain/ProjectCard';
import ProjectStatusTabs from '@/components/second-brain/ProjectStatusTabs';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { CreateProjectInput, UpdateProjectInput, Project } from '@/types/second-brain';
import { useDndKit } from '@/hooks/useDndKit';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths } from 'date-fns';

// 프론트엔드 전용 타입
interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  scheduledDate?: Date;
  clarification?: string; // 명료화
  nextActionStatus?: string; // 다음행동상황
  isHighlight: boolean; // 오늘의 하이라이트 여부
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: '중간 작업물' | '나중에 보기' | '레퍼런스'; // 분류
  linkedAreaOrResource?: string; // area-{id} 또는 resource-{id}
  isPinned: boolean; // 고정하기
}

export default function ProjectsSettingsPage() {
  const router = useRouter();
  const { projects, createProject, updateProject, deleteProject } = useProjectStore();
  const { goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [selectedStatus, setSelectedStatus] = useState<'not_started' | 'active' | 'on_hold' | 'completed'>('not_started');
  const [isCreating, setIsCreating] = useState(false);

  // 편집 관련 state
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // 노트 상태 (프론트엔드 전용)
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [showNoteEditModal, setShowNoteEditModal] = useState(false);

  // 할일 상태 (프론트엔드 전용)
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [showTodoEditModal, setShowTodoEditModal] = useState(false);

  // 달력 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // useDndKit Hook 사용 (범용 드래그 앤 드롭)
  const { sensors, activeItem: activeTodo, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps, dragOverlayProps } = useDndKit<TodoItem>({
    onDragEnd: (active, over) => {
      // over가 없거나 ID가 없으면 무시
      if (!over || !over.id) return;

      const todoId = active.id as string;
      const dateString = over.id as string;

      // dateString이 유효한 날짜 형식인지 확인 (yyyy-MM-dd)
      // 이 검증으로 할일 아이템 위나 다른 드롭 영역에 드롭하는 것을 방지
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;

      const scheduledDate = new Date(dateString);

      // 유효한 날짜인지 확인 (Invalid Date 방지)
      if (isNaN(scheduledDate.getTime())) return;

      setTodos(
        todos.map((todo) =>
          todo.id === todoId ? { ...todo, scheduledDate } : todo
        )
      );
    },
    getActiveItem: (id) => todos.find((t) => t.id === id),
  });

  useEffect(() => {
    // projects는 Zustand persist가 자동으로 localStorage에서 복원
    fetchGoals();
    fetchAreas();
    fetchResources();
  }, [fetchGoals, fetchAreas, fetchResources]);

  // 선택된 상태의 프로젝트 필터링 (useMemo로 캐싱)
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => project.status === selectedStatus);
  }, [projects, selectedStatus]);

  // 새 프로젝트 추가 핸들러 - "새 프로젝트" 카드를 즉시 생성
  const handleAddProject = async () => {
    if (isCreating) return; // 중복 클릭 방지

    setIsCreating(true);
    try {
      // 프로젝트 생성 - Zustand persist가 자동으로 localStorage에 저장하고 UI 즉시 업데이트
      const createdProject = await createProject({
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        order_index: projects.length,
      });

      console.log('새 프로젝트 생성 완료:', createdProject);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (project.area_id) {
      paraSelection = `area-${project.area_id}`;
    } else if (project.resource_id) {
      paraSelection = `resource-${project.resource_id}`;
    }

    setEditingProject({ ...project, paraSelection, isNew: false });
    setEditDialogOpen(true);
  };

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingProject) {
      setEditingProject({ ...editingProject, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingProject) {
      const color = getColorById(colorId).hex;
      setEditingProject({ ...editingProject, color });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingProject || !editingProject.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (editingProject.paraSelection) {
        if (editingProject.paraSelection.startsWith('area-')) {
          area_id = editingProject.paraSelection.replace('area-', '');
        } else if (editingProject.paraSelection.startsWith('resource-')) {
          resource_id = editingProject.paraSelection.replace('resource-', '');
        }
      }

      if (editingProject.isNew) {
        // 새 프로젝트 생성
        const projectData: CreateProjectInput = {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
          status: editingProject.status,
          goal_id: editingProject.goal_id || undefined,
          area_id,
          resource_id,
          start_date: editingProject.start_date || undefined,
          target_end_date: editingProject.target_end_date || undefined,
          order_index: editingProject.order_index,
        };
        await createProject(projectData);
      } else {
        // 기존 프로젝트 수정
        const updateData: UpdateProjectInput = {
          title: editingProject.title,
          description: editingProject.description || '',
          icon: editingProject.icon,
          color: editingProject.color,
          status: editingProject.status,
          goal_id: editingProject.goal_id || undefined,
          area_id,
          resource_id,
          start_date: editingProject.start_date || undefined,
          target_end_date: editingProject.target_end_date || undefined,
        };
        await updateProject(editingProject.id, updateData);
      }

      setEditDialogOpen(false);
      setEditingProject(null);
      // Zustand persist가 자동으로 localStorage에 저장하고 UI 업데이트
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      setDeleteConfirmOpen(false);
      setProjectToDelete(null);
      // Zustand persist가 자동으로 localStorage에 저장하고 UI 업데이트
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  // 노트 추가 - 즉시 "새 노트" 카드 생성
  const handleAddNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '새 노트',
      content: '',
      category: '중간 작업물',
      isPinned: false,
    };

    // 맨 뒤에 추가
    setNotes([...notes, newNote]);
  };

  // 노트 제거
  const handleRemoveNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  // 노트 편집 열기
  const handleNoteClick = (note: NoteItem) => {
    setEditingNote({ ...note });
    setShowNoteEditModal(true);
  };

  // 노트 편집 저장
  const handleSaveNoteEdit = () => {
    if (!editingNote || !editingNote.title.trim()) {
      alert('노트 제목을 입력해주세요.');
      return;
    }

    setNotes(notes.map((note) => (note.id === editingNote.id ? editingNote : note)));
    setShowNoteEditModal(false);
    setEditingNote(null);
  };

  // 노트 편집 취소
  const handleCancelNoteEdit = () => {
    setShowNoteEditModal(false);
    setEditingNote(null);
  };

  // 할일 추가 - 즉시 "새 할일" 카드 생성
  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '새 할일',
      completed: false,
      isHighlight: false,
    };

    // 맨 뒤에 추가
    setTodos([...todos, newTodo]);
  };

  // 할일 완료 토글
  const handleToggleTodo = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // 할일 제거
  const handleRemoveTodo = (todoId: string) => {
    setTodos(todos.filter((todo) => todo.id !== todoId));
  };

  // 할일 편집 열기
  const handleTodoClick = (todo: TodoItem) => {
    setEditingTodo({ ...todo });
    setShowTodoEditModal(true);
  };

  // 할일 편집 저장
  const handleSaveTodoEdit = () => {
    if (!editingTodo || !editingTodo.title.trim()) {
      alert('할일 제목을 입력해주세요.');
      return;
    }

    setTodos(todos.map((todo) => (todo.id === editingTodo.id ? editingTodo : todo)));
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 편집 취소
  const handleCancelTodoEdit = () => {
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">프로젝트 (Projects)</h1>
              <p className="text-sm text-base-content/70">
                진행 중인 프로젝트를 관리하세요
              </p>
            </div>
            <button
              onClick={handleAddProject}
              className="btn btn-primary btn-sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? '생성 중...' : '추가'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 상태별 탭 */}
        <ProjectStatusTabs
          projects={projects}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* 프로젝트 목록 */}
        <div className="mt-6 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  {selectedStatus === 'not_started' && '시작 안함 프로젝트가 없습니다.'}
                  {selectedStatus === 'active' && '진행중인 프로젝트가 없습니다.'}
                  {selectedStatus === 'on_hold' && '중단된 프로젝트가 없습니다.'}
                  {selectedStatus === 'completed' && '완료된 프로젝트가 없습니다.'}
                </p>
                <button
                  onClick={handleAddProject}
                  className="btn btn-primary btn-sm mt-4 mx-auto"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isCreating ? '생성 중...' : '새 프로젝트 추가'}
                </button>
              </div>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEditClick={handleEditProject}
              />
            ))
          )}
        </div>
      </div>

      {/* 편집/추가 다이얼로그 */}
      {editDialogOpen && editingProject && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingProject.isNew ? '새 프로젝트 추가' : '프로젝트 편집'}
            </h3>

            {/* 아이콘 및 색상 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">아이콘 및 색상</span>
              </label>
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="btn btn-outline w-full justify-start"
                style={{
                  backgroundColor: editingProject.color + '20',
                  borderColor: editingProject.color,
                }}
              >
                {(() => {
                  const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey).component;
                  return <IconComponent className="w-6 h-6 mr-2" />;
                })()}
                <span>변경하기</span>
              </button>
            </div>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingProject.title}
                onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 웹사이트 리뉴얼"
              />
            </div>

            {/* 연결할 목표 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">연결할 목표 (선택)</span>
              </label>
              <select
                value={editingProject.goal_id || ''}
                onChange={(e) => setEditingProject({ ...editingProject, goal_id: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                {goals.map((goal) => {
                  const GoalIcon = getUnifiedIcon(goal.icon as UnifiedIconKey).component;
                  return (
                    <option key={goal.id} value={goal.id}>
                      {goal.title}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 진행상황 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">진행상황</span>
              </label>
              <select
                value={editingProject.status}
                onChange={(e) =>
                  setEditingProject({
                    ...editingProject,
                    status: e.target.value as 'not_started' | 'active' | 'on_hold' | 'completed',
                  })
                }
                className="select select-bordered"
              >
                <option value="not_started">시작 안함</option>
                <option value="active">진행중</option>
                <option value="on_hold">중단</option>
                <option value="completed">완료</option>
              </select>
            </div>

            {/* 연결할 영역/자원 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">연결할 영역/자원 (선택)</span>
              </label>
              <select
                value={editingProject.paraSelection}
                onChange={(e) => setEditingProject({ ...editingProject, paraSelection: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => {
                    const AreaIcon = getUnifiedIcon(area.icon as UnifiedIconKey).component;
                    return (
                      <option key={area.id} value={`area-${area.id}`}>
                        {area.title}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => {
                    const ResourceIcon = getUnifiedIcon(resource.icon as UnifiedIconKey).component;
                    return (
                      <option key={resource.id} value={`resource-${resource.id}`}>
                        {resource.title}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>

            {/* 시작일/종료일 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={editingProject.target_end_date || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, target_end_date: e.target.value })}
                  className="input input-bordered"
                />
              </div>
            </div>

            {/* ========== 노트 영역 ========== */}
            <div className="card bg-base-200 mb-4">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">연결된 노트</h2>
                  <button onClick={handleAddNote} className="btn btn-ghost btn-sm">
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>

                {notes.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    연결된 노트가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes
                      .sort((a, b) => {
                        // 고정된 노트를 상단에 배치
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return 0;
                      })
                      .map((note) => {
                        // 연결된 영역/자원 이름 가져오기
                        let linkedName = '';
                        if (note.linkedAreaOrResource) {
                          if (note.linkedAreaOrResource.startsWith('area-')) {
                            const linkedArea = areas.find((a) => a.id === note.linkedAreaOrResource?.replace('area-', ''));
                            linkedName = linkedArea ? `영역: ${linkedArea.title}` : '';
                          } else if (note.linkedAreaOrResource.startsWith('resource-')) {
                            const linkedResource = resources.find((r) => r.id === note.linkedAreaOrResource?.replace('resource-', ''));
                            linkedName = linkedResource ? `자원: ${linkedResource.title}` : '';
                          }
                        }

                        return (
                          <div
                            key={note.id}
                            onClick={() => handleNoteClick(note)}
                            className="flex items-start gap-3 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {note.isPinned && <Pin className="w-4 h-4 text-primary" />}
                                <p className="font-medium truncate">{note.title}</p>
                                <span className="badge badge-sm">{note.category}</span>
                              </div>
                              <p className="text-sm text-base-content/60 truncate mb-1">{note.content}</p>
                              {linkedName && (
                                <p className="text-xs text-base-content/50">{linkedName}</p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveNote(note.id);
                              }}
                              className="btn btn-ghost btn-sm btn-circle"
                              aria-label="노트 제거"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* ========== 할일 영역 ========== */}
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDndEnd} {...dndContextProps}>
              <div className="card bg-base-200 mb-4">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">연결된 할일</h2>
                    <button onClick={handleAddTodo} className="btn btn-ghost btn-sm">
                      <Plus className="w-4 h-4" />
                      추가
                    </button>
                  </div>

                  {todos.length === 0 ? (
                    <div className="text-center py-8 text-base-content/60">
                      연결된 할일이 없습니다.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todos.map((todo) => (
                        <TodoDraggableItem
                          key={todo.id}
                          todo={todo}
                          onToggle={handleToggleTodo}
                          onRemove={handleRemoveTodo}
                          onEdit={handleTodoClick}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ========== 달력 영역 ========== */}
              <div className="card bg-base-200 mb-4">
                <div className="card-body">
                  <h2 className="text-lg font-semibold mb-4">할일 계획</h2>
                  <div className="flex items-start gap-2 p-3 bg-base-100 rounded-lg mb-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-base-200 flex-shrink-0">
                      <GripVertical className="w-4 h-4 text-base-content/40" />
                    </div>
                    <p className="text-sm text-base-content/70">
                      <strong>드래그 방법:</strong> 위 할일의 왼쪽 핸들(<GripVertical className="w-3 h-3 inline" />)을 잡고 원하는 날짜로 드래그하세요.
                    </p>
                  </div>

                  <CalendarDropArea
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    todos={todos}
                  />
                </div>
              </div>

              {/* 드래그 프리뷰 오버레이 - Portal로 document.body에 렌더링 */}
              {typeof window !== 'undefined' && createPortal(
                <DragOverlay {...dragOverlayProps}>
                  {activeTodo && (
                    <div className="bg-base-100 border-2 border-primary rounded-lg p-3 shadow-2xl max-w-xs opacity-90">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{activeTodo.title}</p>
                        {activeTodo.isHighlight && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {activeTodo.scheduledDate && (
                        <p className="text-xs text-base-content/60 mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {format(activeTodo.scheduledDate, 'M/d')}
                        </p>
                      )}
                    </div>
                  )}
                </DragOverlay>,
                document.body
              )}
            </DndContext>

            {/* 버튼 */}
            <div className="flex items-center justify-between mt-6">
              <div>
                {!editingProject.isNew && (
                  <button
                    onClick={() => {
                      handleCancelEdit();
                      handleDeleteClick(editingProject as Project);
                    }}
                    className="btn btn-ghost text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                    삭제
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleCancelEdit} className="btn btn-ghost">
                  취소
                </button>
                <button onClick={handleSaveEdit} className="btn btn-primary">
                  저장
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && projectToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">프로젝트 삭제</h3>
            <p className="mb-6">
              <strong>{projectToDelete.title}</strong> 프로젝트를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingProject?.icon}
        selectedColor={editingProject?.color}
        onColorSelect={handleColorChange}
      />

      {/* 노트 편집 모달 */}
      {showNoteEditModal && editingNote && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">노트 편집</h3>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 회의 내용"
              />
            </div>

            {/* 분류 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">분류</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingNote({ ...editingNote, category: '중간 작업물' })}
                  className={`btn btn-sm flex-1 ${
                    editingNote.category === '중간 작업물' ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  중간 작업물
                </button>
                <button
                  onClick={() => setEditingNote({ ...editingNote, category: '나중에 보기' })}
                  className={`btn btn-sm flex-1 ${
                    editingNote.category === '나중에 보기' ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  나중에 보기
                </button>
                <button
                  onClick={() => setEditingNote({ ...editingNote, category: '레퍼런스' })}
                  className={`btn btn-sm flex-1 ${
                    editingNote.category === '레퍼런스' ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  레퍼런스
                </button>
              </div>
            </div>

            {/* 연결할 영역/자원 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">연결할 영역/자원 (선택)</span>
              </label>
              <select
                value={editingNote.linkedAreaOrResource || ''}
                onChange={(e) => setEditingNote({ ...editingNote, linkedAreaOrResource: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => (
                    <option key={area.id} value={`area-${area.id}`}>
                      {area.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => (
                    <option key={resource.id} value={`resource-${resource.id}`}>
                      {resource.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* 고정하기 */}
            <div className="form-control mb-4">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingNote.isPinned}
                  onChange={(e) => setEditingNote({ ...editingNote, isPinned: e.target.checked })}
                  className="checkbox"
                />
                <span className="label-text">고정하기</span>
              </label>
            </div>

            {/* 내용 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">내용</span>
              </label>
              <textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                className="textarea textarea-bordered h-24"
                placeholder="노트 내용을 입력하세요"
              />
            </div>

            <div className="modal-action">
              <button onClick={handleCancelNoteEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveNoteEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelNoteEdit} />
        </dialog>
      )}

      {/* 할일 편집 모달 */}
      {showTodoEditModal && editingTodo && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">할일 편집</h3>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingTodo.title}
                onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 요구사항 정리"
              />
            </div>

            {/* 명료화 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">명료화 (선택)</span>
              </label>
              <textarea
                value={editingTodo.clarification || ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, clarification: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="할일에 대한 자세한 설명을 입력하세요"
              />
            </div>

            {/* 다음행동상황 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">다음행동상황 (선택)</span>
              </label>
              <input
                type="text"
                value={editingTodo.nextActionStatus || ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, nextActionStatus: e.target.value })}
                className="input input-bordered"
                placeholder="예: 팀장님께 확인 필요"
              />
            </div>

            {/* 날짜 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">날짜 (선택)</span>
              </label>
              <input
                type="date"
                value={editingTodo.scheduledDate ? format(editingTodo.scheduledDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, scheduledDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="input input-bordered"
              />
            </div>

            {/* 오늘의 하이라이트 */}
            <div className="form-control mb-4">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTodo.isHighlight}
                  onChange={(e) => setEditingTodo({ ...editingTodo, isHighlight: e.target.checked })}
                  className="checkbox"
                />
                <span className="label-text flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  오늘의 하이라이트
                </span>
              </label>
            </div>

            {/* 완료 여부 */}
            <div className="form-control mb-6">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingTodo.completed}
                  onChange={(e) => setEditingTodo({ ...editingTodo, completed: e.target.checked })}
                  className="checkbox"
                />
                <span className="label-text">완료됨</span>
              </label>
            </div>

            <div className="modal-action">
              <button onClick={handleCancelTodoEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveTodoEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelTodoEdit} />
        </dialog>
      )}

    </div>
  );
}

// ========== 할일 프리뷰 카드 컴포넌트 ==========
function TodoPreviewCard({ todo }: { todo: TodoItem }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-base-100 rounded-lg shadow-2xl border-2 border-primary max-w-xs">
      <GripVertical className="w-4 h-4 text-base-content/40 flex-shrink-0 mt-1" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate text-sm">{todo.title}</p>
          {todo.isHighlight && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
        </div>
        {todo.scheduledDate && (
          <p className="text-xs text-base-content/60">
            <Calendar className="w-3 h-3 inline mr-1" />
            {format(todo.scheduledDate, 'M/d')}
          </p>
        )}
      </div>
    </div>
  );
}

// ========== 할일 드래그 가능 아이템 컴포넌트 ==========
function TodoDraggableItem({
  todo,
  onToggle,
  onRemove,
  onEdit,
}: {
  todo: TodoItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (todo: TodoItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: todo.id,
    data: { todoId: todo.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      onClick={() => onEdit(todo)}
      className={`flex items-start gap-2 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-6 h-6 mt-1 rounded cursor-grab active:cursor-grabbing hover:bg-base-300 transition-colors flex-shrink-0"
        aria-label="드래그하여 날짜 지정"
      >
        <GripVertical className="w-4 h-4 text-base-content/40" />
      </div>

      <input
        type="checkbox"
        checked={todo.completed}
        onChange={(e) => {
          e.stopPropagation();
          onToggle(todo.id);
        }}
        className="checkbox checkbox-sm mt-1 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`font-medium truncate ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
            {todo.title}
          </p>
          {todo.isHighlight && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
        </div>

        {(todo.clarification || todo.nextActionStatus || todo.scheduledDate) && (
          <div className="space-y-1 text-xs text-base-content/60">
            {todo.clarification && (
              <p className="line-clamp-2">{todo.clarification}</p>
            )}
            {todo.nextActionStatus && (
              <p>다음행동: {todo.nextActionStatus}</p>
            )}
            {todo.scheduledDate && (
              <p>
                <Calendar className="w-3 h-3 inline mr-1" />
                {format(todo.scheduledDate, 'yyyy-MM-dd')}
              </p>
            )}
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(todo.id);
        }}
        className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
        aria-label="할일 제거"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ========== 달력 드롭 영역 컴포넌트 ==========
function CalendarDropArea({
  selectedDate,
  onDateChange,
  todos,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
}) {
  // 달력 날짜 생성
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dateFormat = 'yyyy-MM-dd';
  const days = [];
  let day = startDate;

  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="w-full">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDateChange(addMonths(selectedDate, -1))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">{format(selectedDate, 'yyyy년 M월')}</h3>
        <button
          onClick={() => onDateChange(addMonths(selectedDate, 1))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((dayName) => (
          <div key={dayName} className="text-center text-sm font-medium py-2">
            {dayName}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateString = format(day, dateFormat);
          const todosForDay = todos.filter(
            (todo) =>
              todo.scheduledDate &&
              format(todo.scheduledDate, dateFormat) === dateString
          );

          return (
            <CalendarDayCell
              key={dateString}
              date={day}
              isCurrentMonth={isSameMonth(day, selectedDate)}
              isToday={isSameDay(day, new Date())}
              todosCount={todosForDay.length}
            />
          );
        })}
      </div>
    </div>
  );
}

// ========== 달력 날짜 셀 컴포넌트 ==========
function CalendarDayCell({
  date,
  isCurrentMonth,
  isToday,
  todosCount,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  todosCount: number;
}) {
  const dateString = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[70px] p-2 border-2 rounded-lg transition-all duration-200
        ${isOver ? 'bg-primary/30 border-primary shadow-lg scale-105' : 'border-base-300'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isToday ? 'bg-primary/10 border-primary' : 'bg-base-100'}
        hover:border-primary/50 hover:shadow-md cursor-pointer
      `}
    >
      <div className="text-sm font-medium mb-1">{format(date, 'd')}</div>
      {todosCount > 0 && (
        <div className="text-xs bg-primary text-primary-content rounded-full w-5 h-5 flex items-center justify-center font-semibold">
          {todosCount}
        </div>
      )}
    </div>
  );
}
