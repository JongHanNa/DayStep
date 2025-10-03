'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRepositoryStore } from '@/state/stores/repositoryStore';
import { LazyRepositoryList } from '@/components/lazy/LazyComponents';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PageLoadingSkeleton } from '@/components/ui/loading-skeleton';
import { GenericError } from '@/components/ui/error-states';
import { AuthGuard } from '@/components/auth/AuthGuard';

/**
 * 보관함 페이지
 */
function RepositoryPageContent() {
  const { user } = useAuth();
  const { fetchItems, subscribe, unsubscribe, loading, error } = useRepositoryStore();

  useEffect(() => {
    if (user) {
      // 보관함 아이템 목록 조회
      fetchItems();
      
      // 실시간 구독 시작
      subscribe();

      // 컴포넌트 언마운트 시 구독 해제
      return () => {
        unsubscribe();
      };
    }
    
    // user가 없을 때는 cleanup 함수 반환하지 않음
    return;
  }, [user, fetchItems, subscribe, unsubscribe]);

  // 로딩 상태
  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8" role="main">
        <PageLoadingSkeleton variant="repository" title />
      </main>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <main className="container mx-auto px-4 py-8" role="main">
        <GenericError 
          onRetry={() => fetchItems()}
          onGoHome={() => window.location.href = '/'}
        />
      </main>
    );
  }

  return (
    <ErrorBoundary>
      <main className="container mx-auto px-4 py-8" role="main">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">보관함</h1>
          <p className="text-muted-foreground">
            재사용 가능한 템플릿과 중요한 내용을 보관하고 관리하세요.
          </p>
        </header>

        <LazyRepositoryList />
      </main>
    </ErrorBoundary>
  );
}

export default function RepositoryPage() {
  return (
    <AuthGuard requireAuth={true}>
      <RepositoryPageContent />
    </AuthGuard>
  );
}