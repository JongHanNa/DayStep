'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Network } from 'lucide-react';

/**
 * 루트 페이지 (/)
 *
 * WebView 크래시 후에도 유용한 앱 페이지를 표시하여 사용자 경험 개선.
 *
 * 라우팅 흐름:
 * - 인증됨: 그래프 뷰 대시보드 표시 (개발 예정)
 * - 비인증 + 웹: /landing으로 리다이렉트 (마케팅 페이지)
 * - 비인증 + Capacitor: /login으로 리다이렉트
 */
export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [isCapacitor, setIsCapacitor] = useState(false);

  // 하이드레이션 완료 후 Capacitor 환경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isNative = window.location.protocol === 'capacitor:';
      setIsCapacitor(isNative);
    }
  }, []);

  // Capacitor 비인증 사용자만 리다이렉트
  // 웹 비인증 사용자: next.config.ts의 rewrite로 /landing 표시 (URL 유지)
  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated && isCapacitor) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, isCapacitor, router]);

  // 로딩 중 또는 비인증 상태
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
      </div>
    );
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
