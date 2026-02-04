'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { AIChatView } from '@/components/adhd/project';

/**
 * /adhd/project/ai-chat - AI 채팅 서브탭 페이지
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
      <AIChatView />
    </div>
  );
}
