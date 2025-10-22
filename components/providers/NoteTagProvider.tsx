'use client';

import React, { useEffect } from 'react';
import { useNoteTagStore } from '@/state/stores/noteTagStore';
import { useAuth } from '@/app/context/AuthContext';

interface NoteTagProviderProps {
  children: React.ReactNode;
}

export const NoteTagProvider: React.FC<NoteTagProviderProps> = ({ children }) => {
  const { loadAllTags } = useNoteTagStore();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      console.log('🏷️ NoteTagProvider: 사용자 로그인 감지, 태그 스토어 초기화');
      loadAllTags(user.id);
    }
  }, [user?.id, loadAllTags]);

  return <>{children}</>;
};
