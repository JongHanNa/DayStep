'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LandingPage from './landing/page';
import { ADHDSidebar, ADHDBottomTabBar } from '@/components/adhd/navigation';
import HomeTableOfContents from '@/components/adhd/HomeTableOfContents';
import { isElectronEnv } from '@/lib/utils/platform';

/**
 * 루트 페이지 (/)
 *
 * 라우팅 흐름:
 * - 인증됨: 홈 목차 직접 표시
 * - 비인증: LandingPage 직접 렌더링 (URL '/' 유지)
 */
export default function HomePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [isElectron, setIsElectron] = useState(false);

  // 하이드레이션 완료 후 환경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsElectron(isElectronEnv());
      setMounted(true);
    }
  }, []);

  // Electron 비인증 사용자 리다이렉트
  useEffect(() => {
    if (loading || !mounted) {
      return;
    }

    if (!isAuthenticated && isElectron) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isElectron, mounted, router]);


  // 로딩 중
  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
  }

  // Electron 비인증: 리다이렉트 중 로딩 표시
  if (!isAuthenticated && isElectron) {
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

  // 웹 + 인증됨: 홈 목차 직접 표시
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
