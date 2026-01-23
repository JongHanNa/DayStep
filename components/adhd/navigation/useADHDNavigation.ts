'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';

export type NavItemId = 'home' | 'relationship' | 'fuel' | 'project' | 'settings';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: string; // lucide icon name
}

export const navItems: NavItem[] = [
  { id: 'home', label: '대시보드', icon: 'Home' },
  { id: 'relationship', label: '관계 기록', icon: 'BookHeart' },
  { id: 'fuel', label: '머릿속 정리', icon: 'Lightbulb' },
  { id: 'project', label: '프로젝트', icon: 'FolderKanban' },
  { id: 'settings', label: '설정', icon: 'Settings' },
];

/**
 * ADHD 모드 네비게이션 로직 훅
 *
 * 사이드바(웹)와 하단탭(모바일)에서 공통으로 사용하는 네비게이션 로직 제공
 * URL 변경 없이 currentMode 상태로 모든 탭 전환 처리
 */
export function useADHDNavigation() {
  const { user } = useAuth();
  const { currentMode, enterEntryMode, enterRelationshipInsightsMode, enterFuelMode, enterProjectMode, enterSettingsMode } = useADHDModeStore();

  /**
   * 현재 모드에 따른 활성 탭 결정
   * - URL 기반이 아닌 currentMode 상태만으로 결정
   */
  const getActiveTab = (mode: ADHDMode): NavItemId => {
    switch (mode) {
      case 'relationship-insights':
        return 'relationship';
      case 'fuel':
        return 'fuel';
      case 'project':
        return 'project';
      case 'settings':
        return 'settings';
      case 'entry':
      case 'execute':
      case 'organize':
      case 'care':
      default:
        return 'home';
    }
  };

  const activeTab = getActiveTab(currentMode);

  /**
   * 네비게이션 아이템 클릭 핸들러
   * - URL 변경 없이 상태만 변경
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
      case 'project':
        if (user?.id) {
          enterProjectMode(user.id);
        }
        break;
      case 'settings':
        enterSettingsMode('main');
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
