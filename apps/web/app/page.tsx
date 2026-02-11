'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LandingPage from './landing/page';
import FocusExecutionContainer from '@/components/adhd/containers/FocusExecutionContainer';
import { OrganizeScreen } from '@/components/adhd/screens/organize';
import RelationshipRecordContainer from '@/components/adhd/containers/RelationshipRecordContainer';
import { GenericTabContainer } from '@/components/adhd/containers/GenericTabContainer';
import { ADHDSidebar, ADHDBottomTabBar } from '@/components/adhd/navigation';
import { SettingsContainer } from '@/components/adhd/settings';
import HomeTableOfContents from '@/components/adhd/HomeTableOfContents';
import ADHDEntryScreen from '@/components/adhd/ADHDEntryScreen';
import { useADHDStore } from '@/state/stores/adhdStore';
import { isCapacitorEnv, isElectronEnv } from '@/lib/utils/platform';
import type { ADHDSubViewId } from '@/lib/constants/adhd-screens';

// 라우트 그룹별 screenIds (ROUTE_GROUPS에서 파생)
const FUEL_SCREEN_IDS: ADHDSubViewId[] = ['motivation', 'timeline', 'daily-planner', 'execute', 'organize'];
const RELATIONSHIP_SCREEN_IDS: ADHDSubViewId[] = ['record', 'news', 'gratitude'];
const PROJECT_SCREEN_IDS: ADHDSubViewId[] = ['ai-plan', 'ai-chat', 'guide'];

/**
 * 루트 페이지 (/)
 *
 * 라우팅 흐름:
 * - 웹 + 인증됨: 홈 목차 직접 표시 (리다이렉트 없음)
 * - Capacitor + 인증됨: 기존 Store 기반 방식 유지
 * - 비인증 + 웹: LandingPage 직접 렌더링 (URL '/' 유지)
 * - 비인증 + Capacitor: /login으로 리다이렉트
 */
export default function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ADHD 스토어
  const { currentMode, previousMode, enterHomeMode, enterEntryMode, enterExecuteMode, enterCareMode, enterRelationshipInsightsMode, enterFuelMode, enterProjectMode, exitMode } = useADHDStore();

  const [isElectron, setIsElectron] = useState(false);

  // 하이드레이션 완료 후 환경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCapacitor(isCapacitorEnv());
      setIsElectron(isElectronEnv());
      setMounted(true);
    }
  }, []);

  // Capacitor/Electron 비인증 사용자 리다이렉트
  useEffect(() => {
    if (loading || !mounted) {
      return;
    }

    if (!isAuthenticated && (isCapacitor || isElectron)) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isCapacitor, isElectron, mounted, router]);


  // 로딩 중
  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  // Capacitor/Electron 비인증: 리다이렉트 중 로딩 표시
  if (!isAuthenticated && (isCapacitor || isElectron)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  // 웹 비인증: LandingPage 직접 렌더링 (URL '/' 유지)
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // 웹 + 인증됨: 홈 목차 직접 표시 (리다이렉트 없음)
  if (!isCapacitor) {
    return (
      <div className="flex min-h-screen">
        {/* 웹 사이드바 (md 이상) */}
        <div className="hidden md:block">
          <ADHDSidebar />
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
          <HomeTableOfContents />
        </main>

        {/* 모바일 하단탭 (md 미만) */}
        <div className="md:hidden">
          <ADHDBottomTabBar />
        </div>
      </div>
    );
  }

  // 인증된 사용자 + ADHD 모드 활성화
  // 현재 모드에 따라 다른 화면 표시
  const handleExecute = () => {
    if (user?.id) {
      enterExecuteMode(user.id);
    }
  };

  const handleRelationshipInsights = () => {
    if (user?.id) {
      enterRelationshipInsightsMode(user.id);
    }
  };

  const handleFuel = (noteId?: string) => {
    if (user?.id) {
      enterFuelMode(user.id, noteId);
    }
  };

  const handleExitExecutionMode = () => {
    // 이전 모드가 fuel이면 FuelMode로 복귀, 아니면 진입 화면으로
    if (previousMode === 'fuel' && user?.id) {
      enterFuelMode(user.id);
    } else {
      enterEntryMode();
    }
  };

  // FuelMode에서 뒤로가기 - 항상 홈으로
  const handleExitFuelMode = () => {
    enterHomeMode();
  };

  // 모든 모드에서 뒤로가기 - 홈 목차로
  const handleExitToHome = () => {
    enterHomeMode();
  };

  // 네비게이션 표시 여부 (home, entry, relationship-insights, fuel, settings, execute, project 모드에서 표시)
  const showNavigation = currentMode === 'home' || currentMode === 'entry' || currentMode === null || currentMode === 'relationship-insights' || currentMode === 'fuel' || currentMode === 'settings' || currentMode === 'execute' || currentMode === 'project';

  // 정리 모드 (할일 정리하기) - 전체화면
  if (currentMode === 'organize') {
    return user?.id ? <OrganizeScreen userId={user.id} /> : null;
  }

  // 마음 전해보기 모드 - 전체화면
  if (currentMode === 'care') {
    return <RelationshipRecordContainer onExit={handleExitExecutionMode} />;
  }

  // Capacitor ADHD 모드 레이아웃 (entry, relationship-insights, fuel, execute, settings)
  return (
    <div className="flex min-h-screen">
        {/* 웹 사이드바 (md 이상) */}
        <div className="hidden md:block">
          <ADHDSidebar />
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
          {/* 실행 모드 */}
          {currentMode === 'execute' && (
            <FocusExecutionContainer onExit={handleExitExecutionMode} />
          )}

          {/* 관계 인사이트 모드 */}
          {currentMode === 'relationship-insights' && (
            <GenericTabContainer
              screenIds={RELATIONSHIP_SCREEN_IDS}
              routeGroupId="relationship"
              onExit={handleExitExecutionMode}
            />
          )}

          {/* 복잡한 머릿속, 정리해줄게 모드 (Fuel/원동력) */}
          {currentMode === 'fuel' && (
            <GenericTabContainer
              screenIds={FUEL_SCREEN_IDS}
              routeGroupId="fuel"
              onExit={handleExitFuelMode}
            />
          )}

          {/* 설정 모드 */}
          {currentMode === 'settings' && (
            <SettingsContainer onExit={handleExitToHome} />
          )}

          {/* 프로젝트 모드 */}
          {currentMode === 'project' && (
            <GenericTabContainer
              screenIds={PROJECT_SCREEN_IDS}
              routeGroupId="project"
              onExit={handleExitToHome}
            />
          )}

          {/* 진입 모드 (연락 돌아보기 / 활동 살펴보기) */}
          {currentMode === 'entry' && (
            <ADHDEntryScreen
              userId={user?.id}
              onRelationshipInsights={handleRelationshipInsights}
              onFuel={handleFuel}
            />
          )}

          {/* 홈 목차 화면 (기본) - null일 때도 표시 (새로고침 시 persist에서 제외된 currentMode가 null로 초기화됨) */}
          {(currentMode === 'home' || currentMode === null) && (
            <HomeTableOfContents />
          )}
        </main>

        {/* 모바일 하단탭 (md 미만) */}
        <div className="md:hidden">
          <ADHDBottomTabBar />
        </div>
    </div>
  );
}
