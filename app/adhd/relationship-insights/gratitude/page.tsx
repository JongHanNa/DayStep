'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { GratitudeJournalView } from '@/components/adhd/RelationshipInsights/GratitudeJournalView';

/**
 * /adhd/relationship-insights/gratitude - 감사 서브탭 페이지
 */
export default function GratitudePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterRelationshipInsightsMode(user.id, 'gratitude');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return <GratitudeJournalView userId={user.id} />;
}
