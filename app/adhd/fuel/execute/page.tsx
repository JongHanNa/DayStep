'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { ExecuteView } from '@/components/adhd/fuel';

/**
 * /adhd/fuel/execute - 실행 서브탭 페이지
 */
export default function ExecutePage() {
  const { user } = useAuth();
  const { goFuel } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterFuelMode(user.id, undefined, 'execute');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <ExecuteView onExit={() => goFuel()} />
    </div>
  );
}
