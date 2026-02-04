'use client';

import { Home, Menu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: 홈 아이콘(상단, 고정) - 햄버거/서브뷰 아이콘(중앙) - 프로필(하단)
 *
 * 활성화 로직:
 * - 상단: 항상 홈 아이콘 (고정, 비활성화 상태)
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
      {/* 상단: 홈 아이콘 (항상 고정, 비활성화 상태) */}
      <button
        onClick={enterHomeMode}
        className="w-12 h-12 flex items-center justify-center rounded-xl relative group transition-all duration-200 text-base-content/60 hover:bg-base-300"
        aria-label="홈"
      >
        <Home className="w-6 h-6" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 text-base-content rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          홈
        </span>
      </button>

      {/* 중앙: 햄버거 또는 서브뷰 아이콘 (항상 활성화) */}
      <div className="mt-2">
        <button
          onClick={enterHomeMode}
          className="w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 bg-primary text-primary-content"
          aria-label={centerLabel}
        >
          <CenterIcon className="w-6 h-6" />
        </button>
      </div>

      {/* 빈 공간 */}
      <div className="flex-1" />

      {/* 하단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />
    </aside>
  );
}
