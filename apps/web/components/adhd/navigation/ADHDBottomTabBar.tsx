'use client';

import { useState } from 'react';
import { Calendar, SquareMenu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 모바일용 하단 탭바
 *
 * md(768px) 미만에서만 표시
 * Safe Area 대응 포함
 * 구조: 달력 - 목차+배지 - 프로필
 *
 * 배지 로직:
 * - 목차 화면(null): 목차 아이콘 활성, 배지 없음
 * - timeline: 달력 아이콘 활성, 목차 비활성, 배지 없음
 * - 기타 화면: 목차 아이콘 활성 + 해당 화면 아이콘 배지 표시
 */
export default function ADHDBottomTabBar() {
  const currentSubView = useADHDStore((state) => state.currentSubView);
  const { goHome, goScreen } = useADHDNavigation();
  const [showLabel, setShowLabel] = useState(false);

  // timeline/daily-planner는 고정 Calendar 버튼이 있으므로 배지에서 제외
  const effectiveSubView = currentSubView === 'timeline' || currentSubView === 'daily-planner' ? null : currentSubView;

  // 배지 아이콘: effectiveSubView가 있으면 해당 화면 아이콘
  const BadgeIcon = effectiveSubView ? SUBVIEW_CONFIG[effectiveSubView]?.icon : null;

  // 중앙 버튼 클릭 핸들러: 항상 goHome() 호출
  const handleCenterClick = () => {
    setShowLabel(true);
    setTimeout(() => setShowLabel(false), 1500);
    goHome();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-base-200 border-t border-base-300 flex items-center px-4 z-30 safe-area-bottom">
      {/* 달력 (Calendar 아이콘) */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={() => goScreen('timeline')}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${
            currentSubView === 'timeline' || currentSubView === 'daily-planner'
              ? 'text-primary bg-primary/10'
              : 'text-base-content/60 active:bg-base-300'
          }`}
          aria-label="달력"
        >
          <Calendar className="w-7 h-7" />
        </button>
      </div>

      {/* 목차 (SquareMenu) + 배지 */}
      <div className="flex-1 flex justify-center relative">
        <button
          onClick={handleCenterClick}
          className="group w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 active:bg-base-300 relative"
          aria-label="목차"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            currentSubView === null || effectiveSubView
              ? 'bg-white'
              : ''
          }`}>
            <SquareMenu className={`w-7 h-7 ${
              currentSubView === null || effectiveSubView
                ? 'text-primary'
                : 'text-base-content/40'
            }`} />
          </div>

          {/* 배지: 서브뷰 화면일 때만 표시 */}
          {BadgeIcon && (
            <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-primary rounded-full flex items-center justify-center ring-2 ring-base-200 shadow-sm">
              <BadgeIcon className="w-2.5 h-2.5 text-white" />
            </span>
          )}
        </button>
        {/* 터치 시 화면 이름 표시 */}
        {showLabel && (
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 text-sm font-medium bg-base-300 text-base-content rounded-lg whitespace-nowrap animate-fade-in">
            목차
          </span>
        )}
      </div>

      {/* 프로필 아바타 + 드롭다운 */}
      <div className="flex-1 flex justify-center">
        <ADHDProfileMenu variant="tabbar" />
      </div>
    </nav>
  );
}
