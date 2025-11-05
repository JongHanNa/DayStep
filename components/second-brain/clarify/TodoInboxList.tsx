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
import { updateInboxTodo } from '@/lib/supabase/inbox';
import { getInboxRemovalMessage } from '@/lib/utils/inboxMessages';

interface TodoInboxListProps {
  todos: InboxItem[];
  projects?: Project[];
  notes?: Note[];
  onRefresh: () => void;
  userId: string;
}

// 명료화 enum 값을 한글로 변환
const getClarificationLabel = (clarification?: string): string => {
  if (!clarification || clarification === 'none') return '';

  const labelMap: Record<string, string> = {
    'reminder': '다시알림',
    'someday': '언젠가',
    'waiting': '대기중',
    'next_action': '다음행동',
    'scheduled': '일정',
  };

  return labelMap[clarification] || clarification;
};

export default function TodoInboxList({ todos, projects = [], notes = [], onRefresh, userId }: TodoInboxListProps) {
  const { inboxItems, convertTodoToProject, fetchInboxItems } = useInboxStore();
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
      // ✅ DB 직접 업데이트 (로컬 상태 건드리지 않음)
      if (!userId) throw new Error('사용자 정보를 찾을 수 없습니다.');

      await updateInboxTodo(userId, editingTodo.id, {
        title: updatedTodo.title,
        clarification: updatedTodo.clarification,
        next_action_contexts: updatedTodo.nextActionStatuses ? updatedTodo.nextActionStatuses : undefined,
        scheduled_date: updatedTodo.scheduledDate ? updatedTodo.scheduledDate.toISOString() : undefined,
        is_today_highlight: updatedTodo.isHighlight,
        completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0], // 첫 번째 프로젝트만 저장 (기존 호환)
      });

      // ✅ DB에서 최신 데이터 가져오기 (UI 동기화)
      await fetchInboxItems(userId);

      // 💡 참고: TodoStore 동기화는 백엔드 연동 시 구현 예정

      // 모달 닫기
      setEditingTodo(null);
      setTodoForm(null);
    } catch (error) {
      console.error('❌ [TodoInboxList] 할일 저장 실패:', error);
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
    if (!userId) throw new Error('User not authenticated');
    return await createProject(userId, {
      title,
      description: '',
      status: 'not_started',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    if (!userId) throw new Error('User not authenticated');
    await updateProject(userId, id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    if (!userId) throw new Error('User not authenticated');
    await deleteProject(userId, id);
  };

  // 노트 관련 핸들러
  const handleCreateNote = async (title: string) => {
    if (!userId) throw new Error('User not found');
    return await createNote(userId, {
      title,
      content: '',
      memo_type: 'note',
      note_category: 'work_in_progress', // 기본값
      tags: [],
      is_pinned: false,
    });
  };

  const handleUpdateNote = async (id: string, title: string) => {
    if (!userId) throw new Error('User not found');
    await updateNote(id, userId, { title });
  };

  const handleDeleteNote = async (id: string) => {
    if (!userId) throw new Error('User not found');
    await deleteNote(id, userId);
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
            <div key={todo.id} className="relative overflow-hidden rounded-lg">
              {/* 카드 레이어 */}
              <button
                onClick={() => handleTodoClick(todo)}
                className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full text-left"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{todo.content}</p>
                      {todo.clarification && todo.clarification !== 'none' && (
                        <span key={`clarification-${todo.id}`} className="badge badge-sm badge-primary">
                          {getClarificationLabel(todo.clarification)}
                        </span>
                      )}
                      {todo.next_action_status && (
                        <span key={`next-action-${todo.id}`} className="badge badge-sm badge-secondary ml-2">
                          {todo.next_action_status}
                        </span>
                      )}
                      {/* 동적 안내 메시지 */}
                      {(() => {
                        const message = getInboxRemovalMessage(todo);
                        return message ? (
                          <p className="text-xs text-base-content/60 mt-1">
                            {message}
                          </p>
                        ) : null;
                      })()}
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
              </div>
            </button>
          </div>
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
