'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LandingPage from './landing/page';
import GraphView from '@/components/graph/GraphView';
import ADHDEntryScreen from '@/components/adhd/ADHDEntryScreen';
import ExecutionMode from '@/components/adhd/ExecutionMode';
import OrganizeModeWrapper from '@/components/adhd/OrganizeModeWrapper';
import CareMode from '@/components/adhd/CareMode';
import FuelMode from '@/components/adhd/FuelMode';
import { RelationshipInsightsMode } from '@/components/adhd/RelationshipInsights';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';

/**
 * 루트 페이지 (/)
 *
 * 라우팅 흐름:
 * - 인증됨 + ADHD 모드: ADHDEntryScreen 또는 ExecutionMode 표시
 * - 인증됨 + ADHD 모드 비활성화: GraphView 대시보드 표시
 * - 비인증 + 웹: LandingPage 직접 렌더링 (URL '/' 유지)
 * - 비인증 + Capacitor: /login으로 리다이렉트
 */
export default function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ADHD 모드 상태
  const { adhdModeEnabled } = useSettingsStore();
  const { currentMode, previousMode, enterEntryMode, enterExecuteMode, enterCareMode, enterRelationshipInsightsMode, enterFuelMode, exitMode } = useADHDModeStore();

  // 하이드레이션 완료 후 Capacitor 환경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isNative = window.location.protocol === 'capacitor:';
      setIsCapacitor(isNative);
      setMounted(true);
    }
  }, []);

  // Capacitor 비인증 사용자만 리다이렉트
  useEffect(() => {
    if (loading || !mounted) {
      return;
    }

    if (!isAuthenticated && isCapacitor) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isCapacitor, mounted, router]);

  // 로딩 중
  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  // Capacitor 비인증: 리다이렉트 중 로딩 표시
  if (!isAuthenticated && isCapacitor) {
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

  // 인증된 사용자 + ADHD 모드 비활성화: 기존 그래프 뷰
  if (!adhdModeEnabled) {
    return <GraphView />;
  }

  // 인증된 사용자 + ADHD 모드 활성화
  // 현재 모드에 따라 다른 화면 표시
  const handleExecute = () => {
    if (user?.id) {
      enterExecuteMode(user.id);
    }
  };

  const handleCare = () => {
    if (user?.id) {
      enterCareMode(user.id);
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
    enterEntryMode();
  };

  // 실행 모드
  if (currentMode === 'execute') {
    return <ExecutionMode onExit={handleExitExecutionMode} />;
  }

  // 정리 모드 (타이머 + 인터럽트 래퍼)
  if (currentMode === 'organize') {
    return <OrganizeModeWrapper onExit={handleExitExecutionMode} />;
  }

  // 마음 전해보기 모드
  if (currentMode === 'care') {
    return <CareMode onExit={handleExitExecutionMode} />;
  }

  // 관계 인사이트 모드
  if (currentMode === 'relationship-insights') {
    return <RelationshipInsightsMode onExit={handleExitExecutionMode} />;
  }

  // 복잡한 머릿속, 정리해줄게 모드 (Fuel/원동력)
  if (currentMode === 'fuel') {
    return <FuelMode onExit={handleExitFuelMode} />;
  }

  // 진입 화면 (기본)
  return (
    <ADHDEntryScreen
      userId={user?.id}
      onExecute={handleExecute}
      onCare={handleCare}
      onRelationshipInsights={handleRelationshipInsights}
      onFuel={handleFuel}
    />
  );
}
