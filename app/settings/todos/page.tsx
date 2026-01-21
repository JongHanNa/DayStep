'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

/**
 * 할일 완료 설정 페이지 리다이렉트
 *
 * /settings/todos URL로 직접 접근 시 홈으로 리다이렉트하고 할일 설정 모드를 활성화합니다.
 */
export default function TodosPage() {
  const router = useRouter();
  const { enterSettingsMode } = useADHDModeStore();

  useEffect(() => {
    enterSettingsMode('todos');
    router.replace('/');
  }, [enterSettingsMode, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
