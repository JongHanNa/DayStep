'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { ADHDSidebar, ADHDBottomTabBar } from '@/components/adhd/navigation';
import { useEffect, useState } from 'react';

/**
 * ADHD 모드 레이아웃
 *
 * 파일 기반 라우팅 + 사이드바/하단탭
 */
export default function ADHDLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
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

  // 비인증 사용자 → 로그인
  if (!isAuthenticated) {
    redirect('/login');
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
