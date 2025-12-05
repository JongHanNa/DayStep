/**
 * GraphView - 그래프 뷰 메인 컨테이너
 * 옵시디언 스타일의 물리 시뮬레이션 기반 그래프 시각화
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Network, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useGraphData } from './hooks/useGraphData';
import { useFilteredGraphData } from './hooks/useFilteredGraphData';
import { GraphCanvas } from './GraphCanvas';
import { GraphControls } from './GraphControls';
import { GraphFAB } from './GraphFAB';
import { GraphLegend } from './GraphLegend';
import { GraphCreateModal } from './GraphCreateModal';
import { GraphNodeActionMenu } from './GraphNodeActionMenu';
import { GraphEmptyState } from './GraphEmptyState';
import { useGraphStore, useGraphEditModal, useGraphPopover, useGraphActionMenu } from '@/state/stores/graphStore';

// 팝오버 컴포넌트들
import {
  TitleEditPopover,
  AreaResourceSelectPopover,
  ProjectLinkPopover,
  TodoLinkPopover,
  NoteLinkPopover,
} from './popover';
import ContentEditorModal from '@/components/second-brain/ContentEditorModal';

// 편집 모달들
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import AreaResourceEditModal from '@/components/ui/AreaResourceEditModal';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { mapNoteToNoteForm } from '@/lib/helpers/noteDataMapper';

// Store들
import { useTodoStore } from '@/state/stores/todoStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';

// 유틸리티
import { updateNoteNotes } from '@/lib/supabase/note-notes';
import { updateNoteProjects } from '@/lib/supabase/project-notes';

// 구독/용량 관련
import { UsageBanner } from '@/components/subscription/UsageBanner';
import { useUsageStats } from '@/hooks/useUsageStats';
import { updateNoteTodos } from '@/lib/supabase/todo-notes';

// 타입
import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { Project, Goal, AreaResource, Note } from '@/types/second-brain';
import type { SecondBrainItemType } from '@/types/settings';
import type { Clarification } from '@/types';
import type { GraphNode } from '@/types/graph';

export default function GraphView() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { graphData, loading, error, refetch } = useGraphData();
  const { filteredData, nodeCount, linkCount, isFiltered } = useFilteredGraphData(graphData);
  const { isOpen: isEditModalOpen, node: editingNode } = useGraphEditModal();
  const { closeEditModal, closeActionMenu, openEditModal } = useGraphStore();
  const { activePopover, position: popoverPosition, closePopover } = useGraphPopover();
  const { node: actionMenuNode } = useGraphActionMenu();

  // Store 데이터 및 액션 가져오기
  const entityTodos = useTodoStore((state) => state.todos);
  const createTodo = useTodoStore((state) => state.createTodo);
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);

  // Entity Todo를 database Todo 형식으로 변환 (NoteEditModal용)
  const todos = entityTodos.map(todo => todo.toDatabase() as any);

  const { projects, createProject, updateProject, deleteProject } = useProjectStore();
  const { goals, updateGoal, deleteGoal } = useGoalStore();
  const { areas, updateArea, deleteArea } = useAreaStore();
  const { resources, updateResource, deleteResource } = useResourceStore();
  const { notes, createNote, updateNote, deleteNote } = useNoteStore();

  // 용량 체크
  const { canCreate, incrementCount } = useUsageStats();

  // Todo 편집 상태
  const [editingTodoData, setEditingTodoData] = useState<TodoFormData | null>(null);

  // 내용 편집 모달 상태
  const [contentEditorContent, setContentEditorContent] = useState('');

  // Project 편집 상태
  const [editingProjectData, setEditingProjectData] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);

  // Goal 편집 상태
  const [editingGoalData, setEditingGoalData] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Area/Resource 편집 상태
  const [editingAreaResourceData, setEditingAreaResourceData] = useState<(AreaResource & { isNew?: boolean }) | null>(null);
  const [areaResourceItemType, setAreaResourceItemType] = useState<SecondBrainItemType>('area');

  // Note 편집 상태 (NoteEditModal용)
  const [editingNoteForModal, setEditingNoteForModal] = useState<Note | null>(null);
  const [noteFormData, setNoteFormData] = useState<NoteFormData | null>(null);

  // 모달 닫기 핸들러
  const handleCloseEditModal = useCallback(() => {
    closeEditModal();
    setEditingTodoData(null);
    setEditingProjectData(null);
    setEditingGoalData(null);
    setEditingAreaResourceData(null);
  }, [closeEditModal]);

  // 팝오버 닫기 핸들러
  const handleClosePopover = useCallback(() => {
    closePopover();
  }, [closePopover]);

  // content 팝오버가 열릴 때 현재 노트의 content 설정
  useEffect(() => {
    if (activePopover === 'content' && actionMenuNode?.originalData) {
      setContentEditorContent(actionMenuNode.originalData.content || '');
    }
  }, [activePopover, actionMenuNode]);

  // 노트 삭제 핸들러 (액션 메뉴용)
  const handleNoteDelete = useCallback(async (node: GraphNode) => {
    if (userId) {
      await deleteNote(node.id, userId);
      refetch();
    }
  }, [deleteNote, userId, refetch]);

  // 노트 편집 모달 열기 핸들러 (액션 메뉴용)
  const handleNoteEdit = useCallback((node: GraphNode) => {
    const note = node.originalData as Note;
    setEditingNoteForModal(note);
    setNoteFormData(mapNoteToNoteForm(note, areas));
  }, [areas]);

  // 통합 편집 핸들러 (모든 노드 타입)
  const handleNodeEdit = useCallback((node: GraphNode) => {
    closeActionMenu();
    if (node.type === 'note') {
      // 노트는 NoteEditModal 사용
      handleNoteEdit(node);
    } else {
      // 다른 타입은 기존 편집 모달 사용
      openEditModal(node);
    }
  }, [closeActionMenu, openEditModal, handleNoteEdit]);

  // 프로젝트 추가 핸들러 (GoalEditDialog 내에서 호출)
  const handleAddProjectInGoal = useCallback(async () => {
    if (!editingNode || editingNode.type !== 'goal' || !userId) return;

    setIsCreatingProject(true);
    try {
      await createProject(userId, {
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        goal_id: editingNode.id,
        order_index: projects.length,
      });
      refetch();
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreatingProject(false);
    }
  }, [editingNode, userId, createProject, projects.length, refetch]);

  // 프로젝트 편집 핸들러 (GoalEditDialog 내에서 호출)
  const handleEditProjectInGoal = useCallback((project: Project) => {
    let paraSelection = '';
    if (project.goal_id) {
      paraSelection = `goal-${project.goal_id}`;
    }
    setEditingProjectData({ ...project, paraSelection, isNew: false });
    // GoalEditDialog를 닫고 ProjectEditDialog 열기
    closeEditModal();
    // 약간의 지연 후 프로젝트 편집 모달 열기
    setTimeout(() => {
      const projectNode: GraphNode = {
        id: project.id,
        type: 'project',
        title: project.title,
        color: project.color,
        icon: project.icon || null,
        originalData: project,
      };
      openEditModal(projectNode);
    }, 100);
  }, [closeEditModal, openEditModal]);

  // 프로젝트 삭제 핸들러 (GoalEditDialog 내에서 호출)
  const handleDeleteProjectInGoal = useCallback(async (project: Project) => {
    if (!userId) return;

    if (confirm('정말로 이 프로젝트를 삭제하시겠습니까?')) {
      try {
        await deleteProject(userId, project.id);
        refetch();
      } catch (error) {
        console.error('프로젝트 삭제 실패:', error);
        alert('프로젝트 삭제에 실패했습니다.');
      }
    }
  }, [userId, deleteProject, refetch]);

  // 통합 삭제 핸들러 (모든 노드 타입)
  const handleNodeDelete = useCallback(async (node: GraphNode) => {
    if (!userId) return;

    switch (node.type) {
      case 'note':
        await deleteNote(node.id, userId);
        break;
      case 'todo':
        await deleteTodo(node.id);
        break;
      case 'project':
        await deleteProject(userId, node.id);
        break;
      case 'goal':
        await deleteGoal(userId, node.id);
        break;
      case 'area':
        await deleteArea(userId, node.id);
        break;
      case 'resource':
        await deleteResource(userId, node.id);
        break;
    }
    refetch();
  }, [userId, deleteNote, deleteTodo, deleteProject, deleteGoal, deleteArea, deleteResource, refetch]);

  // 노트 편집 모달 닫기 핸들러
  const handleCloseNoteEditModal = useCallback(() => {
    setEditingNoteForModal(null);
    setNoteFormData(null);
  }, []);

  // 노트 편집 모달 저장 핸들러
  const handleNoteEditModalSave = useCallback(async () => {
    if (!editingNoteForModal || !noteFormData || !userId) return;

    try {
      // linkedAreaOrResource를 area_resource_id로 변환
      let area_resource_id: string | undefined;
      if (noteFormData.linkedAreaOrResource) {
        area_resource_id = noteFormData.linkedAreaOrResource.replace(/^(area|resource)-/, '');
      }

      // 노트 기본 정보 저장
      await updateNote(editingNoteForModal.id, userId, {
        title: noteFormData.title,
        content: noteFormData.content,
        note_category: noteFormData.note_category,
        is_pinned: noteFormData.isPinned,
        area_resource_id,
      });

      // 할일 연결 저장
      if (noteFormData.todoIds !== undefined) {
        await updateNoteTodos(editingNoteForModal.id, noteFormData.todoIds, userId);
      }

      // 프로젝트 연결 저장
      if (noteFormData.projectIds !== undefined) {
        await updateNoteProjects(editingNoteForModal.id, noteFormData.projectIds, userId);
      }

      // 노트-노트 연결 저장
      if (noteFormData.noteIds !== undefined) {
        await updateNoteNotes(editingNoteForModal.id, noteFormData.noteIds, userId);
      }

      handleCloseNoteEditModal();
      refetch();
    } catch (error) {
      console.error('노트 저장 오류:', error);
    }
  }, [editingNoteForModal, noteFormData, userId, updateNote, refetch, handleCloseNoteEditModal]);

  // === 팝오버 저장 핸들러들 ===

  // 제목 저장
  const handleTitleSave = useCallback(async (title: string) => {
    if (!actionMenuNode || !userId) return;
    await updateNote(actionMenuNode.id, userId, { title });
    refetch();
  }, [actionMenuNode, userId, updateNote, refetch]);

  // 영역/자원 저장
  const handleAreaResourceSave = useCallback(async (linkedId: string | undefined) => {
    if (!actionMenuNode || !userId) return;
    // linkedId: 'area-xxx' | 'resource-xxx' | undefined → area_resource_id 추출
    let areaResourceId: string | undefined;
    if (linkedId) {
      const [, id] = linkedId.split('-');
      areaResourceId = id;
    }
    await updateNote(actionMenuNode.id, userId, { area_resource_id: areaResourceId });
    refetch();
  }, [actionMenuNode, userId, updateNote, refetch]);

  // 프로젝트 연결 토글
  const handleProjectToggle = useCallback(async (projectId: string, isSelected: boolean) => {
    if (!actionMenuNode || !userId) return;
    const noteData = actionMenuNode.originalData as Note;
    const currentIds = noteData.projects?.map(p => p.id) || [];
    const newIds = isSelected
      ? [...currentIds, projectId]
      : currentIds.filter(id => id !== projectId);
    await updateNoteProjects(actionMenuNode.id, newIds, userId);
    refetch();
  }, [actionMenuNode, userId, refetch]);

  // 할일 연결 토글
  const handleTodoToggle = useCallback(async (todoId: string, isSelected: boolean) => {
    if (!actionMenuNode || !userId) return;
    const noteData = actionMenuNode.originalData as Note;
    const currentIds = noteData.todos?.map(t => t.id) || [];
    const newIds = isSelected
      ? [...currentIds, todoId]
      : currentIds.filter(id => id !== todoId);
    await updateNoteTodos(actionMenuNode.id, newIds, userId);
    refetch();
  }, [actionMenuNode, userId, refetch]);

  // 노트 연결 토글
  const handleNoteToggle = useCallback(async (noteId: string, isSelected: boolean) => {
    if (!actionMenuNode || !userId) return;
    const noteData = actionMenuNode.originalData as Note;
    const currentIds = noteData.connectedNotes?.map(n => n.id) || [];
    const newIds = isSelected
      ? [...currentIds, noteId]
      : currentIds.filter(id => id !== noteId);
    await updateNoteNotes(actionMenuNode.id, newIds, userId);
    refetch();
  }, [actionMenuNode, userId, refetch]);

  // 내용 저장
  const handleContentSave = useCallback(async (content: string) => {
    if (!actionMenuNode || !userId) return;
    await updateNote(actionMenuNode.id, userId, { content });
    refetch();
  }, [actionMenuNode, userId, updateNote, refetch]);

  // 프로젝트 생성 핸들러 (노트 편집 모달용)
  const handleCreateProject = useCallback(async (title: string): Promise<Project> => {
    if (!userId) {
      throw new Error('사용자 정보가 없습니다.');
    }
    // 용량 체크
    const result = canCreate('project');
    if (result.blocked) {
      throw new Error(`프로젝트 한도에 도달했습니다. (${result.current}/${result.limit})`);
    }
    const newProject = await createProject(userId, {
      title,
      description: '',
      status: 'not_started',
      color: '#808080',
      order_index: 0,
    });
    incrementCount('project');
    return newProject;
  }, [userId, createProject, canCreate, incrementCount]);

  // 노트 생성 핸들러 (노트 편집 모달용)
  const handleCreateNote = useCallback(async (title: string): Promise<Note> => {
    if (!userId) {
      throw new Error('사용자 정보가 없습니다.');
    }
    // 용량 체크
    const result = canCreate('note');
    if (result.blocked) {
      throw new Error(`노트 한도에 도달했습니다. (${result.current}/${result.limit})`);
    }
    const newNote = await createNote(userId, {
      title,
      content: '',
      note_category: 'work_in_progress',
      is_pinned: false,
    });
    incrementCount('note');
    return newNote;
  }, [userId, createNote, canCreate, incrementCount]);

  // 노트-노트 즉시 저장 핸들러 (노트 편집 모달용)
  const handleNoteNoteImmediateSave = useCallback(async (noteIds: string[]) => {
    if (!editingNoteForModal?.id || !userId) return;

    try {
      await updateNoteNotes(editingNoteForModal.id, noteIds, userId);
      // UI 동기화를 위해 재조회
      refetch();
    } catch (error) {
      console.error('노트-노트 연결 저장 실패:', error);
      throw error;
    }
  }, [editingNoteForModal?.id, userId, refetch]);

  // 할일 생성 핸들러 (노트 편집 모달용)
  const handleCreateTodo = useCallback(async (title: string) => {
    if (!userId) {
      throw new Error('사용자 정보가 없습니다.');
    }
    // 용량 체크 (기본: todo, 반복 패턴 있으면 habit)
    const result = canCreate('todo');
    if (result.blocked) {
      throw new Error(`할일 한도에 도달했습니다. (${result.current}/${result.limit})`);
    }
    const newEntityTodo = await createTodo({
      title,
      user_id: userId,
      completed: false,
      schedule_type: 'anytime',
    });
    if (!newEntityTodo) {
      throw new Error('할일 생성에 실패했습니다.');
    }
    incrementCount('todo');
    // Database Todo 형식으로 반환 (NoteEditModal 타입 호환)
    return newEntityTodo.toDatabase() as any;
  }, [userId, createTodo, canCreate, incrementCount]);

  // 인증 대기
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // 로그인 필요
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center space-y-4">
          <Network className="w-16 h-16 mx-auto text-base-content/30" />
          <div>
            <h2 className="text-xl font-semibold">로그인이 필요합니다</h2>
            <p className="text-base-content/60 mt-1">
              그래프 뷰를 사용하려면 로그인하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-error/10 rounded-full flex items-center justify-center">
            <Network className="w-8 h-8 text-error" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-error">오류 발생</h2>
            <p className="text-base-content/60 mt-1">{error}</p>
          </div>
          <button onClick={refetch} className="btn btn-primary btn-sm rounded-full gap-2">
            <RefreshCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (loading && graphData.nodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-base-content/60">그래프 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 빈 데이터 상태
  if (graphData.nodes.length === 0) {
    return <GraphEmptyState onComplete={refetch} />;
  }

  return (
    <div className="h-[calc(100vh-var(--header-total-height))] bg-base-200 relative overflow-hidden">
      {/* 용량 경고 배너 */}
      <UsageBanner className="mx-4 mt-4 absolute top-0 left-0 right-0 z-30" />

      {/* 메인 그래프 캔버스 */}
      <GraphCanvas graphData={filteredData} />

      {/* 필터 컨트롤 패널 */}
      <GraphControls
        nodeCount={nodeCount}
        linkCount={linkCount}
        isFiltered={isFiltered}
      />

      {/* 범례 */}
      <GraphLegend />

      {/* FAB 버튼 (노드 생성) */}
      <GraphFAB />

      {/* 생성 모달 */}
      <GraphCreateModal />

      {/* 노드 액션 메뉴 (모든 노드 타입) */}
      <GraphNodeActionMenu
        onDelete={handleNodeDelete}
        onEdit={handleNodeEdit}
      />

      {/* 노트 섹션 팝오버들 */}
      {actionMenuNode && popoverPosition && userId && (
        <>
          {/* 제목 편집 팝오버 */}
          {activePopover === 'title' && (
            <TitleEditPopover
              position={popoverPosition}
              initialTitle={(actionMenuNode.originalData as Note)?.title || ''}
              onSave={async (title) => {
                await handleTitleSave(title);
                handleClosePopover();
              }}
              onClose={handleClosePopover}
            />
          )}

          {/* 내용 편집 모달 */}
          {activePopover === 'content' && (
            <ContentEditorModal
              open={true}
              onClose={handleClosePopover}
              title="내용 편집"
              content={contentEditorContent}
              onChange={setContentEditorContent}
              enableAutoSave={true}
              onAutoSave={async (content: string) => {
                await handleContentSave(content);
              }}
              placeholder="내용을 입력하세요..."
            />
          )}

          {/* 영역/자원 선택 팝오버 */}
          {activePopover === 'areaResource' && (
            <AreaResourceSelectPopover
              position={popoverPosition}
              selectedId={
                (actionMenuNode.originalData as Note)?.area_resource_id
                  ? (() => {
                      const arId = (actionMenuNode.originalData as Note).area_resource_id;
                      const isArea = areas.some(a => a.id === arId);
                      return isArea ? `area-${arId}` : `resource-${arId}`;
                    })()
                  : undefined
              }
              areas={areas}
              resources={resources}
              onSelect={async (linkedId) => {
                await handleAreaResourceSave(linkedId);
                handleClosePopover();
              }}
              onClose={handleClosePopover}
            />
          )}

          {/* 프로젝트 연결 팝오버 */}
          {activePopover === 'project' && (
            <ProjectLinkPopover
              position={popoverPosition}
              selectedProjectIds={(actionMenuNode.originalData as Note)?.projects?.map(p => p.id) || []}
              allProjects={projects}
              onToggle={handleProjectToggle}
              onCreateProject={handleCreateProject}
              onClose={handleClosePopover}
            />
          )}

          {/* 할일 연결 팝오버 */}
          {activePopover === 'todo' && (
            <TodoLinkPopover
              position={popoverPosition}
              selectedTodoIds={(actionMenuNode.originalData as Note)?.todos?.map(t => t.id) || []}
              allTodos={todos}
              onToggle={handleTodoToggle}
              onCreateTodo={handleCreateTodo}
              onClose={handleClosePopover}
            />
          )}

          {/* 노트 연결 팝오버 */}
          {activePopover === 'note' && (
            <NoteLinkPopover
              position={popoverPosition}
              currentNoteId={actionMenuNode.id}
              selectedNoteIds={(actionMenuNode.originalData as Note)?.connectedNotes?.map(n => n.id) || []}
              allNotes={notes}
              onToggle={handleNoteToggle}
              onCreateNote={handleCreateNote}
              onClose={handleClosePopover}
            />
          )}
        </>
      )}

      {/* 로딩 인디케이터 (데이터 새로고침 시) */}
      {loading && graphData.nodes.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-base-100/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
            <span className="loading loading-spinner loading-xs text-primary"></span>
            <span className="text-xs">동기화 중...</span>
          </div>
        </div>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={refetch}
        className="absolute top-4 left-4 z-10 btn btn-sm btn-ghost bg-base-100/90 backdrop-blur-sm shadow-lg rounded-full"
        title="새로고침"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* 노드 편집 모달 - 타입별 분기 */}
      {isEditModalOpen && editingNode && userId && (
        <>
          {/* Todo 편집 */}
          {editingNode.type === 'todo' && (
            <TodoEditModal
              open={true}
              todo={editingTodoData || editingNode.originalData}
              onClose={handleCloseEditModal}
              onSave={async () => {
                if (editingTodoData) {
                  // TodoFormData → CreateTodoInput 변환
                  let startTimeISO: string | undefined;
                  if (editingTodoData.scheduledDate) {
                    const date = new Date(editingTodoData.scheduledDate);
                    if (editingTodoData.scheduleType === 'timed' && editingTodoData.startTime) {
                      const [hours, minutes] = editingTodoData.startTime.split(':');
                      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                    }
                    startTimeISO = date.toISOString();
                  }

                  await updateTodo(editingNode.id, {
                    title: editingTodoData.title,
                    clarification: editingTodoData.clarification as Clarification | undefined,
                    schedule_type: editingTodoData.scheduleType || 'none',
                    start_time: startTimeISO,
                    completed: editingTodoData.completed,
                    is_today_highlight: editingTodoData.isHighlight,
                    next_action_context_ids: editingTodoData.nextActionContextIds,
                    color: editingTodoData.color,
                    icon: editingTodoData.icon,
                  });
                }
                handleCloseEditModal();
                refetch();
              }}
              onChange={(data) => setEditingTodoData(data)}
              onDelete={async () => {
                await deleteTodo(editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
            />
          )}

          {/* Project 편집 */}
          {editingNode.type === 'project' && (
            <ProjectEditDialog
              open={true}
              editingProject={editingProjectData || editingNode.originalData}
              onSave={async (data) => {
                await updateProject(userId, editingNode.id, data);
                handleCloseEditModal();
                refetch();
              }}
              onCancel={handleCloseEditModal}
              onDelete={async () => {
                await deleteProject(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onProjectChange={(project) => setEditingProjectData(project)}
            />
          )}

          {/* Goal 편집 */}
          {editingNode.type === 'goal' && (
            <GoalEditDialog
              open={true}
              editingGoal={editingGoalData || editingNode.originalData}
              areas={areas}
              resources={resources}
              projects={projects}
              onSave={async (data) => {
                await updateGoal(userId, editingNode.id, data);
                handleCloseEditModal();
                refetch();
              }}
              onCancel={handleCloseEditModal}
              onDelete={async () => {
                await deleteGoal(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onGoalChange={(goal) => setEditingGoalData(goal)}
              onAddProject={handleAddProjectInGoal}
              onEditProject={handleEditProjectInGoal}
              onDeleteProject={handleDeleteProjectInGoal}
              isCreatingProject={isCreatingProject}
            />
          )}

          {/* Area 편집 */}
          {editingNode.type === 'area' && (
            <AreaResourceEditModal
              open={true}
              editingItem={editingAreaResourceData || editingNode.originalData}
              itemType={areaResourceItemType}
              pageType="area"
              onCancel={handleCloseEditModal}
              onSave={async () => {
                if (editingAreaResourceData) {
                  const { title, color, icon, is_pinned } = editingAreaResourceData;
                  await updateArea(userId, editingNode.id, { title, color, icon, is_pinned });
                }
                handleCloseEditModal();
                refetch();
              }}
              onDelete={async () => {
                await deleteArea(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onItemChange={(item) => setEditingAreaResourceData(item)}
              onItemTypeChange={(type) => setAreaResourceItemType(type)}
            />
          )}

          {/* Resource 편집 */}
          {editingNode.type === 'resource' && (
            <AreaResourceEditModal
              open={true}
              editingItem={editingAreaResourceData || editingNode.originalData}
              itemType={areaResourceItemType}
              pageType="resource"
              onCancel={handleCloseEditModal}
              onSave={async () => {
                if (editingAreaResourceData) {
                  const { title, color, icon, is_pinned } = editingAreaResourceData;
                  await updateResource(userId, editingNode.id, { title, color, icon, is_pinned });
                }
                handleCloseEditModal();
                refetch();
              }}
              onDelete={async () => {
                await deleteResource(userId, editingNode.id);
                handleCloseEditModal();
                refetch();
              }}
              onItemChange={(item) => setEditingAreaResourceData(item)}
              onItemTypeChange={(type) => setAreaResourceItemType(type)}
            />
          )}

        </>
      )}

      {/* 노트 편집 모달 (액션 메뉴에서 편집 클릭 시) */}
      {editingNoteForModal && noteFormData && (
        <NoteEditModal
          open={!!editingNoteForModal}
          note={noteFormData}
          onClose={handleCloseNoteEditModal}
          onChange={setNoteFormData}
          onSave={handleNoteEditModalSave}
          areas={areas}
          resources={resources}
          projects={projects}
          todos={todos}
          notes={notes}
          onCreateTodo={handleCreateTodo}
          onCreateProject={handleCreateProject}
          onCreateNote={handleCreateNote}
          onNoteNoteImmediateSave={handleNoteNoteImmediateSave}
        />
      )}
    </div>
  );
}
