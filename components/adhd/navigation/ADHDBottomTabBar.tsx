'use client';

import ADHDNavItem from './ADHDNavItem';
import { useADHDNavigation } from './useADHDNavigation';
import ADHDProfileMenu from './ADHDProfileMenu';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { SUBVIEW_CONFIG } from './subviewConfig';

/**
 * ADHD 모드 모바일용 하단 탭바
 *
 * md(768px) 미만에서만 표시
 * Safe Area 대응 포함
 * 구조: 홈 버튼 - 서브뷰 아이콘(또는 빈 공간) - 프로필
 */
export default function ADHDBottomTabBar() {
  const { navItems, activeTab, handleNavClick } = useADHDNavigation();
  const currentSubView = useADHDModeStore((state) => state.currentSubView);
  const subViewConfig = currentSubView ? SUBVIEW_CONFIG[currentSubView] : null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-base-200 border-t border-base-300 flex items-center px-4 z-30 safe-area-bottom">
      {/* 왼쪽 영역: 홈 버튼 */}
      <div className="flex-1 flex justify-start">
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
      </div>

      {/* 중앙 영역: 서브뷰 아이콘 또는 빈 공간 */}
      <div className="flex-1 flex justify-center">
        {subViewConfig ? (
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-content">
            <subViewConfig.icon className="w-5 h-5" />
          </div>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* 오른쪽 영역: 프로필 아바타 + 드롭다운 */}
      <div className="flex-1 flex justify-end">
        <ADHDProfileMenu variant="tabbar" />
      </div>
    </nav>
  );
}
