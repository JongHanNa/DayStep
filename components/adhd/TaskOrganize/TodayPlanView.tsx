'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, isToday, isTomorrow, startOfDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, GripVertical, ChevronRight } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';

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
  const { todos, fetchAllTodos, updateTodo } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<'today' | 'tomorrow' | null>('today');

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

  const handlePriorityChange = async (todo: Todo, newPriority: 'high' | 'medium' | 'low') => {
    await updateTodo(todo.id, { priority: newPriority });
  };

  const renderTodoItem = (todo: Todo) => {
    const projectName = todo.projectId ? projectMap.get(todo.projectId) : undefined;
    const goalName = todo.goalId ? goalMap.get(todo.goalId) : undefined;

    return (
      <div
        key={todo.id}
        className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
      >
        {/* 드래그 핸들 (향후 드래그앤드롭 구현용) */}
        <GripVertical className="w-4 h-4 text-base-content/30 cursor-grab" />

        {/* 우선순위 인디케이터 */}
        <div
          className={`w-2 h-2 rounded-full ${
            todo.priority === 'high' ? 'bg-error' :
            todo.priority === 'medium' ? 'bg-warning' : 'bg-base-300'
          }`}
        />

        {/* 내용 */}
        <div className="flex-1 min-w-0">
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
        </div>

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
              todayTodos.map(renderTodoItem)
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
              tomorrowTodos.map(renderTodoItem)
            )}
          </div>
        )}
      </div>

      {/* 요약 */}
      <div className="text-center text-sm text-base-content/50 mt-6">
        오늘 {todayTodos.length}개, 내일 {tomorrowTodos.length}개의 할일이 있어요
      </div>
    </div>
  );
}
