'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';

/**
 * ADHD 모드 모바일용 하단 탭바
 *
 * md(768px) 미만에서만 표시
 * Safe Area 대응 포함
 */
export default function ADHDBottomTabBar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();

  const mainNavItems = navItems.filter(item => item.id !== 'settings');

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-base-200 border-t border-base-300 flex items-center z-30 safe-area-bottom">
      {mainNavItems.map(item => (
        <ADHDNavItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={activeTab === item.id}
          onClick={() => handleNavClick(item.id)}
          variant="tabbar"
        />
      ))}
      {/* 프로필 아바타 + 드롭다운 (설정/프리미엄/로그아웃/다크모드) */}
      <ADHDProfileMenu variant="tabbar" />
    </nav>
  );
}
