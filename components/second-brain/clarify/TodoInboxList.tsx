'use client';

import { useState } from 'react';
import { Calendar, Star, Plus } from 'lucide-react';
import type { InboxItem, Project, Note } from '@/types/second-brain';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAuthStore } from '@/state/stores/authStore';

interface TodoInboxListProps {
  todos: InboxItem[];
  projects?: Project[];
  notes?: Note[];
  onRefresh: () => void;
}

export default function TodoInboxList({ todos, projects = [], notes = [], onRefresh }: TodoInboxListProps) {
  const user = useAuthStore((state) => state.user);
  const { inboxItems, updateInboxItem, convertTodoToProject } = useInboxStore();
  const { createProject, updateProject, deleteProject } = useProjectStore();
  const { createNote, updateNote, deleteNote } = useNoteStore();
  const [editingTodo, setEditingTodo] = useState<InboxItem | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

  const handleTodoClick = (todo: InboxItem) => {
    // ✅ InboxStore에서 최신 데이터 찾기
    const latestTodo = inboxItems.find((item) => item.id === todo.id);
    const todoToEdit = latestTodo || todo; // fallback to clicked todo

    setEditingTodo(todoToEdit);
    setTodoForm({
      title: todoToEdit.content,
      clarification: todoToEdit.clarification,
      nextActionStatuses: todoToEdit.next_action_status ? [todoToEdit.next_action_status] : [],
      scheduledDate: todoToEdit.scheduled_date ? new Date(todoToEdit.scheduled_date) : undefined,
      isHighlight: todoToEdit.is_highlight || false,
      completed: todoToEdit.is_completed || false,
      projectIds: todoToEdit.project_id ? [todoToEdit.project_id] : [], // 기존 단일 선택 호환
      noteIds: [], // 새 필드
    });
  };

  const handleSave = async (updatedTodo: TodoFormData) => {
    if (!editingTodo) return;

    try {
      // GTD 로직: 수집함 제거 조건 체크
      let shouldRemoveFromInbox = false;
      let newStatus: typeof editingTodo.status = 'inbox';

      // 1. 대기중 선택 → 즉시 제거
      if (updatedTodo.clarification === '대기중') {
        shouldRemoveFromInbox = true;
        newStatus = 'waiting';
      }
      // 2. 일정 선택 + 날짜 설정 → 제거
      else if (updatedTodo.clarification === '일정' && updatedTodo.scheduledDate) {
        shouldRemoveFromInbox = true;
        newStatus = 'scheduled';
      }
      // 3. 다음행동 선택 + 다음행동상황 1개 이상 → 제거
      else if (updatedTodo.clarification === '다음행동' && updatedTodo.nextActionStatuses && updatedTodo.nextActionStatuses.length > 0) {
        shouldRemoveFromInbox = true;
        newStatus = 'next_action';
      }

      // InboxItem 업데이트 (프론트엔드 전용 - 스토어만 반영)
      if (!user?.id) throw new Error('사용자 정보를 찾을 수 없습니다.');

      await updateInboxItem(user.id, editingTodo.id, {
        content: updatedTodo.title,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        clarification: updatedTodo.clarification,
        next_action_status: updatedTodo.nextActionStatuses?.join(', '),
        scheduled_date: updatedTodo.scheduledDate ? updatedTodo.scheduledDate.toISOString() : undefined,
        is_highlight: updatedTodo.isHighlight,
        is_completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0], // 첫 번째 프로젝트만 저장 (기존 호환)
      });

      // 💡 참고: TodoStore 동기화는 백엔드 연동 시 구현 예정

      setEditingTodo(null);
      setTodoForm(null);
      onRefresh();
    } catch (error) {
      console.error('할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  const handleConvertToProject = async () => {
    if (!editingTodo) return;

    if (!confirm('이 할일을 프로젝트로 변환하시겠습니까?\n\n할일은 삭제되고 프로젝트 수집함에 추가됩니다.')) {
      return;
    }

    try {
      await convertTodoToProject(editingTodo.id, editingTodo.content);
      setEditingTodo(null);
      setTodoForm(null);
      onRefresh();
      alert('프로젝트로 변환되었습니다. 프로젝트 수집함 탭에서 확인하세요.');
    } catch (error) {
      console.error('프로젝트 변환 실패:', error);
      alert('프로젝트 변환에 실패했습니다.');
    }
  };

  // 프로젝트 관련 핸들러
  const handleCreateProject = async (title: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    return await createProject(user.id, {
      title,
      description: '',
      status: 'not_started',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    await updateProject(user.id, id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!user?.id) throw new Error('User not authenticated');
    await deleteProject(user.id, id);
  };

  // 노트 관련 핸들러
  const handleCreateNote = async (title: string) => {
    return await createNote({
      title,
      content: '',
      memo_type: 'note',
      tags: [],
      is_pinned: false,
    });
  };

  const handleUpdateNote = async (id: string, title: string) => {
    await updateNote(id, { title });
  };

  const handleDeleteNote = async (id: string) => {
    await deleteNote(id);
  };

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📥</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          할일 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          수집 페이지에서 새로운 할일을 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {todos.map((todo) => (
          <button
            key={todo.id}
            onClick={() => handleTodoClick(todo)}
            className="w-full text-left p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1">{todo.content}</p>
                {todo.clarification && (
                  <span className="badge badge-sm badge-primary">{todo.clarification}</span>
                )}
                {todo.next_action_status && (
                  <span className="badge badge-sm badge-secondary ml-2">{todo.next_action_status}</span>
                )}
              </div>
              {todo.is_highlight && (
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            {todo.scheduled_date && (
              <div className="flex items-center gap-1 mt-2 text-xs text-base-content/60">
                <Calendar className="w-3 h-3" />
                {new Date(todo.scheduled_date).toLocaleDateString('ko-KR')}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 할일 편집 모달 - TodoEditModal 컴포넌트 사용 */}
      <TodoEditModal
        open={editingTodo !== null && todoForm !== null}
        todo={todoForm}
        onClose={() => {
          setEditingTodo(null);
          setTodoForm(null);
        }}
        onSave={handleSave}
        onChange={(updated) => setTodoForm(todoForm ? { ...todoForm, ...updated } : null)}
        projects={projects}
        notes={notes}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onCreateNote={handleCreateNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        additionalContent={
          <button onClick={handleConvertToProject} className="btn btn-outline w-full">
            <Plus className="w-4 h-4" />
            프로젝트로 변환
          </button>
        }
      />
    </>
  );
}
