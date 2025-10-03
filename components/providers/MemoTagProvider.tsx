'use client';

import React, { useEffect } from 'react';
import { useMemoTagStore } from '@/state/stores/memoTagStore';
import { useAuth } from '@/app/context/AuthContext';

interface MemoTagProviderProps {
  children: React.ReactNode;
}

export const MemoTagProvider: React.FC<MemoTagProviderProps> = ({ children }) => {
  const { loadAllTags } = useMemoTagStore();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      console.log('🏷️ MemoTagProvider: 사용자 로그인 감지, 태그 스토어 초기화');
      loadAllTags(user.id);
    }
  }, [user?.id, loadAllTags]);

  return <>{children}</>;
};