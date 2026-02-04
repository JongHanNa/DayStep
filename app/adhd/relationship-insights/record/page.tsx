'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { CareRecordView } from '@/components/adhd/RelationshipInsights/CareRecordView';

/**
 * /adhd/relationship-insights/record - 기록 서브탭 페이지
 */
export default function RecordPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterRelationshipInsightsMode(user.id, 'record');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return <CareRecordView userId={user.id} />;
}
