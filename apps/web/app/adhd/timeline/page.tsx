'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { TimelineScreen } from '@/components/adhd/screens';

/**
 * /adhd/timeline - 달력 페이지
 * Flat 라우트 구조
 */
export default function TimelinePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterFuelMode(user.id, undefined, 'timeline');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="bg-base-100 h-[calc(100dvh-5rem)] md:h-dvh">
      <TimelineScreen userId={user.id} viewMode="agenda" />
    </div>
  );
}
