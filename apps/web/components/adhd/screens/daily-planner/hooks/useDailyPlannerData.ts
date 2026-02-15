'use client';

import { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useTodoStore } from '@/state/stores/todoStore';
import { useDailyReflectionStore } from '@/state/stores/dailyReflectionStore';
import { useProjectStore } from '@/state/stores/projectStore';
import { useDepartmentStore } from '@/state/stores/departmentStore';
import type { Todo } from '@/entities/todo/Todo';
import { type TimelineItem, timelineItemToTodo, type ProjectMapValue, type DepartmentMapValue } from '../../timeline/types';

export interface TodayProjectSummary {
  projectId: string;
  title: string;
  icon: string | null;
  color: string | null;
  todayTotal: number;
  todayCompleted: number;
}

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
  const projects = useProjectStore(s => s.projects);
  const departments = useDepartmentStore(s => s.departments);

  const dateStr = format(date, 'yyyy-MM-dd');

  // 리플렉션 로드
  useEffect(() => {
    if (userId && dateStr) {
      fetchReflection(userId, dateStr);
    }
  }, [userId, dateStr, fetchReflection]);

  const reflection = getReflection(dateStr);

  // 프로젝트/부서 매핑 (Timeline과 동일 패턴)
  const projectMap = useMemo<Map<string, ProjectMapValue>>(() => {
    return new Map(projects.map(p => [p.id, { title: p.title, color: p.color, icon: p.icon }]));
  }, [projects]);

  const departmentMap = useMemo<Map<string, DepartmentMapValue>>(() => {
    return new Map(departments.map(d => [d.id, { name: d.name, color: d.color, icon: d.icon }]));
  }, [departments]);

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

  // anytime 할일 분리 (시간표에서 제외)
  const anytimeTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => t.scheduleType === 'anytime');
  }, [todayTodos]);

  // 시간대별 그룹핑 (KST 기준, anytime 제외)
  const morningTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (t.scheduleType === 'anytime') return false;
      if (!t.startTime) return false;
      const hour = new Date(t.startTime).getHours();
      return hour < 12;
    });
  }, [todayTodos]);

  const afternoonTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (t.scheduleType === 'anytime') return false;
      if (!t.startTime) return false;
      const hour = new Date(t.startTime).getHours();
      return hour >= 12 && hour < 18;
    });
  }, [todayTodos]);

  const eveningTodos = useMemo(() => {
    return todayTodos.filter((t: Todo) => {
      if (t.scheduleType === 'anytime') return false;
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

  // 오늘의 프로젝트 요약 데이터
  const todayProjectSummary = useMemo<TodayProjectSummary[]>(() => {
    const summaryMap = new Map<string, { total: number; completed: number }>();

    for (const todo of todayTodos) {
      const pid = todo.projectId;
      if (!pid) continue;
      const entry = summaryMap.get(pid) || { total: 0, completed: 0 };
      entry.total++;
      if (todo.completed) entry.completed++;
      summaryMap.set(pid, entry);
    }

    const result: TodayProjectSummary[] = [];
    for (const [projectId, counts] of summaryMap) {
      const pInfo = projectMap.get(projectId);
      if (!pInfo) continue;
      result.push({
        projectId,
        title: pInfo.title,
        icon: pInfo.icon,
        color: pInfo.color,
        todayTotal: counts.total,
        todayCompleted: counts.completed,
      });
    }

    return result.sort((a, b) => b.todayTotal - a.todayTotal);
  }, [todayTodos, projectMap]);

  return {
    todayTodos,
    anytimeTodos,
    morningTodos,
    afternoonTodos,
    eveningTodos,
    matrixTodos,
    reluctantTodos,
    unscheduledTodos,
    reflection,
    upsertReflection,
    dateStr,
    projectMap,
    departmentMap,
    todayProjectSummary,
  };
}
