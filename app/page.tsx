'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Network } from 'lucide-react';
import LandingPage from './landing/page';

/**
 * 루트 페이지 (/)
 *
 * 라우팅 흐름:
 * - 인증됨: 그래프 뷰 대시보드 표시 (개발 예정)
 * - 비인증 + 웹: LandingPage 직접 렌더링 (URL '/' 유지)
 * - 비인증 + Capacitor: /login으로 리다이렉트
 */
export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // 인증된 사용자: 그래프 뷰 대시보드 (개발 예정)
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
          <Network className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-base-content mb-2">그래프 뷰</h1>
          <p className="text-base-content/70">개발 예정</p>
        </div>
        <button
          onClick={() => router.push('/second-brain/areas')}
          className="btn btn-primary btn-sm rounded-full"
        >
          Areas로 이동
        </button>
      </div>
    </div>
  );
}
