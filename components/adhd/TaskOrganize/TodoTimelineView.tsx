'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CheckCircle2, Plus, Clock } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';

interface TodoTimelineViewProps {
  userId: string;
}

interface TimelineItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  projectName?: string;
  goalName?: string;
}

/**
 * 타임라인 탭 - 할일 생성 기록 시간순
 *
 * ADHD 관점:
 * - 성취감: 완료한 일들을 시각적으로 확인
 * - 맥락: 프로젝트/목표 배지로 어떤 목표를 위한 건지 표시
 */
export function TodoTimelineView({ userId }: TodoTimelineViewProps) {
  const { todos, fetchAllTodos } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);

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

  // 타임라인 아이템 생성 (최근 생성된 할일)
  const timelineItems: TimelineItem[] = useMemo(() => {
    return todos
      .map(todo => ({
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        createdAt: todo.createdAt,
        projectName: todo.projectId ? projectMap.get(todo.projectId) : undefined,
        goalName: todo.goalId ? goalMap.get(todo.goalId) : undefined,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50); // 최근 50개만
  }, [todos, projectMap, goalMap]);

  // 날짜별 그룹핑
  const groupedByDate = useMemo(() => {
    return timelineItems.reduce((acc, item) => {
      const date = item.createdAt;
      let dateKey: string;

      if (isToday(date)) {
        dateKey = '오늘';
      } else if (isYesterday(date)) {
        dateKey = '어제';
      } else {
        dateKey = format(date, 'M월 d일 (EEE)', { locale: ko });
      }

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(item);
      return acc;
    }, {} as Record<string, TimelineItem[]>);
  }, [timelineItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (timelineItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-base-content/60">
        <Clock className="w-12 h-12 mb-4 opacity-50" />
        <p>아직 기록이 없어요</p>
        <p className="text-sm">할일을 만들면 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, items]) => (
        <div key={dateKey}>
          {/* 날짜 헤더 */}
          <h3 className="text-sm font-semibold text-base-content/60 mb-3">
            {dateKey}
          </h3>

          {/* 타임라인 아이템들 */}
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-base-200 rounded-lg"
              >
                {/* 아이콘 */}
                <div className={`mt-0.5 ${
                  item.completed ? 'text-success' : 'text-info'
                }`}>
                  {item.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    item.completed ? 'line-through text-base-content/60' : ''
                  }`}>
                    {item.title}
                  </p>

                  {/* 맥락 배지 */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.goalName && (
                      <span className="badge badge-xs badge-ghost">
                        {item.goalName}
                      </span>
                    )}
                    {item.projectName && (
                      <span className="badge badge-xs badge-ghost">
                        {item.projectName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 시간 */}
                <span className="text-xs text-base-content/40">
                  {format(item.createdAt, 'HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
