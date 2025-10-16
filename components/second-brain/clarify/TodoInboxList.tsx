'use client';

import { useState } from 'react';
import { Calendar, Star, Plus } from 'lucide-react';
import type { InboxItem, Project, Note } from '@/types/second-brain';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';

interface TodoInboxListProps {
  todos: InboxItem[];
  projects?: Project[];
  notes?: Note[];
  onRefresh: () => void;
}

export default function TodoInboxList({ todos, projects = [], notes = [], onRefresh }: TodoInboxListProps) {
  const { updateInboxItem, convertTodoToProject } = useInboxStore();
  const { createProject, updateProject, deleteProject } = useProjectStore();
  const { createNote, updateNote, deleteNote } = useNoteStore();
  const [editingTodo, setEditingTodo] = useState<InboxItem | null>(null);
  const [todoForm, setTodoForm] = useState<TodoFormData | null>(null);

  const handleTodoClick = (todo: InboxItem) => {
    setEditingTodo(todo);
    setTodoForm({
      title: todo.content,
      clarification: todo.clarification,
      nextActionStatuses: todo.next_action_status ? [todo.next_action_status] : [],
      scheduledDate: todo.scheduled_date ? new Date(todo.scheduled_date) : undefined,
      isHighlight: todo.is_highlight || false,
      completed: todo.is_completed || false,
      projectIds: todo.project_id ? [todo.project_id] : [], // 기존 단일 선택 호환
      noteIds: [], // 새 필드
    });
  };

  const handleSave = async () => {
    if (!editingTodo || !todoForm) return;

    try {
      // GTD 로직: 수집함 제거 조건 체크
      let shouldRemoveFromInbox = false;
      let newStatus: typeof editingTodo.status = 'inbox';

      // 1. 대기중 선택 → 즉시 제거
      if (todoForm.clarification === '대기중') {
        shouldRemoveFromInbox = true;
        newStatus = 'waiting';
      }
      // 2. 일정 선택 + 날짜 설정 → 제거
      else if (todoForm.clarification === '일정' && todoForm.scheduledDate) {
        shouldRemoveFromInbox = true;
        newStatus = 'scheduled';
      }
      // 3. 다음행동 선택 + 다음행동상황 1개 이상 → 제거
      else if (todoForm.clarification === '다음행동' && todoForm.nextActionStatuses && todoForm.nextActionStatuses.length > 0) {
        shouldRemoveFromInbox = true;
        newStatus = 'next_action';
      }

      await updateInboxItem(editingTodo.id, {
        content: todoForm.title,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        clarification: todoForm.clarification,
        next_action_status: todoForm.nextActionStatuses?.join(', '),
        scheduled_date: todoForm.scheduledDate ? todoForm.scheduledDate.toISOString() : undefined,
        is_highlight: todoForm.isHighlight,
        is_completed: todoForm.completed,
        project_id: todoForm.projectIds?.[0], // 첫 번째 프로젝트만 저장 (기존 호환)
      });

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
    return await createProject({
      title,
      description: '',
      status: 'active',
      color: '#6366f1',
      order_index: projects.length,
    });
  };

  const handleUpdateProject = async (id: string, title: string) => {
    await updateProject(id, { title });
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
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

      {/* 할일 편집 모달 */}
      {editingTodo && todoForm && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4">할일 편집</h3>

            <TodoFormFields
              todo={todoForm}
              onChange={setTodoForm}
              projects={projects}
              notes={notes}
              onCreateProject={handleCreateProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />

            <div className="flex flex-col gap-2 mt-6">
              <button onClick={handleConvertToProject} className="btn btn-outline w-full">
                <Plus className="w-4 h-4" />
                프로젝트로 변환
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingTodo(null);
                    setTodoForm(null);
                  }}
                  className="btn btn-ghost flex-1"
                >
                  취소
                </button>
                <button onClick={handleSave} className="btn btn-primary flex-1">
                  저장
                </button>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setEditingTodo(null);
              setTodoForm(null);
            }}
          />
        </dialog>
      )}
    </>
  );
}
