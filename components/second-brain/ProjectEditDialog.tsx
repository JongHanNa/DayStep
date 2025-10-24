'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Calendar, ChevronLeft, ChevronRight, Pin, Star, Tag, Palette, Target, Activity, Layers } from 'lucide-react';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import type { Project, Goal, Area, Resource } from '@/types/second-brain';
import { useDndKit } from '@/hooks/useDndKit';
import { DndContext, useDraggable, useDroppable, DragOverlay } from '@dnd-kit/core';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths } from 'date-fns';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useModalStore } from '@/state/stores/modalStore';
import TodoEditModal from './TodoEditModal';
import TodoListModal from './TodoListModal';

// 프론트엔드 전용 타입 (FormData 타입 + id 필드)
interface TodoItem extends TodoFormData {
  id: string;
}

interface NoteItem extends NoteFormData {
  id: string;
}

interface ProjectEditDialogProps {
  open: boolean;
  editingProject: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  goals: Goal[];
  areas: Area[];
  resources: Resource[];
  onSave: (projectData: Partial<Project>, area_id?: string, resource_id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete: (project: Project) => void;
  onProjectChange: (project: (Project & { isNew?: boolean; paraSelection?: string })) => void;
}

export default function ProjectEditDialog({
  open,
  editingProject,
  goals,
  areas,
  resources,
  onSave,
  onCancel,
  onDelete,
  onProjectChange,
}: ProjectEditDialogProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 아이콘 브라우저 모달
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 노트 상태
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [showNoteEditModal, setShowNoteEditModal] = useState(false);

  // 할일 상태
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [showTodoEditModal, setShowTodoEditModal] = useState(false);

  // 달력 상태
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'month' | 'completed'>('week');

  // 할일 목록 모달 상태
  const [selectedDateTodos, setSelectedDateTodos] = useState<TodoItem[]>([]);
  const [selectedDateForList, setSelectedDateForList] = useState<Date | null>(null);
  const [showTodoListModal, setShowTodoListModal] = useState(false);

  // 할일 편집 모달 상태 (TodoListModal에서 할일 클릭 시 사용)
  const [todoFromList, setTodoFromList] = useState<TodoItem | null>(null);
  const [showTodoEditFromList, setShowTodoEditFromList] = useState(false);

  // useDndKit Hook
  const { sensors, activeItem: activeTodo, handleDragStart, handleDragEnd: handleDndEnd, dndContextProps, dragOverlayProps } = useDndKit<TodoItem>({
    onDragEnd: (active, over) => {
      if (!over || !over.id) return;

      // 할일 ID 추출 (week-todo-, month-todo- 또는 직접 ID)
      const activeIdString = active.id as string;
      let todoId = activeIdString;
      if (activeIdString.startsWith('week-todo-')) {
        todoId = activeIdString.replace('week-todo-', '');
      } else if (activeIdString.startsWith('month-todo-')) {
        todoId = activeIdString.replace('month-todo-', '');
      }

      // 드롭 위치 ID 추출
      const overIdString = over.id as string;

      // 주간 뷰 컬럼 드롭: week-yyyy-MM-dd 형식
      if (overIdString.startsWith('week-')) {
        const dateString = overIdString.replace('week-', '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return;
        const scheduledDate = new Date(dateString);
        if (isNaN(scheduledDate.getTime())) return;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === dateString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? { ...todo, scheduledDate, displayOrder: maxOrder + 1 }
              : todo
          )
        );
        return;
      }

      // 주간 뷰 할일 위에 드롭: week-todo- 형식 (같은 날짜 내 순서 변경)
      if (overIdString.startsWith('week-todo-')) {
        const overTodoId = overIdString.replace('week-todo-', '');
        const overTodo = todos.find((t) => t.id === overTodoId);
        if (!overTodo || !overTodo.scheduledDate) return;

        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        const targetDateString = format(overTodo.scheduledDate, 'yyyy-MM-dd');
        const sameDateTodos = todos
          .filter((t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === targetDateString)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        // 같은 날짜 내에서 순서 재정렬
        const newTodos = [...todos];
        const targetIndex = sameDateTodos.findIndex((t) => t.id === overTodoId);

        newTodos.forEach((todo) => {
          if (todo.id === todoId) {
            // 드래그한 할일: 새 날짜 + 새 순서
            todo.scheduledDate = overTodo.scheduledDate;
            todo.displayOrder = targetIndex;
          } else if (todo.scheduledDate && format(todo.scheduledDate, 'yyyy-MM-dd') === targetDateString) {
            // 같은 날짜의 다른 할일들: 순서 조정
            const currentIndex = sameDateTodos.findIndex((t) => t.id === todo.id);
            if (currentIndex >= targetIndex) {
              todo.displayOrder = (todo.displayOrder || 0) + 1;
            }
          }
        });

        setTodos(newTodos);
        return;
      }

      // 월간 뷰 할일 위에 드롭: month-todo- 형식 (같은 날짜 내 순서 변경)
      if (overIdString.startsWith('month-todo-')) {
        const overTodoId = overIdString.replace('month-todo-', '');
        const overTodo = todos.find((t) => t.id === overTodoId);
        if (!overTodo || !overTodo.scheduledDate) return;

        const draggedTodo = todos.find((t) => t.id === todoId);
        if (!draggedTodo) return;

        const targetDateString = format(overTodo.scheduledDate, 'yyyy-MM-dd');
        const sameDateTodos = todos
          .filter((t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === targetDateString)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        // 같은 날짜 내에서 순서 재정렬
        const newTodos = [...todos];
        const targetIndex = sameDateTodos.findIndex((t) => t.id === overTodoId);

        newTodos.forEach((todo) => {
          if (todo.id === todoId) {
            // 드래그한 할일: 새 날짜 + 새 순서
            todo.scheduledDate = overTodo.scheduledDate;
            todo.displayOrder = targetIndex;
          } else if (todo.scheduledDate && format(todo.scheduledDate, 'yyyy-MM-dd') === targetDateString) {
            // 같은 날짜의 다른 할일들: 순서 조정
            const currentIndex = sameDateTodos.findIndex((t) => t.id === todo.id);
            if (currentIndex >= targetIndex) {
              todo.displayOrder = (todo.displayOrder || 0) + 1;
            }
          }
        });

        setTodos(newTodos);
        return;
      }

      // 월간 뷰 셀 드롭: yyyy-MM-dd 형식
      if (/^\d{4}-\d{2}-\d{2}$/.test(overIdString)) {
        const scheduledDate = new Date(overIdString);
        if (isNaN(scheduledDate.getTime())) return;

        // 해당 날짜의 할일들 가져오기
        const sameDateTodos = todos.filter(
          (t) => t.scheduledDate && format(t.scheduledDate, 'yyyy-MM-dd') === overIdString
        );

        // 마지막 displayOrder 계산
        const maxOrder = sameDateTodos.length > 0
          ? Math.max(...sameDateTodos.map((t) => t.displayOrder || 0))
          : 0;

        setTodos(
          todos.map((todo) =>
            todo.id === todoId
              ? { ...todo, scheduledDate, displayOrder: maxOrder + 1 }
              : todo
          )
        );
        return;
      }
    },
    getActiveItem: (id) => {
      const idString = id as string;
      let todoId = idString;
      if (idString.startsWith('week-todo-')) {
        todoId = idString.replace('week-todo-', '');
      } else if (idString.startsWith('month-todo-')) {
        todoId = idString.replace('month-todo-', '');
      }
      return todos.find((t) => t.id === todoId);
    },
  });

  // 아이콘 변경
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingProject) {
      onProjectChange({ ...editingProject, icon: iconKey });
    }
  };

