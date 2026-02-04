'use client';

import { useState } from 'react';
import { Home, Menu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
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
 *
 * 환경별 분기:
 * - 웹: URL 기반 라우팅 (/adhd)
 * - Capacitor: Store 기반 (enterHomeMode)
 */
export default function ADHDBottomTabBar() {
  const currentSubView = useADHDModeStore((state) => state.currentSubView);
  const { goHome } = useADHDNavigation();
  const [showLabel, setShowLabel] = useState(false);

  // 중앙 버튼 클릭 핸들러
  const handleCenterClick = () => {
    // 화면 이름 표시 (서브뷰든 목차든)
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1500);

    // 목차일 때만 홈으로 이동
    if (!currentSubView) {
      goHome();
    }
  };

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
          onClick={goHome}
          className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 text-base-content/60 active:bg-base-300"
          aria-label="홈"
        >
          <Home className="w-7 h-7" />
        </button>
      </div>

      {/* 중앙 영역: 햄버거 또는 서브뷰 아이콘 (항상 활성화) */}
      <div className="flex-1 flex justify-center relative">
        <button
          onClick={handleCenterClick}
          className={`group w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
            currentSubView ? '' : 'active:bg-base-300'
          }`}
          aria-label={centerLabel}
        >
          {currentSubView ? (
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <CenterIcon className="w-7 h-7 text-primary" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-white group-hover:bg-base-300 rounded-lg flex items-center justify-center transition-colors">
              <div className="grid grid-cols-3 gap-0.5">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 bg-primary rounded-full" />
                ))}
              </div>
            </div>
          )}
        </button>
        {/* 터치 시 화면 이름 표시 */}
        {showLabel && (
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-lg whitespace-nowrap animate-fade-in">
            {centerLabel}
          </span>
        )}
      </div>

      {/* 오른쪽 영역: 프로필 아바타 + 드롭다운 */}
      <div className="flex-1 flex justify-end">
        <ADHDProfileMenu variant="tabbar" />
      </div>
    </nav>
  );
}
