'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { RecordScreen } from '@/components/adhd/screens';

/**
 * /adhd/record - 관계 기록하기 페이지
 * Flat 라우트 구조
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

  return <RecordScreen userId={user.id} />;
}
