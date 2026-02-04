'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import { ContactView } from '@/components/adhd/entry';

/**
 * /adhd/entry/contact - 연락 통계 서브탭 페이지 (Pro 전용)
 */
export default function ContactPage() {
  const { user } = useAuth();
  const { hasActiveSubscription } = useSubscription();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterEntryMode('contact');
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
            featureId="relationship_insights"
            title="관계 통계"
            description="관계 기록 패턴을 분석하고 인사이트를 확인하세요"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      <div className="flex-1 overflow-y-auto px-4">
        <ContactView userId={user.id} />
      </div>
    </div>
  );
}
