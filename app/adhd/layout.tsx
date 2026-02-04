'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ADHDSidebar, ADHDBottomTabBar } from '@/components/adhd/navigation';
import { isCapacitorEnv } from '@/lib/utils/platform';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useEffect, useState } from 'react';

/**
 * ADHD 모드 웹 전용 레이아웃
 *
 * - Capacitor 환경: / 로 리다이렉트 (기존 Store 기반 방식 사용)
 * - 웹 환경: 파일 기반 라우팅 + 사이드바/하단탭
 */
export default function ADHDLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const { adhdModeEnabled } = useSettingsStore();
  const [mounted, setMounted] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);

  // 클라이언트 환경 감지
  useEffect(() => {
    setIsCapacitor(isCapacitorEnv());
    setMounted(true);
  }, []);

  // 마운트 전 또는 로딩 중
  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  // Capacitor 환경이면 / 로 리다이렉트 (기존 방식 사용)
  if (isCapacitor) {
    redirect('/');
  }

  // 비인증 사용자 → 로그인
  if (!isAuthenticated) {
    redirect('/login');
  }

  // ADHD 모드 비활성화 → 기본 대시보드
  if (!adhdModeEnabled) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen">
      {/* 웹 사이드바 (md 이상) */}
      <div className="hidden md:block">
        <ADHDSidebar />
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
        {children}
      </main>

      {/* 모바일 하단탭 (md 미만) */}
      <div className="md:hidden">
        <ADHDBottomTabBar />
      </div>
    </div>
  );
}
