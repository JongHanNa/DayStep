'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import SubscriptionContent from '@/components/adhd/settings/SubscriptionContent';

/**
 * /adhd/settings/subscription - 구독 관리 페이지
 */
export default function SubscriptionPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('subscription');
  }, []);

  return <SubscriptionContent onBack={() => goSettings()} />;
}
