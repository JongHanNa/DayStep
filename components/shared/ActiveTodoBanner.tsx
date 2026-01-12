'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, ChevronRight } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';
import { getTimeStatus, formatDuration, type TimeStatusResult } from '@/lib/utils/timeStatus';
import { TimeProgressBar } from './TimeProgressBar';
import { generateAllRecurrenceInstances, applyCompletionStatusToInstances, isRecurringTodo } from '@/lib/recurrence-utils';
import { loadCompletionsForDateRange } from '@/lib/supabase/completions';
import { useAuth } from '@/app/context/AuthContext';

interface ActiveTodo {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  timeStatus: TimeStatusResult;
  isRecurrenceInstance?: boolean;
}

interface ActiveTodoBannerProps {
  /** 배너를 닫을 때 호출되는 콜백 */
  onDismiss?: () => void;
  /** 할일 클릭 시 호출되는 콜백 */
  onTodoClick?: (todoId: string) => void;
}

/**
 * 현재 진행 중인 할일을 표시하는 배너 컴포넌트
 * ADHD 사용자가 현재 해야 할 일을 인지할 수 있도록 도와줍니다.
 */
export function ActiveTodoBanner({ onDismiss, onTodoClick }: ActiveTodoBannerProps) {
  const { todos } = useTodoStore();
  const { user } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [recurrenceInstances, setRecurrenceInstances] = useState<ActiveTodo[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1분마다 현재 시간 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분

    return () => clearInterval(interval);
  }, []);

  // 반복 할일 인스턴스 로드
  useEffect(() => {
    const loadRecurrenceInstances = async () => {
      if (!user?.id) return;

      const recurringTodos = todos.filter(isRecurringTodo);
      if (recurringTodos.length === 0) {
        setRecurrenceInstances([]);
        return;
      }

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(todayStart);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);

      try {
        // 반복 인스턴스 생성
        const instances = await generateAllRecurrenceInstances(
          recurringTodos,
          todayStart,
          tomorrowEnd,
          user.id
        );

        // 완료 상태 로드
        const completions = await loadCompletionsForDateRange(
          todayStart,
          tomorrowEnd,
          user.id
        );
        const instancesWithCompletion = applyCompletionStatusToInstances(instances, completions);

        // timed 인스턴스만 필터링하고 시간 상태 계산
        // GeneratedRecurrenceItem은 data 필드에 할일 정보가 있음
        const activeInstances: ActiveTodo[] = instancesWithCompletion
          .filter(inst => {
            const data = inst.data;
            return (
              data?.schedule_type === 'timed' &&
              data?.start_time &&
              data?.end_time &&
              !data?.completed
            );
          })
          .map(inst => {
            const data = inst.data;
            const startTime = new Date(data.start_time);
            const endTime = new Date(data.end_time);
            const status = getTimeStatus(startTime, endTime, data.completed ?? false);
            return {
              id: inst.id,
              title: data.title ?? '제목 없음',
              startTime,
              endTime,
              timeStatus: status,
              isRecurrenceInstance: true,
            };
          })
          .filter(inst => inst.timeStatus.status === 'in_progress');

        setRecurrenceInstances(activeInstances);
      } catch (error) {
        console.error('Failed to load recurrence instances for banner:', error);
      }
    };

    loadRecurrenceInstances();
  }, [todos, user?.id, currentTime]);

  // 진행 중인 일반 할일 찾기
  const activeTodos = useMemo(() => {
    const now = currentTime;

    // 일반 timed 할일 중 진행 중인 것
    const regularActive: ActiveTodo[] = todos
      .filter(todo =>
        todo.scheduleType === 'timed' &&
        todo.startTime &&
        todo.endTime &&
        !todo.completed &&
        !isRecurringTodo(todo) // 반복 할일은 인스턴스로 처리
      )
      .map(todo => {
        const status = getTimeStatus(todo.startTime!, todo.endTime!, todo.completed, now);
        return {
          id: todo.id,
          title: todo.title,
          startTime: todo.startTime!,
          endTime: todo.endTime!,
          timeStatus: status,
        };
      })
      .filter(todo => todo.timeStatus.status === 'in_progress');

    // 반복 인스턴스와 합치기
    const allActive = [...regularActive, ...recurrenceInstances];

    // 닫은 항목 제외
    return allActive.filter(todo => !dismissedIds.has(todo.id));
  }, [todos, recurrenceInstances, dismissedIds, currentTime]);

  // 진행 중인 할일이 없으면 렌더링하지 않음
  if (activeTodos.length === 0) {
    return null;
  }

  const handleDismiss = (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set([...prev, todoId]));
    onDismiss?.();
  };

  const handleClick = (todoId: string) => {
    onTodoClick?.(todoId);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-lg mx-auto p-2 space-y-2">
        {activeTodos.map(todo => (
          <div
            key={todo.id}
            onClick={() => handleClick(todo.id)}
            className="pointer-events-auto bg-warning/95 backdrop-blur-sm text-warning-content rounded-lg shadow-lg p-3 cursor-pointer hover:bg-warning transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 아이콘 */}
              <div className="flex-shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="text-xs opacity-80 mb-0.5">지금은 이 시간이에요</div>
                <div className="font-medium truncate">{todo.title}</div>

                {/* 진행률 */}
                <div className="mt-2">
                  <TimeProgressBar
                    percent={todo.timeStatus.progressPercent ?? 0}
                    variant="warning"
                    height="sm"
                    animated={false}
                    className="bg-warning-content/20"
                  />
                  <div className="flex justify-between text-xs opacity-80 mt-1">
                    <span>{formatDuration(todo.timeStatus.elapsedMinutes ?? 0)} 경과</span>
                    <span>{formatDuration(todo.timeStatus.remainingMinutes ?? 0)} 남음</span>
                  </div>
                </div>
              </div>

              {/* 닫기/이동 버튼 */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <button
                  onClick={(e) => handleDismiss(todo.id, e)}
                  className="btn btn-ghost btn-xs btn-circle text-warning-content/70 hover:text-warning-content"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
