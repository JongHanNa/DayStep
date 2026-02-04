'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import AccountView from '@/components/adhd/settings/AccountView';

/**
 * /adhd/settings/account - 계정 관리 페이지
 */
export default function AccountPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode('account');
  }, []);

  return <AccountView onBack={() => goSettings()} />;
}
