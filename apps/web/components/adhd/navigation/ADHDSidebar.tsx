'use client';

import { Calendar, SquareMenu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: 프로필(최상단) - 달력 - 목차+배지 - 빈 공간
 *
 * 배지 로직:
 * - 목차 화면(null): 목차 아이콘 활성, 배지 없음
 * - timeline: 달력 아이콘 활성, 목차 비활성, 배지 없음
 * - 기타 화면: 목차 아이콘 활성 + 해당 화면 아이콘 배지 표시
 */
export default function ADHDSidebar() {
  const currentSubView = useADHDStore((state) => state.currentSubView);
  const { goHome, goScreen } = useADHDNavigation();

  // timeline/daily-planner는 고정 Calendar 버튼이 있으므로 배지에서 제외
  const effectiveSubView = currentSubView === 'timeline' || currentSubView === 'daily-planner' ? null : currentSubView;

  // 배지 아이콘: effectiveSubView가 있으면 해당 화면 아이콘
  const BadgeIcon = effectiveSubView ? SUBVIEW_CONFIG[effectiveSubView]?.icon : null;

  return (
    <aside className="adhd-sidebar fixed left-0 top-0 h-full w-16 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 z-30">
      {/* 최상단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />

      {/* 달력 (Calendar 아이콘) */}
      <button
        onClick={() => goScreen('daily-planner')}
        className={`mt-2 w-12 h-12 flex items-center justify-center rounded-xl relative group transition-all duration-200 ${
          currentSubView === 'timeline' || currentSubView === 'daily-planner'
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/20'
            : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        aria-label="달력"
      >
        <Calendar className="w-8 h-8" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          달력
        </span>
      </button>

      {/* 목차 (SquareMenu) + 배지 */}
      <div className="mt-2">
        <button
          onClick={goHome}
          className="group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 relative hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="목차"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            currentSubView === null || effectiveSubView
              ? 'bg-indigo-50 dark:bg-indigo-500/20'
              : ''
          }`}>
            <SquareMenu className={`w-8 h-8 ${
              currentSubView === null || effectiveSubView
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 dark:text-gray-600'
            }`} />
          </div>

          {/* 배지: 서브뷰 화면일 때만 표시 */}
          {BadgeIcon && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#1a1a1a] shadow-sm">
              <BadgeIcon className="w-3 h-3 text-white" />
            </span>
          )}

          {/* 툴팁 */}
          <span className="absolute left-full ml-2 px-3 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            목차
          </span>
        </button>
      </div>

      {/* 빈 공간 */}
      <div className="flex-1" />
    </aside>
  );
}
