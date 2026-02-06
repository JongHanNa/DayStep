'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { AIChatScreen } from '@/components/adhd/screens';

/**
 * /adhd/ai-chat - AI와 대화하기 페이지
 * Flat 라우트 구조
 */
export default function AIChatPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterProjectMode(user.id, 'ai-chat');
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-base-100">
      <AIChatScreen />
    </div>
  );
}
