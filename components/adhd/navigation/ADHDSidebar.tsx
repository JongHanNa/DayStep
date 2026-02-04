'use client';

import { Home, Menu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: 프로필(최상단) - 홈 아이콘 - 햄버거/서브뷰 아이콘 - 빈 공간
 *
 * 활성화 로직:
 * - 최상단: 프로필 아바타 + 드롭다운
 * - 홈: 항상 홈 아이콘 (고정, 비활성화 상태)
 * - 중앙: 목차 화면이면 햄버거, 서브뷰 화면이면 서브뷰 아이콘 (항상 활성화)
 */
export default function ADHDSidebar() {
  const currentSubView = useADHDModeStore((state) => state.currentSubView);
  const enterHomeMode = useADHDModeStore((state) => state.enterHomeMode);

  // 중앙 아이콘 결정: 서브뷰면 해당 아이콘, 목차면 Menu
  const CenterIcon = currentSubView
    ? SUBVIEW_CONFIG[currentSubView]?.icon || Menu
    : Menu;
  const centerLabel = currentSubView
    ? SUBVIEW_CONFIG[currentSubView]?.label || '목차'
    : '목차';

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 최상단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />

      {/* 홈 아이콘 (고정, 비활성화 상태) */}
      <button
        onClick={enterHomeMode}
        className="mt-2 w-12 h-12 flex items-center justify-center rounded-xl relative group transition-all duration-200 text-base-content/60 hover:bg-base-300"
        aria-label="홈"
      >
        <Home className="w-6 h-6" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 text-base-content rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          홈
        </span>
      </button>

      {/* 햄버거 또는 서브뷰 아이콘 (항상 활성화) */}
      <div className="mt-2">
        <button
          onClick={enterHomeMode}
          className="group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-base-300"
          aria-label={centerLabel}
        >
          {currentSubView ? (
            <div className="w-8 h-8 bg-white group-hover:bg-base-300 rounded-lg flex items-center justify-center transition-colors">
              <CenterIcon className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-white group-hover:bg-base-300 rounded-lg flex items-center justify-center transition-colors">
              <div className="grid grid-cols-3 gap-1">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-primary rounded-full" />
                ))}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* 빈 공간 */}
      <div className="flex-1" />
    </aside>
  );
}
