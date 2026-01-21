'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

/**
 * 설정 페이지 리다이렉트
 *
 * /settings URL로 직접 접근 시 홈으로 리다이렉트하고 설정 모드를 활성화합니다.
 * 실제 설정 UI는 app/page.tsx에서 SettingsMode 컴포넌트로 렌더링됩니다.
 */
export default function SettingsPage() {
  const router = useRouter();
  const { enterSettingsMode } = useADHDModeStore();

  useEffect(() => {
    // 설정 모드 진입 후 홈으로 리다이렉트
    enterSettingsMode('main');
    router.replace('/');
  }, [enterSettingsMode, router]);

  // 리다이렉트 중 로딩 표시
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
