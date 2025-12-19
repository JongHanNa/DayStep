/**
 * GraphView - 그래프 뷰 메인 컨테이너 (Todos + Notes)
 * 옵시디언 스타일의 물리 시뮬레이션 기반 그래프 시각화
 */

'use client';

import { useState, useCallback } from 'react';
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
import { GraphMultiSelectBar } from './GraphMultiSelectBar';
import { useGraphStore, useGraphEditModal, useGraphActionMenu } from '@/state/stores/graphStore';

// 편집 모달들
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { mapNoteToNoteForm } from '@/lib/helpers/noteDataMapper';

// Store들
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore, type Note as NoteStoreNote } from '@/state/stores/noteStore';

// 유틸리티
import { updateNoteNotes } from '@/lib/supabase/note-notes';
import { updateNoteTodos } from '@/lib/supabase/todo-notes';

// 구독/용량 관련
import { UsageBanner } from '@/components/subscription/UsageBanner';
import { useUsageStats } from '@/hooks/useUsageStats';

// 타입
import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { GraphNode } from '@/types/graph';
import type { Note as SecondBrainNote } from '@/types/second-brain';
import type { Todo } from '@/types';

export default function GraphView() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const { graphData, loading, error, refetch } = useGraphData();
  const { filteredData, nodeCount, linkCount, isFiltered } = useFilteredGraphData(graphData);
  const [shouldZoomToFit, setShouldZoomToFit] = useState(false);
  const { isOpen: isEditModalOpen, node: editingNode } = useGraphEditModal();
  const { closeEditModal, closeActionMenu, openEditModal } = useGraphStore();
  const { node: actionMenuNode } = useGraphActionMenu();

  // Store 데이터 및 액션 가져오기
  const entityTodos = useTodoStore((state) => state.todos);
  const createTodo = useTodoStore((state) => state.createTodo);
  const updateTodo = useTodoStore((state) => state.updateTodo);
  const deleteTodo = useTodoStore((state) => state.deleteTodo);

  // Entity Todo를 database Todo 형식으로 변환 (NoteEditModal용)
  const todos = entityTodos.map(todo => todo.toDatabase() as Todo);

  const { notes, createNote, updateNote, deleteNote } = useNoteStore();

  // 용량 체크
  const { canCreate, incrementCount } = useUsageStats();

  // Todo 편집 상태
  const [editingTodoData, setEditingTodoData] = useState<TodoFormData | null>(null);

  // Note 편집 상태 (NoteEditModal용)
  const [editingNoteForModal, setEditingNoteForModal] = useState<NoteStoreNote | null>(null);
  const [noteFormData, setNoteFormData] = useState<NoteFormData | null>(null);

  // 새로고침 핸들러 (데이터 리페치 후 zoomToFit 트리거)
  const handleRefresh = useCallback(async () => {
    await refetch();
    setShouldZoomToFit(true);
  }, [refetch]);

  // 모달 닫기 핸들러
  const handleCloseEditModal = useCallback(() => {
    closeEditModal();
    setEditingTodoData(null);
  }, [closeEditModal]);

  // 노트 편집 모달 닫기 핸들러
  const handleCloseNoteEditModal = useCallback(() => {
    setEditingNoteForModal(null);
    setNoteFormData(null);
  }, []);

  // 노트 편집 핸들러 (액션 메뉴용)
  const handleNoteEdit = useCallback((node: GraphNode) => {
    const note = node.originalData as NoteStoreNote;
    setEditingNoteForModal(note);
    // NoteStoreNote를 SecondBrainNote로 변환하여 mapNoteToNoteForm에 전달
    setNoteFormData(mapNoteToNoteForm({
      ...note,
      title: note.title || '',
      note_category: note.note_category || 'none',
    } as SecondBrainNote, []));
  }, []);

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

  // 통합 삭제 핸들러 (Todo + Note)
  const handleNodeDelete = useCallback(async (node: GraphNode) => {
    if (!userId) return;

    switch (node.type) {
      case 'note':
        await deleteNote(node.id);
        break;
      case 'todo':
        await deleteTodo(node.id);
        break;
    }
    refetch();
  }, [userId, deleteNote, deleteTodo, refetch]);

  // 일괄 삭제 핸들러 (다중 선택된 노드들)
  const handleBulkDelete = useCallback(async (nodeIds: string[]) => {
    if (!userId || nodeIds.length === 0) return;

    // 삭제할 노드들 찾기
    const nodesToDelete = filteredData.nodes.filter((node) => nodeIds.includes(node.id));

    // 모든 노드 삭제 (병렬 처리)
    await Promise.all(
      nodesToDelete.map(async (node) => {
        switch (node.type) {
          case 'note':
            await deleteNote(node.id);
            break;
          case 'todo':
            await deleteTodo(node.id);
            break;
        }
      })
    );

    refetch();
  }, [userId, filteredData.nodes, deleteNote, deleteTodo, refetch]);

  // 노트 편집 모달 저장 핸들러
  const handleNoteEditModalSave = useCallback(async () => {
    if (!editingNoteForModal || !noteFormData || !userId) return;

    try {
      // 노트 기본 정보 저장
      await updateNote({
        id: editingNoteForModal.id,
        title: noteFormData.title,
        content: noteFormData.content,
        note_category: noteFormData.note_category,
        is_pinned: noteFormData.isPinned,
      });

      // 할일 연결 저장
      if (noteFormData.todoIds !== undefined) {
        await updateNoteTodos(editingNoteForModal.id, noteFormData.todoIds, userId);
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

  // 노트 생성 핸들러 (노트 편집 모달용)
  const handleCreateNote = useCallback(async (title: string): Promise<SecondBrainNote> => {
    if (!userId) {
      throw new Error('사용자 정보가 없습니다.');
    }
    // 용량 체크
    const result = canCreate('note');
    if (result.blocked) {
      throw new Error(`노트 한도에 도달했습니다. (${result.current}/${result.limit})`);
    }
    const newNote = await createNote({
      title,
      content: '',
      note_category: 'work_in_progress',
      is_pinned: false,
      user_id: userId,
    });
    incrementCount('note');
    // NoteStoreNote를 SecondBrainNote로 변환
    return {
      ...newNote,
      title: newNote.title || '',
      note_category: newNote.note_category || 'none',
    } as SecondBrainNote;
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
  const handleCreateTodo = useCallback(async (title: string): Promise<Todo> => {
    if (!userId) {
      throw new Error('사용자 정보가 없습니다.');
    }
    // 용량 체크
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
    return newEntityTodo.toDatabase() as Todo;
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
      <GraphCanvas
        graphData={filteredData}
        shouldZoomToFit={shouldZoomToFit}
        onZoomToFitComplete={() => setShouldZoomToFit(false)}
      />

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

      {/* 다중 선택 액션 바 */}
      <GraphMultiSelectBar
        nodes={filteredData.nodes}
        onDeleteSelected={handleBulkDelete}
      />

      {/* 생성 모달 */}
      <GraphCreateModal />

      {/* 노드 액션 메뉴 */}
      <GraphNodeActionMenu
        onDelete={handleNodeDelete}
        onEdit={handleNodeEdit}
      />

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
        onClick={handleRefresh}
        className="absolute top-4 left-4 z-10 btn btn-sm btn-ghost bg-base-100/90 backdrop-blur-sm shadow-lg rounded-full"
        title="새로고침"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      {/* Todo 편집 모달 */}
      {isEditModalOpen && editingNode && userId && editingNode.type === 'todo' && (
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
                schedule_type: editingTodoData.scheduleType || 'none',
                start_time: startTimeISO,
                completed: editingTodoData.completed,
                is_today_highlight: editingTodoData.isHighlight,
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

      {/* Note 편집 모달 */}
      {editingNoteForModal && noteFormData && userId && (
        <NoteEditModal
          open={true}
          note={noteFormData}
          todos={todos}
          notes={notes.map(n => ({
            ...n,
            title: n.title || '',
            note_category: n.note_category || 'none',
          })) as SecondBrainNote[]}
          onClose={handleCloseNoteEditModal}
          onSave={handleNoteEditModalSave}
          onChange={setNoteFormData}
          onDelete={async () => {
            await deleteNote(editingNoteForModal.id);
            handleCloseNoteEditModal();
            refetch();
          }}
          onCreateTodo={handleCreateTodo}
          onCreateNote={handleCreateNote}
          onNoteNoteImmediateSave={handleNoteNoteImmediateSave}
        />
      )}
    </div>
  );
}
