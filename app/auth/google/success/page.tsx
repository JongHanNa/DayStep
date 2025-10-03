'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { saveTokens } from '@/lib/google-calendar/client-auth';

/**
 * Google OAuth 성공 페이지 내부 컴포넌트
 */
function GoogleAuthSuccessContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        const tokensParam = searchParams.get('tokens');
        const platform = searchParams.get('platform') || 'web';

        if (!tokensParam) {
          throw new Error('토큰 정보가 없습니다.');
        }

        // Base64 디코딩 (브라우저 환경)
        const tokenData = JSON.parse(atob(tokensParam));

        console.log('✅ Google OAuth 성공 페이지에서 토큰 수신:', platform);

        // 토큰 저장
        await saveTokens(tokenData);

        // 부모 창에 성공 메시지 전송
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            tokens: tokenData
          }, window.location.origin);

          console.log('📤 부모 창에 성공 메시지 전송 완료');

          // 잠시 후 팝업 닫기
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // 팝업이 아닌 경우 설정 페이지로 리다이렉트
          window.location.href = '/settings/google-calendar?success=true';
        }

      } catch (error) {
        console.error('❌ OAuth 성공 페이지 처리 실패:', error);

        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

        // 부모 창에 에러 메시지 전송
        if (window.opener) {
          window.opener.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: errorMessage
          }, window.location.origin);

          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // 팝업이 아닌 경우 설정 페이지로 에러와 함께 리다이렉트
          window.location.href = `/settings/google-calendar?error=${encodeURIComponent(errorMessage)}`;
        }
      }
    };

    handleAuthSuccess();
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-primary/10 to-brand-primary/5">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-6" />

        <h1 className="text-2xl font-semibold text-foreground mb-3">
          Google Calendar 연동 중...
        </h1>

        <p className="text-muted-foreground mb-6">
          인증이 완료되었습니다.<br />
          잠시만 기다려주세요.
        </p>

        <div className="text-sm text-muted-foreground">
          이 창은 자동으로 닫힙니다.
        </div>
      </div>
    </div>
  );
}

/**
 * Google OAuth 성공 페이지
 * 팝업에서 열리고 부모 창에 토큰을 전달
 */
export default function GoogleAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-primary/10 to-brand-primary/5">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-foreground mb-3">
            로딩 중...
          </h1>
        </div>
      </div>
    }>
      <GoogleAuthSuccessContent />
    </Suspense>
  );
}