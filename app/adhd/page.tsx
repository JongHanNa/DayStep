'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /adhd - 홈으로 리다이렉트
 *
 * 웹에서 홈 목차는 루트 경로(/)에서 표시됩니다.
 * /adhd 접근 시 /로 리다이렉트합니다.
 */
export default function ADHDHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  // 리다이렉트 중 로딩 표시
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
    </div>
  );
}
