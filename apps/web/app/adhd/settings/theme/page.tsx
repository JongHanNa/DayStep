'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ThemeView from '@/components/adhd/settings/ThemeView';

/**
 * /adhd/settings/theme - 테마 설정 페이지
 */
export default function ThemePage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode('theme');
  }, []);

  return <ThemeView onBack={() => goSettings()} />;
}
