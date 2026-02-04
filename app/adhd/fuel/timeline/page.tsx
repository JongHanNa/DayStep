'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { TimelineView } from '@/components/adhd/fuel';

/**
 * /adhd/fuel/timeline - 타임라인 서브탭 페이지
 */
export default function TimelinePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterFuelMode(user.id, undefined, 'timeline');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <TimelineView userId={user.id} />
    </div>
  );
}
