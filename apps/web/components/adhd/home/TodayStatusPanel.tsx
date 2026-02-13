'use client';

import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { useTodoStore } from '@/state/stores/todoStore';

interface TodayStatusPanelProps {
  variant?: 'desktop' | 'mobile';
}

/**
 * 오늘의 현황 패널
 * - variant="desktop" (lg+): 우측 사이드 패널 (완료/남음 + 프로그레스 바 + 최근 완료 목록)
 * - variant="mobile" (lg 미만): 간소화 카드 (프로그레스 바만)
 */
export default function TodayStatusPanel({ variant = 'desktop' }: TodayStatusPanelProps) {
  const stats = useTodoStore((s) => s.stats);
  const getRecentlyCompletedTodos = useTodoStore((s) => s.getRecentlyCompletedTodos);

  const completed = stats.completedCount;
  const pending = stats.pendingCount;
  const total = stats.totalCount;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (variant === 'mobile') {
    return (
      <div className="lg:hidden rounded-2xl bg-white dark:bg-[#242424] p-4 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              오늘의 현황
            </span>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {rate}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>
    );
  }

  const recentDone = getRecentlyCompletedTodos(3);

  return (
    <aside className="hidden lg:block w-80 xl:w-96 flex-shrink-0 p-6 lg:p-8">
      <div className="sticky top-8 rounded-2xl bg-white dark:bg-[#242424] p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-indigo-500" />
          <span className="text-base font-bold text-gray-900 dark:text-white">
            오늘의 현황
          </span>
        </div>

        {/* 완료 / 남음 카운터 */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700 mb-4">
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">
              {completed}
            </p>
            <p className="text-sm text-gray-400 mt-1">완료</p>
          </div>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-gray-700 dark:text-gray-300">
              {pending}
            </p>
            <p className="text-sm text-gray-400 mt-1">남음</p>
          </div>
        </div>

        {/* 프로그레스 바 */}
        <div className="mb-4">
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-right">{rate}% 완료</p>
        </div>

        {/* 구분선 + 최근 완료 */}
        {recentDone.length > 0 && (
          <>
            <div className="border-t border-gray-100 dark:border-gray-700 my-3" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              최근 완료
            </p>
            <ul className="space-y-2">
              {recentDone.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{todo.title}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  );
}
