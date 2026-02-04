'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import WidgetsContent from '@/components/adhd/settings/WidgetsContent';

/**
 * /adhd/settings/widgets - 위젯 설정 페이지
 */
export default function WidgetsPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('widgets');
  }, []);

  return <WidgetsContent onBack={() => goSettings()} />;
}
