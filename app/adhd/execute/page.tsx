'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { ADHDContainer } from '@/components/adhd';

/**
 * /adhd/execute - 실행 모드 페이지
 */
export default function ExecutePage() {
  const { user } = useAuth();
  const { goHome, goFuel } = useADHDNavigation();
  const previousMode = useADHDStore((s) => s.previousMode);

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterExecuteMode(user.id);
    }
  }, [user?.id]);

  // 종료 시 이전 모드에 따라 분기
  const handleExit = () => {
    if (previousMode === 'fuel') {
      goFuel();
    } else {
      goHome();
    }
  };

  return <ADHDContainer mode="execute" onExit={handleExit} />;
}
