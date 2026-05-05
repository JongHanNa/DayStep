'use client';

import { useRouter } from 'next/navigation';
import { useADHDStore, SettingsSubView } from '@/state/stores/adhdStore';
import { useAuth } from '@/app/context/AuthContext';
import type { ADHDSubViewId } from '@/lib/constants/adhd-screens';

/**
 * ADHD 라우트 타입
 */
export type ADHDRoute = {
  mode: 'home' | 'entry' | 'execute' | 'care' | 'relationship-insights' | 'project' | 'motivation' | 'settings';
  tab?: string;
};

/**
 * ADHD 모드 네비게이션 훅
 *
 * 웹: URL 기반 라우팅 (/adhd/motivation, /adhd/projects 등)
 */
export function useADHDNavigation() {
  const router = useRouter();
  const { user } = useAuth();

  /**
   * 특정 화면으로 직접 이동 (Flat 라우트 구조)
   * 웹: /adhd/{screenId} URL로 이동
   */
  const goScreen = (screenId: ADHDSubViewId) => {
    // 웹: Flat URL로 이동
    router.push(`/adhd/${screenId}`);
  };

  const navigate = (route: ADHDRoute) => {
    const { mode, tab } = route;

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
  };

  /**
   * 홈 목차로 이동
   */
  const goHome = () => navigate({ mode: 'home' });

  /**
   * 뒤로가기
   */
  const goBack = () => {
    // 웹: 브라우저 히스토리 사용
    router.back();
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
      goScreen('projects'); // 기본값
    }
  };

  /**
   * 원동력 모드로 이동 (레거시 - goScreen 사용 권장)
   */
  const goMotivation = (tab?: string) => {
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
    goMotivation,
    goRelationshipInsights,
    goSettings,
    goExecute,
    goCare,
  };
}
