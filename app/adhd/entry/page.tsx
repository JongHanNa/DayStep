'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ADHDEntryScreen from '@/components/adhd/ADHDEntryScreen';

/**
 * /adhd/entry 페이지 콘텐츠
 */
function EntryPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { goRelationshipInsights, goFuel } = useADHDNavigation();
  const tab = searchParams.get('tab');

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterEntryMode(tab || undefined);
  }, [tab]);

  const handleRelationshipInsights = () => {
    goRelationshipInsights();
  };

  const handleFuel = (noteId?: string) => {
    if (noteId) {
      // noteId가 있으면 Store에 직접 설정 (웹에서는 쿼리 파라미터로 전달 불가)
      if (user?.id) {
        useADHDModeStore.getState().enterFuelMode(user.id, noteId);
      }
    }
    goFuel();
  };

  return (
    <ADHDEntryScreen
      userId={user?.id}
      onRelationshipInsights={handleRelationshipInsights}
      onFuel={handleFuel}
    />
  );
}

/**
 * /adhd/entry - 대시보드 페이지
 */
export default function EntryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
        </div>
      }
    >
      <EntryPageContent />
    </Suspense>
  );
}
