'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { ActivityScreen } from '@/components/adhd/screens';

/**
 * /adhd/activity - 활동 살펴보기 페이지 (Pro 전용)
 * Flat 라우트 구조
 */
export default function ActivityPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterEntryMode('activity');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return <ActivityScreen userId={user.id} />;
}
