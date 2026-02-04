'use client';

import { Home, Menu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 모바일용 하단 탭바
 *
 * md(768px) 미만에서만 표시
 * Safe Area 대응 포함
 * 구조: 홈 아이콘(고정) - 햄버거/서브뷰 아이콘 - 프로필
 *
 * 활성화 로직:
 * - 왼쪽: 항상 홈 아이콘 (고정, 비활성화 상태)
 * - 중앙: 목차 화면이면 햄버거, 서브뷰 화면이면 서브뷰 아이콘 (항상 활성화)
 */
export default function ADHDBottomTabBar() {
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
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-base-200 border-t border-base-300 flex items-center px-4 z-30 safe-area-bottom">
      {/* 왼쪽 영역: 홈 아이콘 (항상 고정, 비활성화 상태) */}
      <div className="flex-1 flex justify-start">
        <button
          onClick={enterHomeMode}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-base-content/60 active:bg-base-300"
          aria-label="홈"
        >
          <Home className="w-5 h-5" />
        </button>
      </div>

      {/* 중앙 영역: 햄버거 또는 서브뷰 아이콘 (항상 활성화) */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={enterHomeMode}
          className="group w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 active:bg-base-300"
          aria-label={centerLabel}
        >
          {currentSubView ? (
            <div className="w-7 h-7 bg-white group-hover:bg-base-300 rounded-lg flex items-center justify-center transition-colors">
              <CenterIcon className="w-4 h-4 text-primary" />
            </div>
          ) : (
            <div className="w-7 h-7 bg-white group-hover:bg-base-300 rounded-lg flex items-center justify-center transition-colors">
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-primary rounded-full" />
                ))}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* 오른쪽 영역: 프로필 아바타 + 드롭다운 */}
      <div className="flex-1 flex justify-end">
        <ADHDProfileMenu variant="tabbar" />
      </div>
    </nav>
  );
}
