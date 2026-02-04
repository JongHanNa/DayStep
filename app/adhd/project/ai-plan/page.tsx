'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ProjectMode from '@/components/adhd/ProjectMode';

/**
 * /adhd/project/ai-plan - AI 계획 서브탭 페이지 (기본 탭)
 */
export default function AIPlanPage() {
  const { user } = useAuth();
  const { goHome } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterProjectMode(user.id, 'ai-plan');
    }
  }, [user?.id]);

  return <ProjectMode onExit={goHome} />;
}
