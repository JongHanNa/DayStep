'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import OrganizeModeWrapper from '@/components/adhd/OrganizeModeWrapper';

/**
 * /adhd/organize - 정리 모드 페이지 (풀스크린)
 */
export default function OrganizePage() {
  const { goHome } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterOrganizeMode();
  }, []);

  return <OrganizeModeWrapper onExit={goHome} />;
}
