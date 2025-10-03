'use client';

// Vercel 배포: Dynamic 렌더링 강제 (OAuth 콜백 및 인증 처리를 위해 필요)
// 참고: 'use client' 컴포넌트에서는 revalidate 사용 불가 (서버 컴포넌트 전용)

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TimelineContainer } from '@/components/timeline';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { themeColors } from '@/lib/theme-colors';

function TimelinePageContent() {

  const { isAuthenticated, loading, appUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [hasTriedRouteHandler, setHasTriedRouteHandler] = useState(false);
  
  // 🎯 OAuth 콜백 처리 - code 파라미터가 있으면 세션 교환
  const handleOAuthCallback = useCallback(async () => {
      const code = searchParams.get('code');
      
      if (!code || isProcessingOAuth || hasTriedRouteHandler) {
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [홈페이지 OAuth] code 파라미터 감지, 세션 교환 시작:', code);
      }
      setIsProcessingOAuth(true);
      
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [홈페이지 OAuth] exchangeCodeForSession 호출 전...');
        }
        
        // 5초 타임아웃 추가
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('exchangeCodeForSession timeout')), 5000)
        );
        
        const result = await Promise.race([
          supabase.auth.exchangeCodeForSession(code),
          timeoutPromise
        ]);
        const { data, error } = result as { data: { session?: any, user?: any }, error?: any };
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 [홈페이지 OAuth] exchangeCodeForSession 결과:', { 
            hasData: !!data, 
            hasError: !!error, 
            errorMessage: error?.message 
          });
        }
        
        if (error) {
          console.error('❌ [홈페이지 OAuth] 세션 교환 실패:', error.message);
          // 에러 시 로그인 페이지로 리다이렉트
          router.replace('/login?error=' + encodeURIComponent(error.message));
          return;
        }
        
        if (data.session && data.user) {
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [홈페이지 OAuth] 세션 교환 성공:', {
              userId: data.user.id,
              email: data.user.email
            });
          }
          
          // URL에서 code 파라미터 제거
          router.replace('/');
        } else {
          console.error('❌ [홈페이지 OAuth] 세션 교환 성공했지만 데이터가 없음');
          router.replace('/login?error=no_session_data');
        }
      } catch (error) {
        console.error('❌ [홈페이지 OAuth] 예상치 못한 오류:', error);
        
        if (error instanceof Error && error.message === 'exchangeCodeForSession timeout') {
          console.error('💥 [홈페이지 OAuth] PKCE verifier 타임아웃 - Route Handler로 폴백');
          setHasTriedRouteHandler(true);
          // PKCE verifier 문제로 Route Handler 호출 (한 번만)
          // 🔧 브라우저 네비게이션 강제 사용으로 클라이언트 라우팅 문제 해결
          window.location.href = `/auth/callback?code=${code}`;
        } else {
          // 🔧 브라우저 네비게이션 강제 사용
          window.location.href = '/login?error=oauth_processing_failed';
        }
      } finally {
        setIsProcessingOAuth(false);
      }
    }, [searchParams, router, isProcessingOAuth, hasTriedRouteHandler]);
    
  useEffect(() => {
    handleOAuthCallback();
  }, [handleOAuthCallback]);
  
  useEffect(() => {
    // console.log('🏠 HomePage - AuthContext 상태:', {
    //   isAuthenticated,
    //   loading,
    //   hasAppUser: !!appUser,
    //   userId: appUser?.id,
    //   현재시간: new Date().toISOString()
    // });
  }, [isAuthenticated, loading, appUser]);

  // OAuth 처리 중이면 로딩 표시 (메모화)
  const loadingComponent = useMemo(() => {
    if (!isProcessingOAuth) return null;
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">로그인 처리 중...</p>
        </div>
      </div>
    );
  }, [isProcessingOAuth]);
  
  if (loadingComponent) {
    return loadingComponent;
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-full safe-area-container timeline-background scrollbar-hide">
        <TimelineContainer />
      </div>
    </AuthGuard>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <TimelinePageContent />
    </Suspense>
  );
}