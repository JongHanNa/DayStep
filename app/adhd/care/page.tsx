'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import CareMode from '@/components/adhd/CareMode';

/**
 * /adhd/care - 마음 전해보기 페이지 (풀스크린)
 */
export default function CarePage() {
  const { user } = useAuth();
  const { goHome } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterCareMode(user.id);
    }
  }, [user?.id]);

  return <CareMode onExit={goHome} />;
}
