'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ThemeContent from '@/components/adhd/settings/ThemeContent';

/**
 * /adhd/settings/theme - 테마 설정 페이지
 */
export default function ThemePage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('theme');
  }, []);

  return <ThemeContent onBack={() => goSettings()} />;
}