  // 색상 변경
  const handleColorChange = (colorId: string) => {
    if (editingProject) {
      const color = getColorById(colorId).hex;
      onProjectChange({ ...editingProject, color });
    }
  };

  // 저장
  const handleSave = async () => {
    if (!editingProject || !editingProject.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

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

    await onSave(editingProject, area_id, resource_id);
  };

  // 노트 추가
  const handleAddNote = () => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: '새 노트',
      content: '',
      category: '중간 작업물',
      isPinned: false,
    };

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

  // 할일 추가
  const handleAddTodo = () => {
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      title: '새 할일',
      completed: false,
      isHighlight: false,
    };

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
  const handleSaveTodoEdit = (updatedTodo: TodoFormData) => {
    if (!editingTodo || !updatedTodo.title.trim()) {
      alert('할일 제목을 입력해주세요.');
      return;
    }

    setTodos(todos.map((todo) => (todo.id === editingTodo.id ? { ...editingTodo, ...updatedTodo } : todo)));
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 편집 취소
  const handleCancelTodoEdit = () => {
    setShowTodoEditModal(false);
    setEditingTodo(null);
  };

  // 할일 목록 모달 열기
  const handleOpenTodoListModal = (date: Date, todosForDate: TodoItem[]) => {
    setSelectedDateForList(date);
    setSelectedDateTodos(todosForDate);
    setShowTodoListModal(true);
  };

  // 할일 목록 모달 닫기
  const handleCloseTodoListModal = () => {
    setShowTodoListModal(false);
    setSelectedDateForList(null);
    setSelectedDateTodos([]);
  };

  // 할일 목록 모달에서 할일 클릭 시 (TodoEditModal 열기)
  const handleTodoClickFromList = (todo: TodoItem) => {
    handleCloseTodoListModal();
    setTodoFromList(todo);
    setShowTodoEditFromList(true);
  };

  // TodoEditModal 닫기
  const handleCloseTodoEditFromList = () => {
    setShowTodoEditFromList(false);
    setTodoFromList(null);
  };

  // TodoEditModal에서 저장
  const handleSaveTodoFromList = (updatedTodo: TodoFormData) => {
    if (!todoFromList) return;

    // 기존 할일 업데이트
    const updatedTodos = todos.map((t) =>
      t.id === todoFromList.id
        ? { ...t, ...updatedTodo }
        : t
    );
    setTodos(updatedTodos);

    handleCloseTodoEditFromList();
  };

  if (!open || !editingProject) return null;

  return (
    <>
      <dialog open className="modal modal-open">
        <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
          {/* 헤더 (취소-제목-삭제-저장) */}
          <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
            <button onClick={onCancel} className="btn btn-primary btn-sm rounded-full">
              취소
            </button>
            <h3 className="font-bold text-lg">
              {editingProject.isNew ? '새 프로젝트 추가' : '프로젝트 편집'}
            </h3>
            <div className="flex items-center gap-2">
              {!editingProject.isNew && (
                <button
                  onClick={() => {
                    onCancel();
                    onDelete(editingProject as Project);
                  }}
                  className="btn btn-ghost btn-sm text-error rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={handleSave} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            {/* 아이콘 및 제목 - TodoMetadata 스타일 적용 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Tag className="h-5 w-5" style={{ color: editingProject.color }} />
                프로젝트 아이콘 및 제목
              </label>

              {/* 아이콘 + 제목 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <div className="flex items-center gap-3">
                  {/* 아이콘 버튼 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIconBrowserOpen(true)}
                      className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                      style={{ backgroundColor: '#f3f4f6' }}
                      title="아이콘 변경하기"
                    >
                      {(() => {
                        const IconComponent = getUnifiedIcon(editingProject.icon as UnifiedIconKey).component;
                        return <IconComponent
                          className="group-hover:scale-110 transition-transform"
                          style={{ color: editingProject.color }}
                          size={24}
                        />;
                      })()}
                    </button>

                    {/* 색상 인디케이터 */}
                    <div
                      className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                      style={{
                        backgroundColor: editingProject.color,
                        border: '2px solid white'
                      }}
                    >
                      <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* 제목 입력 */}
                  <input
                    type="text"
                    value={editingProject.title}
                    onChange={(e) => onProjectChange({ ...editingProject, title: e.target.value })}
                    placeholder="프로젝트 제목을 입력하세요"
                    className="flex-1 bg-base-100 border-0 border-b-2 rounded-none focus:outline-none transition-none"
                    style={{
                      fontSize: '20px',
                      color: '#333333',
                      borderBottomColor: '#D1D5DB',
                      outline: 'none',
                      boxShadow: 'none',
                      fontWeight: '600',
                      height: '44px',
                    }}
                    required
                  />
                </div>
              </div>
            </div>

          {/* 목표 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Target className="h-5 w-5" style={{ color: editingProject.color }} />
              목표
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.goal_id || ''}
                onChange={(e) => onProjectChange({ ...editingProject, goal_id: e.target.value })}
                className="select select-bordered w-full"
              >
                <option value="">선택 안 함</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 진행상황 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Activity className="h-5 w-5" style={{ color: editingProject.color }} />
              진행상황
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.status}
                onChange={(e) =>
                  onProjectChange({
                    ...editingProject,
                    status: e.target.value as 'not_started' | 'active' | 'on_hold' | 'completed',
                  })
                }
                className="select select-bordered w-full"
              >
                <option value="not_started">시작 안함</option>
                <option value="active">진행중</option>
                <option value="on_hold">중단</option>
                <option value="completed">완료</option>
              </select>
            </div>
          </div>

          {/* 영역/자원 */}
          <div className="my-4">
            {/* 섹션 제목 */}
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Layers className="h-5 w-5" style={{ color: editingProject.color }} />
              영역/자원 (선택)
            </label>

            {/* 셀렉트 박스 */}
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <select
                value={editingProject.paraSelection}
                onChange={(e) => onProjectChange({ ...editingProject, paraSelection: e.target.value })}
                className="select select-bordered w-full"
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
          </div>

          {/* 시작일/종료일 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 시작일 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Calendar className="h-5 w-5" style={{ color: editingProject.color }} />
                시작일 (선택)
              </label>

              {/* 날짜 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <input
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, start_date: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            {/* 종료일 */}
            <div className="my-4">
              {/* 섹션 제목 */}
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Calendar className="h-5 w-5" style={{ color: editingProject.color }} />
                종료일 (선택)
              </label>

              {/* 날짜 입력 */}
              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <input
                  type="date"
                  value={editingProject.target_end_date || ''}
                  onChange={(e) => onProjectChange({ ...editingProject, target_end_date: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>

          {/* ========== 노트 영역 ========== */}
          <div className="card bg-base-200 mb-4">
            <div className="card-body p-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">노트</h2>
                <button onClick={handleAddNote} className="btn btn-ghost btn-sm rounded-full">
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  노트가 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes
                    .sort((a, b) => {
                      if (a.isPinned && !b.isPinned) return -1;
                      if (!a.isPinned && b.isPinned) return 1;
                      return 0;
                    })
                    .map((note) => {
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
              <div className="card-body p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">할일</h2>
                  <button onClick={handleAddTodo} className="btn btn-ghost btn-sm rounded-full">
                    <Plus className="w-4 h-4" />
                    추가
                  </button>
                </div>

                {todos.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    할일이 없습니다.
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
              <div className="card-body p-3">
                <h2 className="text-lg font-semibold mb-4">할일 계획</h2>

                {/* 탭 바 */}
                <div className="tabs tabs-boxed mb-4">
                  <button
                    className={`tab ${calendarView === 'week' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('week')}
                  >
                    주간
                  </button>
                  <button
                    className={`tab ${calendarView === 'month' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('month')}
                  >
                    월간
                  </button>
                  <button
                    className={`tab ${calendarView === 'completed' ? 'tab-active' : ''}`}
                    onClick={() => setCalendarView('completed')}
                  >
                    완료된 일
                  </button>
                </div>

                <div className="flex items-start gap-2 p-3 bg-base-100 rounded-lg mb-4">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-base-200 flex-shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-base-content/70">
                    <strong>드래그 방법:</strong> 할일 카드를 꾹 누른 채 원하는 날짜로 드래그하세요.
                  </p>
                </div>

                {calendarView === 'week' && (
                  <WeekView
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                    project={editingProject}
                    onOpenTodoListModal={handleOpenTodoListModal}
                  />
                )}

                {calendarView === 'month' && (
                  <CalendarDropArea
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                    project={editingProject}
                    onOpenTodoListModal={handleOpenTodoListModal}
                  />
                )}

                {calendarView === 'completed' && (
                  <CompletedView
                    todos={todos}
                    onToggleTodo={handleToggleTodo}
                  />
                )}
              </div>
            </div>

            {/* 드래그 프리뷰 오버레이 */}
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
          </div>
        </div>
        <div className="modal-backdrop" onClick={onCancel} />
      </dialog>

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
          <div className={`modal-box w-full max-w-4xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            {/* 헤더 (취소-제목-저장) */}
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelNoteEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="font-bold text-lg">노트 편집</h3>
              <button onClick={handleSaveNoteEdit} className="btn btn-primary btn-sm rounded-full">
                저장
              </button>
            </div>

            {/* 콘텐츠 영역 */}
            <div className="flex-1 overflow-y-auto">
              <NoteFormFields
                note={editingNote}
                onChange={(updatedNote) => setEditingNote({ ...editingNote, ...updatedNote })}
                areas={areas}
                resources={resources}
              />
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelNoteEdit} />
        </dialog>
      )}

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={showTodoEditModal}
        todo={editingTodo}
        onClose={handleCancelTodoEdit}
        onSave={handleSaveTodoEdit}
        onChange={(updatedTodo) => {
          if (editingTodo) {
            setEditingTodo({ ...editingTodo, ...updatedTodo });
          }
        }}
      />

      {/* 할일 목록 모달 */}
      <TodoListModal
        open={showTodoListModal}
        date={selectedDateForList}
        todos={selectedDateTodos}
        project={editingProject}
        onClose={handleCloseTodoListModal}
        onTodoClick={handleTodoClickFromList}
        onToggleComplete={handleToggleTodo}
      />

      {/* TodoListModal에서 클릭한 할일 편집 모달 */}
      <TodoEditModal
        open={showTodoEditFromList}
        todo={todoFromList}
        onClose={handleCloseTodoEditFromList}
        onSave={handleSaveTodoFromList}
        onChange={(updated) => setTodoFromList(todoFromList ? { ...todoFromList, ...updated } : null)}
      />
    </>
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
      {...listeners}
      onClick={() => onEdit(todo)}
      className={`flex items-start gap-2 p-3 bg-base-100 rounded-lg hover:bg-base-300 transition-colors cursor-pointer ${
        isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-pointer'
      }`}
    >
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

        {(todo.clarification || (todo.nextActionStatuses && todo.nextActionStatuses.length > 0) || todo.scheduledDate) && (
          <div className="space-y-1 text-xs text-base-content/60">
            {todo.clarification && (
              <p className="line-clamp-2">{todo.clarification}</p>
            )}
            {todo.nextActionStatuses && todo.nextActionStatuses.length > 0 && (
              <p>다음행동: {todo.nextActionStatuses.join(', ')}</p>
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
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
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
          const todosForDay = todos
            .filter(
              (todo) =>
                todo.scheduledDate &&
                format(todo.scheduledDate, dateFormat) === dateString
            )
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

          return (
            <CalendarDayCell
              key={dateString}
              date={day}
              isCurrentMonth={isSameMonth(day, selectedDate)}
              isToday={isSameDay(day, new Date())}
              todos={todosForDay}
              onToggleTodo={onToggleTodo}
              project={project}
              onOpenTodoListModal={onOpenTodoListModal}
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
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  const dateString = format(date, 'yyyy-MM-dd');

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
    data: { date },
  });

  const isMobile = process.env.BUILD_TARGET === 'mobile';

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (isMobile && todos.length > 0) {
          onOpenTodoListModal(date, todos);
        }
      }}
      className={`
        min-h-[100px] p-2 border-2 rounded-lg transition-all duration-200
        ${isOver ? 'bg-primary/30 border-primary shadow-lg scale-105' : 'border-base-300'}
        ${!isCurrentMonth ? 'opacity-40' : ''}
        ${isToday ? 'bg-primary/10 border-primary' : 'bg-base-100'}
        hover:border-primary/50 hover:shadow-md
        ${isMobile && todos.length > 0 ? 'cursor-pointer' : ''}
      `}
    >
      {/* 날짜 헤더 */}
      <div className="text-sm font-medium mb-2">{format(date, 'd')}</div>

      {/* 할일 표시 영역 */}
      {isMobile ? (
        // Capacitor 환경: 점 + 개수 표시
        todos.length > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project?.color || '#808080' }}
            />
            <span className="text-sm font-medium">{todos.length}</span>
          </div>
        )
      ) : (
        // 웹 환경: 기존 방식 유지
        <div className="space-y-1">
          {todos.map((todo) => (
            <MonthTodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              project={project}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ========== 월간 뷰 할일 카드 컴포넌트 ==========
function MonthTodoCard({
  todo,
  onToggle,
  project,
}: {
  todo: TodoItem;
  onToggle: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `month-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'month-todo' },
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: `month-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'month-todo' },
  });

  // 두 개의 ref를 결합
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropNodeRef(node);
  };

  return (
    <div
      ref={setRefs}
      {...attributes}
      {...listeners}
      className={`
        p-1.5 rounded bg-base-200 hover:bg-base-300 transition-colors
        cursor-pointer text-xs
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'ring-2 ring-primary' : ''}
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-1.5 mb-1">
        <p className={`flex-1 font-medium line-clamp-1 ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.title}
        </p>
        {todo.isHighlight && <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
      </div>

      {/* 프로젝트 배지 */}
      {project && (
        <div className="flex items-center gap-0.5 mb-1">
          <div className="text-[10px] bg-base-300 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            {project.icon && (() => {
              const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
              return <IconComponent className="w-2 h-2" />;
            })()}
            <span className="font-medium truncate max-w-[60px]">{project.title}</span>
          </div>
        </div>
      )}

      {/* 명료화 (1줄 말줄임) */}
      {todo.clarification && (
        <p className="text-[10px] text-base-content/60 line-clamp-1 mb-1">
          {todo.clarification}
        </p>
      )}

      {/* 완료 체크박스 (제일 하단, 왼쪽 정렬) */}
      <div className="flex items-center justify-start gap-1.5 mt-1">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}
          className="checkbox checkbox-xs flex-shrink-0"
        />
        <span className="text-[10px] text-base-content/60">완료</span>
      </div>
    </div>
  );
}

// ========== 주간 뷰 컴포넌트 ==========
function WeekView({
  selectedDate,
  onDateChange,
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  // 현재 주의 일요일~토요일 계산
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 일요일 시작
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full">
      {/* 주간 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onDateChange(addDays(selectedDate, -7))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">
          {format(weekStart, 'M월 d일')} - {format(addDays(weekStart, 6), 'M월 d일')}
        </h3>
        <button
          onClick={() => onDateChange(addDays(selectedDate, 7))}
          className="btn btn-ghost btn-sm"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 7일 컬럼 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateString = format(day, 'yyyy-MM-dd');
          const dayTodos = todos
            .filter(
              (todo) =>
                todo.scheduledDate &&
                format(todo.scheduledDate, 'yyyy-MM-dd') === dateString
            )
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)); // displayOrder 기준 정렬
          const isToday = isSameDay(day, new Date());

          return (
            <WeekDayColumn
              key={dateString}
              date={day}
              isToday={isToday}
              todos={dayTodos}
              onToggleTodo={onToggleTodo}
              project={project}
              onOpenTodoListModal={onOpenTodoListModal}
            />
          );
        })}
      </div>
    </div>
  );
}

// ========== 주간 뷰 날짜 컬럼 컴포넌트 ==========
function WeekDayColumn({
  date,
  isToday,
  todos,
  onToggleTodo,
  project,
  onOpenTodoListModal,
}: {
  date: Date;
  isToday: boolean;
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal: (date: Date, todos: TodoItem[]) => void;
}) {
  const dateString = format(date, 'yyyy-MM-dd');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  const { setNodeRef, isOver } = useDroppable({
    id: `week-${dateString}`,
    data: { date, type: 'week-column' },
  });

  const isMobile = process.env.BUILD_TARGET === 'mobile';

  return (
    <div
      ref={setNodeRef}
      onClick={() => {
        if (isMobile && todos.length > 0) {
          onOpenTodoListModal(date, todos);
        }
      }}
      className={`
        flex flex-col
        min-h-[400px] p-2 rounded-lg border-2 transition-all
        ${
          isOver
            ? 'bg-primary/20 border-primary'
            : isToday
            ? 'bg-primary/5 border-primary/50'
            : 'bg-base-100 border-base-300'
        }
        ${isMobile && todos.length > 0 ? 'cursor-pointer' : ''}
      `}
    >
      {/* 날짜 헤더 */}
      <div className="flex-shrink-0 mb-2 pb-2 border-b border-base-300">
        <div className="text-sm font-bold text-center">{dayOfWeek}</div>
        <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
      </div>

      {/* 할일 표시 영역 */}
      {isMobile ? (
        // Capacitor 환경: 점 + 개수 표시
        <div className="flex-1 overflow-y-auto">
          {todos.length > 0 ? (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project?.color || '#808080' }}
              />
              <span className="text-sm font-medium">{todos.length}</span>
            </div>
          ) : (
            <div className="text-xs text-base-content/40 text-center py-4">
              할일 없음
            </div>
          )}
        </div>
      ) : (
        // 웹 환경: 기존 방식 유지
        <div className="flex-1 space-y-2 overflow-y-auto">
          {todos.map((todo) => (
            <WeekTodoCard
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              project={project}
            />
          ))}
          {todos.length === 0 && (
            <div className="text-xs text-base-content/40 text-center py-4">
              할일 없음
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ========== 주간 뷰 할일 카드 컴포넌트 ==========
function WeekTodoCard({
  todo,
  onToggle,
  project,
}: {
  todo: TodoItem;
  onToggle: (todoId: string) => void;
  project: (Project & { isNew?: boolean; paraSelection?: string }) | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `week-todo-${todo.id}`,
    data: { todoId: todo.id, type: 'week-todo' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        p-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors
        cursor-pointer
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-2 mb-1">
        <p className={`text-xs font-medium flex-1 ${todo.completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.title}
        </p>
        {todo.isHighlight && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
      </div>

      {/* 명료화 */}
      {todo.clarification && (
        <p className="text-xs text-base-content/60 mb-1 line-clamp-2">
          {todo.clarification}
        </p>
      )}

      {/* 프로젝트 배지 */}
      {project && (
        <div className="flex items-center gap-1 mb-1">
          <div className="text-xs bg-base-300 px-2 py-0.5 rounded-full flex items-center gap-1">
            {project.icon && (() => {
              const IconComponent = getUnifiedIcon(project.icon as UnifiedIconKey).component;
              return <IconComponent className="w-3 h-3" />;
            })()}
            <span className="font-medium truncate max-w-[80px]">{project.title}</span>
          </div>
        </div>
      )}

      {/* 완료 체크박스 (제일 하단, 왼쪽 정렬) */}
      <div className="flex items-center justify-start gap-2 mt-1">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(todo.id);
          }}
          className="checkbox checkbox-xs flex-shrink-0"
        />
        <span className="text-xs text-base-content/60">완료</span>
      </div>
    </div>
  );
}

// ========== 완료 타임라인 뷰 컴포넌트 ==========
function CompletedView({
  todos,
  onToggleTodo,
}: {
  todos: TodoItem[];
  onToggleTodo: (todoId: string) => void;
}) {
  // 완료된 할일만 필터링 (시간순 정렬은 나중에 추가)
  const completedTodos = todos.filter((todo) => todo.completed);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">
        완료된 할일 ({completedTodos.length}개)
      </h3>

      {completedTodos.length === 0 ? (
        <div className="text-center py-8 text-base-content/60">
          완료된 할일이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {completedTodos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start gap-2 p-3 bg-base-100 rounded-lg"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggleTodo(todo.id)}
                className="checkbox checkbox-sm mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium line-through text-base-content/50">
                  {todo.title}
                </p>
                {todo.clarification && (
                  <p className="text-sm text-base-content/60 mt-1">
                    {todo.clarification}
                  </p>
                )}
                {todo.scheduledDate && (
                  <p className="text-xs text-base-content/40 mt-1">
                    {format(todo.scheduledDate, 'yyyy-MM-dd')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
