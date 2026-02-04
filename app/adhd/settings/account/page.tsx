'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import AccountContent from '@/components/adhd/settings/AccountContent';

/**
 * /adhd/settings/account - 계정 관리 페이지
 */
export default function AccountPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('account');
  }, []);

  return <AccountContent onBack={() => goSettings()} />;
}
