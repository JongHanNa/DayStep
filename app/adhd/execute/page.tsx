'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { ExecutionContainer } from '@/components/adhd/execution';

/**
 * /adhd/execute - 실행 모드 페이지
 */
export default function ExecutePage() {
  const { user } = useAuth();
  const { goHome, goFuel } = useADHDNavigation();
  const previousMode = useADHDModeStore((s) => s.previousMode);

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterExecuteMode(user.id);
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

  return <ExecutionContainer onExit={handleExit} />;
}
