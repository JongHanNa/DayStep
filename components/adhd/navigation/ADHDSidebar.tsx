'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';

/**
 * ADHD 모드 웹용 좌측 사이드바
 *
 * md(768px) 이상에서만 표시
 * 구조: 홈 버튼(상단) - 빈 공간 - 프로필(하단)
 */
export default function ADHDSidebar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();

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

      {/* 중앙: 빈 공간 */}
      <div className="flex-1" />

      {/* 하단: 프로필 아바타 + 드롭다운 */}
      <ADHDProfileMenu variant="sidebar" />
    </aside>
  );
}
