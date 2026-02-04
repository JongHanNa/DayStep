'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { NewsMemosView } from '@/components/adhd/RelationshipInsights/NewsMemosView';

/**
 * /adhd/relationship-insights/news - 소식 서브탭 페이지
 */
export default function NewsPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterRelationshipInsightsMode(user.id, 'news');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return <NewsMemosView userId={user.id} />;
}
