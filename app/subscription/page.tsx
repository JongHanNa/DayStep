'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

/**
 * 구독 페이지 리다이렉트
 *
 * /subscription URL로 직접 접근 시 홈으로 리다이렉트하고 구독 관리 모드를 활성화합니다.
 * 실제 구독 UI는 app/page.tsx에서 SettingsMode > SubscriptionContent로 렌더링됩니다.
 */
export default function SubscriptionPage() {
  const router = useRouter();
  const { enterSettingsMode } = useADHDModeStore();

  useEffect(() => {
    // 구독 관리 모드 진입 후 홈으로 리다이렉트
    enterSettingsMode('subscription');
    router.replace('/');
  }, [enterSettingsMode, router]);

  // 리다이렉트 중 로딩 표시
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
