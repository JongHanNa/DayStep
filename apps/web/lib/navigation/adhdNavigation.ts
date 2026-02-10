'use client';

import { useRouter } from 'next/navigation';
import { useADHDStore, SettingsSubView } from '@/state/stores/adhdStore';
import { isCapacitorEnv } from '@/lib/utils/platform';
import { useAuth } from '@/app/context/AuthContext';
import type { ADHDSubViewId } from '@/lib/constants/adhd-screens';

/**
 * ADHD 라우트 타입
 */
export type ADHDRoute = {
  mode: 'home' | 'entry' | 'execute' | 'organize' | 'care' | 'relationship-insights' | 'project' | 'fuel' | 'settings';
  tab?: string;
};

/**
 * ADHD 모드 네비게이션 훅
 *
 * 환경별 분기:
 * - 웹: URL 기반 라우팅 (/adhd/motivation, /adhd/ai-plan 등)
 * - Capacitor: Store 기반 (enterProjectMode 등)
 */
export function useADHDNavigation() {
  const router = useRouter();
  const { user } = useAuth();

  /**
   * 특정 화면으로 직접 이동 (Flat 라우트 구조)
   * 웹: /adhd/{screenId} URL로 이동
   * Capacitor: Store 상태 업데이트
   */
  const goScreen = (screenId: ADHDSubViewId) => {
    const userId = user?.id;

    if (isCapacitorEnv()) {
      // Capacitor: Store 기반 네비게이션
      const store = useADHDStore.getState();

      // screenId에 따라 적절한 모드 진입
      switch (screenId) {
        case 'motivation':
        case 'timeline':
        case 'daily-planner':
        case 'execute':
        case 'organize':
          if (userId) store.enterFuelMode(userId, undefined, screenId);
          break;
        case 'record':
        case 'news':
        case 'gratitude':
          if (userId) store.enterRelationshipInsightsMode(userId, screenId);
          break;
        case 'ai-plan':
        case 'ai-chat':
        case 'guide':
          if (userId) store.enterProjectMode(userId, screenId);
          break;
        case 'banner':
        case 'contact':
        case 'activity':
          store.enterEntryMode(screenId);
          break;
      }
    } else {
      // 웹: Flat URL로 이동
      router.push(`/adhd/${screenId}`);
    }
  };

  const navigate = (route: ADHDRoute) => {
    const { mode, tab } = route;
    const userId = user?.id;

    if (isCapacitorEnv()) {
      // Capacitor: Store 기반 네비게이션
      const store = useADHDStore.getState();

      switch (mode) {
        case 'home':
          store.enterHomeMode();
          break;
        case 'entry':
          store.enterEntryMode(tab);
          break;
        case 'project':
          if (userId) store.enterProjectMode(userId, tab);
          break;
        case 'fuel':
          if (userId) store.enterFuelMode(userId, undefined, tab);
          break;
        case 'relationship-insights':
          if (userId) store.enterRelationshipInsightsMode(userId, tab);
          break;
        case 'settings':
          store.enterSettingsMode((tab as SettingsSubView) || 'main');
          break;
        case 'execute':
          if (userId) store.enterExecuteMode(userId);
          break;
        case 'organize':
          store.enterOrganizeMode();
          break;
        case 'care':
          if (userId) store.enterCareMode(userId);
          break;
      }
    } else {
      // 웹: Flat URL 구조 사용
      const store = useADHDStore.getState();

      if (mode === 'home') {
        // 홈은 루트 경로 - Store 초기화 필수 (사이드바 아이콘 상태 동기화)
        store.enterHomeMode();
        router.push('/');
      } else if (tab) {
        // 서브탭이 있으면 Flat URL로 이동
        router.push(`/adhd/${tab}`);
      } else {
        // 모드만 있으면 /adhd/{mode}
        router.push(`/adhd/${mode}`);
      }
    }
  };

  /**
   * 홈 목차로 이동
   */
  const goHome = () => navigate({ mode: 'home' });

  /**
   * 뒤로가기
   */
  const goBack = () => {
    if (isCapacitorEnv()) {
      // Capacitor: 홈으로 이동
      useADHDStore.getState().enterHomeMode();
    } else {
      // 웹: 브라우저 히스토리 사용
      router.back();
    }
  };

  /**
   * 대시보드로 이동 (레거시 - goScreen 사용 권장)
   */
  const goEntry = (tab?: string) => {
    if (tab) {
      goScreen(tab as ADHDSubViewId);
    } else {
      navigate({ mode: 'entry' });
    }
  };

  /**
   * 프로젝트 모드로 이동 (레거시 - goScreen 사용 권장)
   */
  const goProject = (tab?: string) => {
    if (tab) {
      goScreen(tab as ADHDSubViewId);
    } else {
      goScreen('ai-plan'); // 기본값
    }
  };

  /**
   * 원동력 모드로 이동 (레거시 - goScreen 사용 권장)
   */
  const goFuel = (tab?: string) => {
    if (tab) {
      goScreen(tab as ADHDSubViewId);
    } else {
      goScreen('motivation'); // 기본값
    }
  };

  /**
   * 관계 인사이트로 이동 (레거시 - goScreen 사용 권장)
   */
  const goRelationshipInsights = (tab?: string) => {
    if (tab) {
      goScreen(tab as ADHDSubViewId);
    } else {
      goScreen('record'); // 기본값
    }
  };

  /**
   * 설정으로 이동
   */
  const goSettings = (tab?: string) => navigate({ mode: 'settings', tab });

  /**
   * 실행 모드로 이동
   */
  const goExecute = () => navigate({ mode: 'execute' });

  /**
   * 정리 모드로 이동
   */
  const goOrganize = () => navigate({ mode: 'organize' });

  /**
   * 마음 전해보기로 이동
   */
  const goCare = () => navigate({ mode: 'care' });

  return {
    navigate,
    goScreen,
    goHome,
    goBack,
    goEntry,
    goProject,
    goFuel,
    goRelationshipInsights,
    goSettings,
    goExecute,
    goOrganize,
    goCare,
  };
}
