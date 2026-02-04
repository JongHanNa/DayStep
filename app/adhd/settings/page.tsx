'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useADHDStore, SettingsSubView } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { ADHDContainer } from '@/components/adhd';

/**
 * /adhd/settings 페이지 콘텐츠
 */
function SettingsPageContent() {
  const searchParams = useSearchParams();
  const { goHome } = useADHDNavigation();
  const tab = searchParams.get('tab');

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode((tab as SettingsSubView) || 'main');
  }, [tab]);

  return <ADHDContainer mode="settings" onExit={goHome} />;
}

/**
 * /adhd/settings - 설정 페이지
 */
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
        </div>
      }
    >
      <SettingsPageContent />
    </Suspense>
  );
}
