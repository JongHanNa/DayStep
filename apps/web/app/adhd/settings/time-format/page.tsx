'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import TimeFormatView from '@/components/adhd/settings/TimeFormatView';

/**
 * /adhd/settings/time-format - 시간 표기법 설정 페이지
 */
export default function TimeFormatPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode('time-format');
  }, []);

  return <TimeFormatView onBack={() => goSettings()} />;
}
