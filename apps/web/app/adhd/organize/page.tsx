'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { ADHDContainer } from '@/components/adhd';

/**
 * /adhd/organize - 정리 모드 페이지 (풀스크린)
 */
export default function OrganizePage() {
  const { goHome } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterOrganizeMode();
  }, []);

  return <ADHDContainer mode="organize" onExit={goHome} />;
}
