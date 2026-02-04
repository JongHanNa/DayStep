'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import FontView from '@/components/adhd/settings/FontView';

/**
 * /adhd/settings/font - 글꼴 설정 페이지
 */
export default function FontPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('font');
  }, []);

  return <FontView onBack={() => goSettings()} />;
}
