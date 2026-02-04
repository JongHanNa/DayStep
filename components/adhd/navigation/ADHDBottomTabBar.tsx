'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';

/**
 * ADHD 모드 모바일용 하단 탭바
 *
 * md(768px) 미만에서만 표시
 * Safe Area 대응 포함
 * 구조: 홈 버튼 + 프로필 (2개만)
 */
export default function ADHDBottomTabBar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-base-200 border-t border-base-300 flex items-center justify-between px-4 z-30 safe-area-bottom">
      {/* 왼쪽 빈 공간 - 프로필과 동일 너비(40px)로 균형 맞춤 */}
      <div className="w-10" />

      {/* 중앙 홈 버튼 */}
      {navItems.map(item => (
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

      {/* 오른쪽 프로필 아바타 + 드롭다운 (설정/프리미엄/로그아웃/다크모드) */}
      <ADHDProfileMenu variant="tabbar" />
    </nav>
  );
}
