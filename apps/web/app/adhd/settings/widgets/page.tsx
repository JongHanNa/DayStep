'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import WidgetsView from '@/components/adhd/settings/WidgetsView';

/**
 * /adhd/settings/widgets - 위젯 설정 페이지
 */
export default function WidgetsPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode('widgets');
  }, []);

  return <WidgetsView onBack={() => goSettings()} />;
}
