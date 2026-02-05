'use client';

import { Home, Menu, Clock, SquareMenu } from 'lucide-react';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
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
 *
 * 환경별 분기:
 * - 웹: URL 기반 라우팅 (/adhd)
 * - Capacitor: Store 기반 (enterHomeMode)
 */
export default function ADHDSidebar() {
  const currentSubView = useADHDStore((state) => state.currentSubView);
  const { goHome, goScreen } = useADHDNavigation();

  // timeline은 고정 Clock 버튼이 있으므로 서브뷰 아이콘 영역에서 제외
  const effectiveSubView = currentSubView === 'timeline' ? null : currentSubView;

  // 중앙 아이콘 결정: 서브뷰면 해당 아이콘, 목차면 Menu
  const CenterIcon = effectiveSubView
    ? SUBVIEW_CONFIG[effectiveSubView]?.icon || Menu
    : Menu;
  const centerLabel = effectiveSubView
    ? SUBVIEW_CONFIG[effectiveSubView]?.label || '목차'
    : '목차';

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 최상단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />

      {/* 하루 돌아보기 (Clock 아이콘) */}
      <button
        onClick={() => goScreen('timeline')}
        className={`mt-2 w-12 h-12 flex items-center justify-center rounded-xl relative group transition-all duration-200 ${
          currentSubView === 'timeline'
            ? 'text-primary bg-primary/10'
            : 'text-base-content/60 hover:bg-base-300'
        }`}
        aria-label="하루 돌아보기"
      >
        <Clock className="w-8 h-8" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 text-base-content rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          하루 돌아보기
        </span>
      </button>

      {/* 홈 아이콘 (고정, 비활성화 상태) */}
      <button
        onClick={goHome}
        className="mt-2 w-12 h-12 flex items-center justify-center rounded-xl relative group transition-all duration-200 text-base-content/60 hover:bg-base-300"
        aria-label="홈"
      >
        <Home className="w-8 h-8" />
        {/* 툴팁 */}
        <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 text-base-content rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          홈
        </span>
      </button>

      {/* 햄버거 또는 서브뷰 아이콘 (항상 활성화) */}
      <div className="mt-2">
        <button
          onClick={effectiveSubView ? undefined : goHome}
          className={`group w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 relative ${
            effectiveSubView ? 'cursor-default' : 'hover:bg-base-300'
          }`}
          aria-label={centerLabel}
        >
          {effectiveSubView ? (
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <CenterIcon className="w-8 h-8 text-primary" />
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              currentSubView === null
                ? 'bg-white group-hover:bg-base-300'
                : 'group-hover:bg-base-300'
            }`}>
              <SquareMenu className={`w-8 h-8 ${
                currentSubView === null ? 'text-primary' : 'text-base-content/40'
              }`} />
            </div>
          )}
          {/* 툴팁: 서브뷰면 화면 이름, 목차면 "목차" */}
          <span className="absolute left-full ml-2 px-3 py-1.5 text-sm font-medium bg-base-300 text-base-content rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {centerLabel}
          </span>
        </button>
      </div>

      {/* 빈 공간 */}
      <div className="flex-1" />
    </aside>
  );
}
