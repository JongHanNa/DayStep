'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import NotificationsView from '@/components/adhd/settings/NotificationsView';

/**
 * /adhd/settings/notifications - 알림 설정 페이지
 */
export default function NotificationsPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('notifications');
  }, []);

  return <NotificationsView onBack={() => goSettings()} />;
}
