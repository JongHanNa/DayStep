'use client';

import { useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';

interface TodoStatsViewProps {
  userId: string;
}

/**
 * 통계 탭 - 완료율, 패턴 분석
 *
 * ADHD 관점:
 * - 성취감 시각화: 완료한 일들의 통계
 * - 패턴 인식: 언제 가장 생산적인지
 * - 목표별 진행률: 큰 그림 파악
 */
export function TodoStatsView({ userId }: TodoStatsViewProps) {
  const { todos, fetchAllTodos } = useTodoStore();
  const [isLoading, setIsLoading] = useState(true);

  // 목표 관련 기능 제거됨 - 빈 배열로 대체
  const goals: never[] = [];

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllTodos();
      setIsLoading(false);
    };
    loadData();
  }, [userId, fetchAllTodos]);

  // 이번 주 날짜 범위
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // 월요일 시작
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd });

  // 이번 주 생성된 할일 (완료된 것만 카운트)
  const thisWeekCompleted = useMemo(() => {
    return todos.filter(todo => {
      if (!todo.completed) return false;
      // createdAt이 이번 주에 포함되고 완료된 할일
      return isWithinInterval(todo.createdAt, { start: thisWeekStart, end: thisWeekEnd });
    });
  }, [todos, thisWeekStart, thisWeekEnd]);

  // 요일별 완료 수 (createdAt 기준)
  const dailyCompletionCount = useMemo(() => {
    return daysOfWeek.map(day => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      return thisWeekCompleted.filter(todo => {
        return isWithinInterval(todo.createdAt, { start: dayStart, end: dayEnd });
      }).length;
    });
  }, [thisWeekCompleted, daysOfWeek]);

  // 시간대별 완료 패턴 (24시간)
  const hourlyPattern = useMemo(() => {
    const pattern = Array(24).fill(0);
    thisWeekCompleted.forEach(todo => {
      const hour = todo.createdAt.getHours();
      pattern[hour]++;
    });
    return pattern;
  }, [thisWeekCompleted]);

  // 가장 생산적인 시간대 찾기
  const mostProductiveHour = useMemo(() => {
    const maxCount = Math.max(...hourlyPattern);
    if (maxCount === 0) return null;
    return hourlyPattern.indexOf(maxCount);
  }, [hourlyPattern]);

  // 목표별 진행률 - 목표 기능 제거됨
  const goalProgress: never[] = [];

  // 최대 일일 완료 수 (차트 스케일링용)
  const maxDailyCount = Math.max(...dailyCompletionCount, 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* 이번 주 요약 */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <span className="font-semibold">이번 주 성과</span>
        </div>
        <div className="text-3xl font-bold text-primary">
          {thisWeekCompleted.length}개
          <span className="text-base font-normal text-base-content/60 ml-2">완료</span>
        </div>
        {mostProductiveHour !== null && (
          <p className="text-sm text-base-content/60 mt-2">
            가장 생산적인 시간: <strong>{mostProductiveHour}시</strong>
          </p>
        )}
      </div>

      {/* 요일별 완료 차트 */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-info" />
          <span className="font-semibold">요일별 완료</span>
        </div>
        <div className="flex items-end justify-between gap-2 h-32">
          {daysOfWeek.map((day, index) => {
            const count = dailyCompletionCount[index];
            const height = count > 0 ? (count / maxDailyCount) * 100 : 8;
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative w-full flex justify-center">
                  {count > 0 && (
                    <span className="absolute -top-5 text-xs font-medium">
                      {count}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-8 rounded-t-lg transition-all ${
                      isToday ? 'bg-primary' : count > 0 ? 'bg-info' : 'bg-base-200'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className={`text-xs mt-2 ${isToday ? 'font-bold text-primary' : 'text-base-content/60'}`}>
                  {format(day, 'EEE', { locale: ko })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 시간대별 패턴 */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-warning" />
          <span className="font-semibold">시간대별 패턴</span>
        </div>
        <div className="flex gap-0.5 h-16">
          {hourlyPattern.map((count, hour) => {
            const maxCount = Math.max(...hourlyPattern, 1);
            const height = count > 0 ? (count / maxCount) * 100 : 5;
            const isProductiveHour = hour === mostProductiveHour;

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col justify-end"
                title={`${hour}시: ${count}개`}
              >
                <div
                  className={`w-full rounded-t transition-all ${
                    isProductiveHour ? 'bg-warning' : count > 0 ? 'bg-warning/40' : 'bg-base-200'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-base-content/40 mt-1">
          <span>0시</span>
          <span>6시</span>
          <span>12시</span>
          <span>18시</span>
          <span>24시</span>
        </div>
      </div>

      {/* 목표별 진행률 */}
      {goalProgress.length > 0 && (
        <div className="bg-base-100 rounded-xl border border-base-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-success" />
            <span className="font-semibold">목표별 진행률</span>
          </div>
          <div className="space-y-3">
            {goalProgress.slice(0, 5).map((goal: { id: string; title: string; completedTodos: number; totalTodos: number; progressRate: number }) => (
              <div key={goal.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="truncate flex-1">{goal.title}</span>
                  <span className="text-base-content/60">
                    {goal.completedTodos}/{goal.totalTodos} ({goal.progressRate}%)
                  </span>
                </div>
                <progress
                  className="progress progress-success w-full h-2"
                  value={goal.progressRate}
                  max="100"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 동기부여 메시지 */}
      {thisWeekCompleted.length > 0 && (
        <div className="text-center text-sm text-base-content/50 py-4">
          이번 주 {thisWeekCompleted.length}개를 완료했어요!
        </div>
      )}
    </div>
  );
}
