'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { GuideScreen } from '@/components/adhd/screens';

/**
 * /adhd/guide - 사용법 배우기 페이지
 * Flat 라우트 구조
 */
export default function GuidePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterProjectMode(user.id, 'guide');
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-base-100">
      <GuideScreen />
    </div>
  );
}
