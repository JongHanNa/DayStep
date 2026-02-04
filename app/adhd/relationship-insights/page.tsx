'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { RelationshipInsightsMode } from '@/components/adhd/RelationshipInsights';

/**
 * /adhd/relationship-insights 페이지 콘텐츠
 */
function RelationshipInsightsPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { goHome } = useADHDNavigation();
  const tab = searchParams.get('tab');

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterRelationshipInsightsMode(user.id, tab || undefined);
    }
  }, [user?.id, tab]);

  return <RelationshipInsightsMode onExit={goHome} />;
}

/**
 * /adhd/relationship-insights - 관계 인사이트 페이지
 */
export default function RelationshipInsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
        </div>
      }
    >
      <RelationshipInsightsPageContent />
    </Suspense>
  );
}
