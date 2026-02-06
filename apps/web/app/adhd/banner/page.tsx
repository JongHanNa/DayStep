'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { BannerScreen } from '@/components/adhd/screens';

/**
 * /adhd/banner - 마음 깨우기 페이지
 * Flat 라우트 구조
 */
export default function BannerPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterEntryMode('banner');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return <BannerScreen userId={user.id} />;
}
