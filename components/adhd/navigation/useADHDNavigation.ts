'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';

export type NavItemId = 'home' | 'relationship' | 'fuel' | 'settings';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: string; // lucide icon name
}

export const navItems: NavItem[] = [
  { id: 'home', label: '홈', icon: 'Home' },
  { id: 'relationship', label: '관계 기록', icon: 'BookHeart' },
  { id: 'fuel', label: '머릿속 정리', icon: 'Lightbulb' },
  { id: 'settings', label: '설정', icon: 'Settings' },
];

/**
 * ADHD 모드 네비게이션 로직 훅
 *
 * 사이드바(웹)와 하단탭(모바일)에서 공통으로 사용하는 네비게이션 로직 제공
 */
export function useADHDNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentMode, enterEntryMode, enterRelationshipInsightsMode, enterFuelMode } = useADHDModeStore();

  /**
   * 현재 모드 또는 경로에 따른 활성 탭 결정
   * - /settings 경로에서는 settings 탭 활성화
   * - 그 외에는 현재 모드에 따라 활성 탭 결정
   */
  const getActiveTab = (mode: ADHDMode, currentPathname: string): NavItemId => {
    // settings 경로에서는 settings 탭 활성화
    if (currentPathname.startsWith('/settings')) {
      return 'settings';
    }

    switch (mode) {
      case 'relationship-insights':
        return 'relationship';
      case 'fuel':
        return 'fuel';
      case 'entry':
      case 'execute':
      case 'organize':
      case 'care':
      default:
        return 'home';
    }
  };

  const activeTab = getActiveTab(currentMode, pathname);

  /**
   * 네비게이션 아이템 클릭 핸들러
   */
  const handleNavClick = (itemId: NavItemId) => {
    switch (itemId) {
      case 'home':
        enterEntryMode();
        break;
      case 'relationship':
        if (user?.id) {
          enterRelationshipInsightsMode(user.id);
        }
        break;
      case 'fuel':
        if (user?.id) {
          enterFuelMode(user.id);
        }
        break;
      case 'settings':
        router.push('/settings');
        break;
    }
  };

  return {
    navItems,
    activeTab,
    handleNavClick,
    currentMode,
    userId: user?.id,
  };
}
