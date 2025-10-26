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
  const { todos: allTodos, updateTodo, createTodo } = useTodoStore();
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

      // InboxItem 업데이트
      await updateInboxItem(editingTodo.id, {
        content: updatedTodo.title,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        clarification: updatedTodo.clarification,
        next_action_status: updatedTodo.nextActionStatuses?.join(', '),
        scheduled_date: updatedTodo.scheduledDate ? updatedTodo.scheduledDate.toISOString() : undefined,
        is_highlight: updatedTodo.isHighlight,
        is_completed: updatedTodo.completed,
        project_id: updatedTodo.projectIds?.[0], // 첫 번째 프로젝트만 저장 (기존 호환)
      });

      // TodoStore와 자동 동기화: InboxItem → Todo 생성/업데이트
      const relatedTodo = allTodos.find(todo => todo.id === editingTodo.id);

      // InboxItem → CreateTodoInput 변환 (시간 포함 여부에 따라 schedule_type 결정)
      let schedule_type: 'anytime' | 'scheduled' | 'timed' = 'anytime';
      let start_time: string | undefined;
      let end_time: string | undefined;

      if (updatedTodo.scheduledDate) {
        if (updatedTodo.includeTime) {
          // 시간 포함 ON → timed
          schedule_type = 'timed';
          const startTimeStr = updatedTodo.startTime || '09:00';
          const [startHour, startMinute] = startTimeStr.split(':');
          const startDateTime = new Date(updatedTodo.scheduledDate);
          startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
          start_time = startDateTime.toISOString();

          if (updatedTodo.includeEndDate && updatedTodo.endDate) {
            // 종료일 ON → 종료 날짜 + 시간
            const endTimeStr = updatedTodo.endTime || '18:00';
            const [endHour, endMinute] = endTimeStr.split(':');
            const endDateTime = new Date(updatedTodo.endDate);
            endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
            end_time = endDateTime.toISOString();
          } else {
            // 종료일 OFF → 시작 날짜/시간과 동일
            end_time = start_time;
          }
        } else {
          // 시간 포함 OFF → scheduled (날짜만)
          schedule_type = 'scheduled';
          const dateOnly = new Date(updatedTodo.scheduledDate);
          dateOnly.setHours(0, 0, 0, 0);
          start_time = dateOnly.toISOString();

          // 종료일이 있으면 end_time도 설정 (00:00:00)
          if (updatedTodo.includeEndDate && updatedTodo.endDate) {
            const endDateOnly = new Date(updatedTodo.endDate);
            endDateOnly.setHours(0, 0, 0, 0);
            end_time = endDateOnly.toISOString();
          } else {
            end_time = undefined;
          }
        }
      }

      const todoInput = {
        title: updatedTodo.title,
        completed: updatedTodo.completed || false,
        schedule_type,
        start_time,
        end_time,
        priority: updatedTodo.isHighlight ? ('high' as const) : ('medium' as const),
      };

      if (relatedTodo) {
        // 기존 Todo 업데이트
        console.log('🔄 [TodoInboxList] 관련 Todo 발견, 업데이트 중:', relatedTodo.id);
        await updateTodo(relatedTodo.id, todoInput);
        console.log('✅ [TodoInboxList] TodoStore 업데이트 완료');
      } else {
        // 새 Todo 생성
        console.log('🆕 [TodoInboxList] 관련 Todo 없음, 새로 생성 중...');
        await createTodo(todoInput);
        console.log('✅ [TodoInboxList] 새 Todo 생성 완료');
      }

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
