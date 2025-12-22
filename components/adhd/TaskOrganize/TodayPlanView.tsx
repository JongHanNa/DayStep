'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, GripVertical, ChevronRight, Trash2, ArrowRight, ArrowLeft, Check, Circle } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';

interface TodayPlanViewProps {
  userId: string;
}

/**
 * 계획 탭 - 오늘/내일 할 일 정리
 *
 * ADHD 관점:
 * - 오늘과 내일에만 집중 (먼 미래는 불안감 유발)
 * - 맥락 표시: "어떤 목표를 위한 건지" 배지로 표시
 * - 우선순위 조정 가능
 */
export function TodayPlanView({ userId }: TodayPlanViewProps) {
  const { todos, fetchAllTodos, updateTodo, deleteTodo } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'today' | 'tomorrow' | null>('today');

  // 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editFormData, setEditFormData] = useState<TodoFormData | null>(null);

  // 삭제 확인 상태
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // 프로젝트/목표 관련 기능 제거됨 - 빈 배열로 대체
  const projects: { id: string; title: string }[] = [];
  const goals: { id: string; title: string }[] = [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllTodos();
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos]);

  // 프로젝트/목표 매핑 생성
  const projectMap = useMemo(() => {
    return new Map(projects.map(p => [p.id, p.title]));
  }, [projects]);

  const goalMap = useMemo(() => {
    return new Map(goals.map(g => [g.id, g.title]));
  }, [goals]);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // 오늘 할일 필터링
  const todayTodos = useMemo(() => {
    return todos.filter(todo => {
      if (todo.completed) return false;
      if (!todo.startTime) return false;
      const todoDate = startOfDay(todo.startTime);
      return isToday(todoDate);
    }).sort((a, b) => {
      // 우선순위순 정렬
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'] ?? 2;
      const bPriority = priorityOrder[b.priority || 'low'] ?? 2;
      return aPriority - bPriority;
    });
  }, [todos]);

  // 내일 할일 필터링
  const tomorrowTodos = useMemo(() => {
    return todos.filter(todo => {
      if (todo.completed) return false;
      if (!todo.startTime) return false;
      const todoDate = startOfDay(todo.startTime);
      return isTomorrow(todoDate);
    }).sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.priority || 'low'] ?? 2;
      const bPriority = priorityOrder[b.priority || 'low'] ?? 2;
      return aPriority - bPriority;
    });
  }, [todos]);

  // 우선순위 변경
  const handlePriorityChange = useCallback(async (todo: Todo, newPriority: 'high' | 'medium' | 'low') => {
    await updateTodo(todo.id, { priority: newPriority });
  }, [updateTodo]);

  // 완료 토글
  const handleToggleComplete = useCallback(async (todo: Todo) => {
    await updateTodo(todo.id, { completed: !todo.completed });
  }, [updateTodo]);

  // 오늘로 이동
  const handleMoveToToday = useCallback(async (todoId: string) => {
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    await updateTodo(todoId, {
      start_time: targetDate.toISOString(),
      schedule_type: 'anytime',
    });
  }, [updateTodo]);

  // 내일로 이동
  const handleMoveToTomorrow = useCallback(async (todoId: string) => {
    const targetDate = addDays(new Date(), 1);
    targetDate.setHours(0, 0, 0, 0);
    await updateTodo(todoId, {
      start_time: targetDate.toISOString(),
      schedule_type: 'anytime',
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

  const renderTodoItem = (todo: Todo, section: 'today' | 'tomorrow') => {
    const projectName = todo.projectId ? projectMap.get(todo.projectId) : undefined;
    const goalName = todo.goalId ? goalMap.get(todo.goalId) : undefined;

    return (
      <div
        key={todo.id}
        className="flex items-center gap-2 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
      >
        {/* 드래그 핸들 (향후 드래그앤드롭 구현용) */}
        <GripVertical className="w-4 h-4 text-base-content/30 cursor-grab flex-shrink-0" />

        {/* 완료 체크박스 */}
        <button
          onClick={() => handleToggleComplete(todo)}
          className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
          title={todo.completed ? '미완료로 변경' : '완료로 변경'}
        >
          {todo.completed ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Circle className="w-4 h-4 text-base-content/40" />
          )}
        </button>

        {/* 우선순위 인디케이터 */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            todo.priority === 'high' ? 'bg-error' :
            todo.priority === 'medium' ? 'bg-warning' : 'bg-base-300'
          }`}
        />

        {/* 내용 (클릭 시 편집) */}
        <button
          onClick={() => handleEditClick(todo)}
          className="flex-1 min-w-0 text-left"
        >
          <p className="text-sm truncate">{todo.title}</p>

          {/* 맥락 배지 */}
          <div className="flex flex-wrap gap-1 mt-1">
            {goalName && (
              <span className="badge badge-xs badge-ghost">
                {goalName}
              </span>
            )}
            {projectName && (
              <span className="badge badge-xs badge-ghost">
                {projectName}
              </span>
            )}
            {todo.scheduleType === 'timed' && todo.startTime && (
              <span className="badge badge-xs badge-info">
                {format(todo.startTime, 'HH:mm')}
              </span>
            )}
          </div>
        </button>

        {/* 날짜 이동 버튼 */}
        {section === 'today' ? (
          <button
            onClick={() => handleMoveToTomorrow(todo.id)}
            className="btn btn-ghost btn-xs rounded-full text-info"
            title="내일로 이동"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => handleMoveToToday(todo.id)}
            className="btn btn-ghost btn-xs rounded-full text-primary"
            title="오늘로 이동"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}

        {/* 삭제 버튼 */}
        <button
          onClick={() => setDeletingTodoId(todo.id)}
          className="btn btn-ghost btn-xs rounded-full text-error"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* 우선순위 드롭다운 */}
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-xs">
            {todo.priority === 'high' ? '🔴' :
             todo.priority === 'medium' ? '🟡' : '⚪'}
          </div>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-1 shadow-lg">
            <li>
              <button onClick={() => handlePriorityChange(todo, 'high')}>
                🔴 높음
              </button>
            </li>
            <li>
              <button onClick={() => handlePriorityChange(todo, 'medium')}>
                🟡 보통
              </button>
            </li>
            <li>
              <button onClick={() => handlePriorityChange(todo, 'low')}>
                ⚪ 낮음
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 오늘 섹션 */}
      <div className="bg-base-200 rounded-xl border border-base-300">
        <button
          onClick={() => setExpandedSection(expandedSection === 'today' ? null : 'today')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold">오늘</span>
            <span className="badge badge-sm badge-primary">{todayTodos.length}</span>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${
            expandedSection === 'today' ? 'rotate-90' : ''
          }`} />
        </button>

        {expandedSection === 'today' && (
          <div className="px-4 pb-4 space-y-2">
            {todayTodos.length === 0 ? (
              <p className="text-center text-base-content/50 py-4">
                오늘 할 일이 없어요
              </p>
            ) : (
              todayTodos.map(todo => renderTodoItem(todo, 'today'))
            )}
          </div>
        )}
      </div>

      {/* 내일 섹션 */}
      <div className="bg-base-200 rounded-xl border border-base-300">
        <button
          onClick={() => setExpandedSection(expandedSection === 'tomorrow' ? null : 'tomorrow')}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-info" />
            <span className="font-semibold">내일</span>
            <span className="badge badge-sm badge-info">{tomorrowTodos.length}</span>
          </div>
          <ChevronRight className={`w-5 h-5 transition-transform ${
            expandedSection === 'tomorrow' ? 'rotate-90' : ''
          }`} />
        </button>

        {expandedSection === 'tomorrow' && (
          <div className="px-4 pb-4 space-y-2">
            {tomorrowTodos.length === 0 ? (
              <p className="text-center text-base-content/50 py-4">
                내일 할 일이 없어요
              </p>
            ) : (
              tomorrowTodos.map(todo => renderTodoItem(todo, 'tomorrow'))
            )}
          </div>
        )}
      </div>

      {/* 요약 */}
      <div className="text-center text-sm text-base-content/50 mt-6">
        오늘 {todayTodos.length}개, 내일 {tomorrowTodos.length}개의 할일이 있어요
      </div>

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
              &ldquo;{todos.find(t => t.id === deletingTodoId)?.title}&rdquo;
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
