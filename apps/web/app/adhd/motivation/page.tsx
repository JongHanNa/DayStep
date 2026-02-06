'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { MotivationScreen } from '@/components/adhd/screens';

/**
 * /adhd/motivation - 원동력 새기기 페이지
 * Flat 라우트 구조
 */
export default function MotivationPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterFuelMode(user.id, undefined, 'motivation');
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
    <div className="min-h-screen bg-base-100">
      <MotivationScreen userId={user.id} />
    </div>
  );
}
