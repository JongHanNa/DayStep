'use client';

import { useRouter } from 'next/navigation';
import { useADHDStore, SettingsSubView } from '@/state/stores/adhdStore';
import { isCapacitorEnv } from '@/lib/utils/platform';
import { useAuth } from '@/app/context/AuthContext';

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
 * - 웹: URL 기반 라우팅 (/adhd/project?tab=ai-chat)
 * - Capacitor: Store 기반 (enterProjectMode)
 */
export function useADHDNavigation() {
  const router = useRouter();
  const { user } = useAuth();

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
      // 웹: URL + Store 동시 업데이트
      const store = useADHDStore.getState();

      if (mode === 'home') {
        // 홈은 루트 경로 - Store 초기화 필수 (사이드바 아이콘 상태 동기화)
        store.enterHomeMode();
        router.push('/');
      } else {
        // 서브탭이 있으면 /adhd/{mode}/{tab} 형식으로, 없으면 /adhd/{mode}
        const url = tab ? `/adhd/${mode}/${tab}` : `/adhd/${mode}`;
        router.push(url);
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
   * 대시보드로 이동
   */
  const goEntry = (tab?: string) => navigate({ mode: 'entry', tab });

  /**
   * 프로젝트 모드로 이동
   */
  const goProject = (tab?: string) => navigate({ mode: 'project', tab });

  /**
   * 원동력 모드로 이동
   */
  const goFuel = (tab?: string) => navigate({ mode: 'fuel', tab });

  /**
   * 관계 인사이트로 이동
   */
  const goRelationshipInsights = (tab?: string) => navigate({ mode: 'relationship-insights', tab });

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
