'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { GuideView } from '@/components/adhd/project';

/**
 * /adhd/project/guide - 가이드 서브탭 페이지
 */
export default function GuidePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterProjectMode(user.id, 'guide');
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <GuideView />
    </div>
  );
}
