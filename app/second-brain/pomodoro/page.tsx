'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PomodoroTimer } from '@/components/pomodoro/PomodoroTimer';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

function PomodoroContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { connectTodo } = usePomodoroStore();

  const todoId = searchParams.get('todoId');
  const todoTitle = searchParams.get('todoTitle');

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/pomodoro');
  }, []);

  // 할일 연동
  useEffect(() => {
    if (todoId) {
      connectTodo(todoId);
    }
  }, [todoId, connectTodo]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">포모도로</h1>
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* 할일 제목 */}
        {todoTitle && (
          <p className="text-center text-base-content/60 mb-6 text-sm">
            {decodeURIComponent(todoTitle)}
          </p>
        )}

        {/* 포모도로 타이머 */}
        <PomodoroTimer todoId={todoId || undefined} />
      </div>
    </div>
  );
}

export default function PomodoroPage() {
  return (
    <AuthGuard requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-base-200 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      }>
        <PomodoroContent />
      </Suspense>
    </AuthGuard>
  );
}
