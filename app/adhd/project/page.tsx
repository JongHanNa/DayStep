'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import ProjectMode from '@/components/adhd/ProjectMode';

/**
 * /adhd/project 페이지 콘텐츠
 */
function ProjectPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { goHome } = useADHDNavigation();
  const tab = searchParams.get('tab');

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterProjectMode(user.id, tab || undefined);
    }
  }, [user?.id, tab]);

  return <ProjectMode onExit={goHome} />;
}

/**
 * /adhd/project - 미룸방지 페이지
 */
export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}
