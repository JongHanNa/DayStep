'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore, ADHDScreen } from '@/state/stores/adhdStore';

export type NavItemId = 'home';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: string; // lucide icon name
}

// 간소화된 네비게이션: 홈 버튼만 (프로필은 별도 컴포넌트)
export const navItems: NavItem[] = [
  { id: 'home', label: '홈', icon: 'Home' },
];

/**
 * ADHD 모드 네비게이션 로직 훅
 *
 * 사이드바(웹)와 하단탭(모바일)에서 공통으로 사용하는 네비게이션 로직 제공
 * URL 변경 없이 currentMode 상태로 모든 탭 전환 처리
 */
export function useADHDNavigation() {
  const { user } = useAuth();
  const { currentMode, enterHomeMode } = useADHDStore();

  /**
   * 현재 모드에 따른 활성 탭 결정
   * - home 모드일 때만 home 활성화
   */
  const getActiveTab = (mode: ADHDScreen): NavItemId | null => {
    if (mode === 'home' || mode === null) {
      return 'home';
    }
    return null;
  };

  const activeTab = getActiveTab(currentMode);

  /**
   * 네비게이션 아이템 클릭 핸들러
   * - 홈 버튼 클릭 시 목차 화면으로 이동
   */
  const handleNavClick = (itemId: NavItemId) => {
    if (itemId === 'home') {
      enterHomeMode();
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
