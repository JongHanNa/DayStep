'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import { ProjectsScreen } from '@/components/adhd/screens';

/**
 * /adhd/projects - 내 계획 보기 페이지
 * Flat 라우트 구조
 */
export default function ProjectsPage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDStore.getState().enterProjectMode(user.id, 'projects');
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
      <ProjectsScreen userId={user.id} />
    </div>
  );
}
