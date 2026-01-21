'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: Avatar(상단 + 드롭다운) - 메인 네비게이션
 */
export default function ADHDSidebar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();

  // settings 제외한 메인 네비게이션 아이템
  const mainNavItems = navItems.filter(item => item.id !== 'settings');

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-base-200 border-r border-base-300 flex flex-col items-center py-4 z-30">
      {/* 상단: 사용자 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />

      {/* 중앙: 메인 네비게이션 */}
      <nav className="flex-1 flex flex-col items-center gap-2">
        {mainNavItems.map(item => (
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
    </aside>
  );
}
