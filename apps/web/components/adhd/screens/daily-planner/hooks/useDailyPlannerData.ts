'use client';

import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useTodoStore } from '@/state/stores/todoStore';
import { useDailyReflectionStore } from '@/state/stores/dailyReflectionStore';
import type { Todo } from '@/entities/todo/Todo';
import { type TimelineItem, timelineItemToTodo } from '../types';

interface UseDailyPlannerDataProps {
  userId: string;
  date: Date;
  timelineItems: TimelineItem[];
}

export function useDailyPlannerData({ userId, date, timelineItems }: UseDailyPlannerDataProps) {
  const todos = useTodoStore(s => s.todos);
  const fetchReflection = useDailyReflectionStore(s => s.fetchReflection);
  const getReflection = useDailyReflectionStore(s => s.getReflection);
  const upsertReflection = useDailyReflectionStore(s => s.upsertReflection);

  const dateStr = format(date, 'yyyy-MM-dd');

  // 리플렉션 로드
  useEffect(() => {
    if (userId && dateStr) {
      fetchReflection(userId, dateStr);
    }
  }, [userId, dateStr, fetchReflection]);

  const reflection = getReflection(dateStr);

  // timelineItems 기반 오늘 할일 필터링 (반복 인스턴스 포함)
  const todayTodos = useMemo(() => {
    return timelineItems
      .filter((item) => {
        if (!item.startTime) return false;
        // deleted/postponed만 제외, not_needed/missed는 표시 (배지로 상태 표시)
        if (item.exclusionReason === 'deleted' || item.exclusionReason === 'postponed') return false;
        return format(item.startTime, 'yyyy-MM-dd') === dateStr;
      })
      .map(timelineItemToTodo);
  }, [timelineItems, dateStr]);

  // 시간대별 그룹핑 (KST 기준)
  const morningTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (!t.startTime) return false;
      const hour = new Date(t.startTime).getHours();
      return hour < 12;
    });
  }, [todayTodos]);

  const afternoonTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (!t.startTime) return false;
      const hour = new Date(t.startTime).getHours();
      return hour >= 12 && hour < 18;
    });
  }, [todayTodos]);

  const eveningTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (!t.startTime) return false;
      const hour = new Date(t.startTime).getHours();
      return hour >= 18;
    });
  }, [todayTodos]);

  // 매트릭스 할일 (importance/urgency가 설정된 것)
  const matrixTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => (t as any).importance !== null && (t as any).importance !== undefined);
  }, [todayTodos]);

  // 하기싫어도해야할일
  const reluctantTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => (t as any).isReluctantMustDo === true);
  }, [todayTodos]);

  // 미분류 할일 (시간 미지정 anytime 할일)
  const unscheduledTodos = useMemo(() => {
    return todos.filter((todo: Todo) => {
      if (todo.scheduleType !== 'anytime') return false;
      const createdDate = format(new Date(todo.createdAt), 'yyyy-MM-dd');
      return createdDate === dateStr;
    });
  }, [todos, dateStr]);

  return {
    todayTodos,
    morningTodos,
    afternoonTodos,
    eveningTodos,
    matrixTodos,
    reluctantTodos,
    unscheduledTodos,
    reflection,
    upsertReflection,
    dateStr,
  };
}
