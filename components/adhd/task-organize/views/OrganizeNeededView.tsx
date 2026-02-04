'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Inbox, AlertCircle, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { addDays, startOfWeek, addWeeks } from 'date-fns';
import { useTodoStore } from '@/state/stores/todoStore';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { Todo } from '@/entities/todo/Todo';

interface OrganizeNeededViewProps {
  userId: string;
}

/**
 * 정리 탭 - 미분류 할일들 정리
 *
 * ADHD 관점:
 * - 분류 강요 없이, 정리가 필요한 것들만 모아서 표시
 * - 날짜 없는 할일 등
 * - 나중에 연결 OK: 할일 먼저 만들고, 여기서 한꺼번에 정리
 */
export function OrganizeNeededView({ userId }: OrganizeNeededViewProps) {
  const { todos, fetchAllTodos, updateTodo, deleteTodo } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editFormData, setEditFormData] = useState<TodoFormData | null>(null);

  // 삭제 확인 상태
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllTodos();
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos]);

  // 날짜 없는 할일 (완료되지 않은 것만)
  const undatedTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed && !todo.startTime);
  }, [todos]);

  // 빠른 날짜 지정
  const handleQuickDate = useCallback(async (todoId: string, dateType: 'today' | 'tomorrow' | 'nextWeek') => {
    let targetDate: Date;

    if (dateType === 'today') {
      targetDate = new Date();
    } else if (dateType === 'tomorrow') {
      targetDate = addDays(new Date(), 1);
    } else {
      // 다음주 월요일
      targetDate = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
    }

    // 한국시간 자정으로 설정
    targetDate.setHours(0, 0, 0, 0);

    await updateTodo(todoId, {
      start_time: targetDate.toISOString(),
      schedule_type: 'anytime'
    });
  }, [updateTodo]);

  // 삭제 처리
  const handleDelete = useCallback(async (todoId: string) => {
    await deleteTodo(todoId);
    setDeletingTodoId(null);
  }, [deleteTodo]);

  // Todo → TodoFormData 변환
  const todoToFormData = useCallback((todo: Todo): TodoFormData => {
    return {
      title: todo.title,
      icon: todo.icon || undefined,
      color: todo.color || undefined,
      scheduledDate: todo.startTime ? new Date(todo.startTime) : undefined,
      isHighlight: false,
      completed: todo.completed,
      projectIds: todo.projectId ? [todo.projectId] : [],
      noteIds: [],
      displayOrder: todo.orderIndex,
      includeTime: todo.scheduleType === 'timed',
      includeEndDate: !!todo.endTime,
      startTime: todo.startTime ? new Date(todo.startTime).toTimeString().slice(0, 5) : undefined,
      endDate: todo.endTime ? new Date(todo.endTime) : undefined,
      endTime: todo.endTime ? new Date(todo.endTime).toTimeString().slice(0, 5) : undefined,
      scheduleType: todo.scheduleType || 'none',
      anytimeDuration: undefined,
      recurrencePattern: todo.recurrencePattern,
      recurrenceInterval: todo.recurrenceInterval,
      recurrenceEndType: todo.recurrenceEndDate ? 'date' : (todo.recurrenceCount ? 'count' : 'never'),
      recurrenceEndDate: todo.recurrenceEndDate ? new Date(todo.recurrenceEndDate) : undefined,
      recurrenceCount: todo.recurrenceCount || undefined,
      selectedDaysOfWeek: todo.recurrenceDaysOfWeek || undefined,
    };
  }, []);

  // 편집 모달 열기
  const handleEditClick = useCallback((todo: Todo) => {
    setEditingTodo(todo);
    setEditFormData(todoToFormData(todo));
  }, [todoToFormData]);

  // 편집 저장
  const handleEditSave = useCallback(async (formData: TodoFormData) => {
    if (!editingTodo) return;

    await updateTodo(editingTodo.id, {
      title: formData.title,
      icon: formData.icon,
      color: formData.color,
      start_time: formData.scheduledDate?.toISOString(),
      schedule_type: formData.scheduleType,
      completed: formData.completed,
      recurrence_pattern: formData.recurrencePattern as any,
      recurrence_interval: formData.recurrenceInterval,
      recurrence_end_date: formData.recurrenceEndDate?.toISOString().split('T')[0],
      recurrence_count: formData.recurrenceCount,
      recurrence_days_of_week: formData.selectedDaysOfWeek,
    });

    setEditingTodo(null);
    setEditFormData(null);
  }, [editingTodo, updateTodo]);

  // 편집 삭제
  const handleEditDelete = useCallback(async () => {
    if (!editingTodo) return;
    await deleteTodo(editingTodo.id);
    setEditingTodo(null);
    setEditFormData(null);
  }, [editingTodo, deleteTodo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  const totalIssues = undatedTodos.length;
  const displayedTodos = isExpanded ? undatedTodos : undatedTodos.slice(0, 10);
  const hiddenCount = undatedTodos.length - 10;

  if (totalIssues === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-success" />
        </div>
        <p className="font-semibold text-success">완벽하게 정리되어 있어요!</p>
        <p className="text-sm mt-1">정리할 항목이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 요약 카드 */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-warning mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">정리가 필요한 항목</span>
        </div>
        <p className="text-sm text-base-content/70">
          총 {totalIssues}개의 항목이 정리를 기다리고 있어요.
          <br />
          <span className="text-xs text-base-content/50">
            (정리하지 않아도 괜찮아요. 필요할 때 하면 됩니다)
          </span>
        </p>
      </div>

      {/* 날짜 없는 할일 */}
      {undatedTodos.length > 0 && (
        <div className="bg-base-200 rounded-xl border border-base-300">
          <div className="flex items-center gap-2 p-4 border-b border-base-300">
            <Inbox className="w-5 h-5 text-warning" />
            <span className="font-semibold">날짜 없는 할일</span>
            <span className="badge badge-sm badge-warning">{undatedTodos.length}</span>
          </div>
          <div className={`p-4 space-y-2 ${isExpanded ? 'max-h-[60vh]' : 'max-h-[400px]'} overflow-y-auto`}>
            {displayedTodos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-2 p-2 bg-base-100 rounded-lg hover:bg-base-300 transition-colors"
              >
                {/* 제목 (클릭 시 편집) */}
                <button
                  onClick={() => handleEditClick(todo)}
                  className="text-sm truncate flex-1 text-left hover:text-primary transition-colors"
                >
                  {todo.title}
                </button>

                {/* 빠른 날짜 버튼 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleQuickDate(todo.id, 'today')}
                    className="btn btn-ghost btn-xs rounded-full text-xs px-2"
                    title="오늘로 지정"
                  >
                    <Calendar className="w-3 h-3" />
                    오늘
                  </button>
                  <button
                    onClick={() => handleQuickDate(todo.id, 'tomorrow')}
                    className="btn btn-ghost btn-xs rounded-full text-xs px-2"
                    title="내일로 지정"
                  >
                    내일
                  </button>
                  <button
                    onClick={() => handleQuickDate(todo.id, 'nextWeek')}
                    className="btn btn-ghost btn-xs rounded-full text-xs px-2"
                    title="다음주 월요일로 지정"
                  >
                    다음주
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => setDeletingTodoId(todo.id)}
                    className="btn btn-ghost btn-xs rounded-full text-error"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 더보기/접기 버튼 */}
            {hiddenCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 text-sm text-primary hover:text-primary-focus transition-colors flex items-center justify-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    +{hiddenCount}개 더 보기
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 편집 모달 */}
      <TodoEditModal
        open={editingTodo !== null && editFormData !== null}
        todo={editFormData}
        onClose={() => {
          setEditingTodo(null);
          setEditFormData(null);
        }}
        onSave={handleEditSave}
        onChange={setEditFormData}
        onDelete={handleEditDelete}
        headerTitle="할일 편집"
      />

      {/* 삭제 확인 다이얼로그 */}
      {deletingTodoId && (
        <dialog open className="modal modal-open z-[110]">
          <div className="modal-box bg-base-100 max-w-sm">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="text-base-content/70 mb-2">정말로 이 할일을 삭제하시겠습니까?</p>
            <p className="text-sm font-medium mb-6 break-words">
              &ldquo;{undatedTodos.find(t => t.id === deletingTodoId)?.title}&rdquo;
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingTodoId(null)}
                className="btn btn-ghost btn-sm rounded-full"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deletingTodoId)}
                className="btn btn-error btn-sm rounded-full"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/50" onClick={() => setDeletingTodoId(null)} />
        </dialog>
      )}
    </div>
  );
}
