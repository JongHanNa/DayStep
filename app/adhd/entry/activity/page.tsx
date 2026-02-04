'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import { ActivityContent } from '@/components/adhd/entry';

/**
 * /adhd/entry/activity - 활동 통계 서브탭 페이지 (Pro 전용)
 */
export default function ActivityPage() {
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterEntryMode('activity');
  }, []);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  // Pro 전용 - 구독이 없으면 Paywall 표시
  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <Paywall
            featureId="todo_stats"
            title="활동 통계"
            description="할일 완료 패턴을 분석하고 생산성을 파악하세요"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      <div className="flex-1 overflow-y-auto px-4">
        <ActivityContent userId={user.id} />
      </div>
    </div>
  );
}
