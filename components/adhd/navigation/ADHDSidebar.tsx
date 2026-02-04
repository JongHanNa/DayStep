'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: 홈 버튼(상단) - 서브뷰 아이콘(있을 때만) - 빈 공간 - 프로필(하단)
 */
export default function ADHDSidebar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();
  const currentSubView = useADHDModeStore((state) => state.currentSubView);
  const subViewConfig = currentSubView ? SUBVIEW_CONFIG[currentSubView] : null;

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 상단: 홈 버튼 */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map(item => (
          <ADHDNavItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeTab === item.id}
            onClick={() => handleNavClick(item.id)}
            variant="sidebar"
          />
        ))}
      </nav>

      {/* 서브뷰 아이콘 (currentSubView가 있을 때만 표시) */}
      {subViewConfig && (
        <div className="mt-2 flex flex-col items-center">
          <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary text-primary-content relative group">
            <subViewConfig.icon className="w-6 h-6" />
            {/* 툴팁 */}
            <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-base-300 text-base-content rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              {subViewConfig.label}
            </span>
          </div>
        </div>
      )}

      {/* 중앙: 빈 공간 */}
      <div className="flex-1" />

      {/* 하단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />
    </aside>
  );
}
