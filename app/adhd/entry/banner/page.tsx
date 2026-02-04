'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { BannerView } from '@/components/adhd/entry';

/**
 * /adhd/entry/banner - 배너 서브탭 페이지
 */
export default function BannerPage() {
  const { user } = useAuth();
  const { goRelationshipInsights, goFuel } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterEntryMode('banner');
  }, []);

  const handleFuel = (noteId?: string) => {
    if (noteId && user?.id) {
      useADHDStore.getState().enterFuelMode(user.id, noteId);
    }
    goFuel();
  };

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      <div className="flex-1 overflow-y-auto px-4">
        <BannerView
          userId={user.id}
          onRelationshipInsights={goRelationshipInsights}
          onFuel={handleFuel}
        />
      </div>
    </div>
  );
}
