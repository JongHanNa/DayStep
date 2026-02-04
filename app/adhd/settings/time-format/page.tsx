'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import TimeFormatContent from '@/components/adhd/settings/TimeFormatContent';

/**
 * /adhd/settings/time-format - 시간 표기법 설정 페이지
 */
export default function TimeFormatPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('time-format');
  }, []);

  return <TimeFormatContent onBack={() => goSettings()} />;
}
