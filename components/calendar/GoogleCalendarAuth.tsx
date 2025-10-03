'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LinkIcon, AlertCircle, CheckCircle2, Shield, Eye, Calendar, RefreshCw, TestTube } from 'lucide-react';
import { useGoogleCalendarStore } from '@/state/stores/googleCalendarStore';
import {
  startGoogleAuth,
  saveTokens,
  isCapacitorEnvironment,
  type GoogleAuthTokens
} from '@/lib/google-calendar/client-auth';

export function GoogleCalendarAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setError, clearError, setLastSyncTime } = useGoogleCalendarStore();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isMockConnecting, setIsMockConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'ready' | 'connecting' | 'processing'>('ready');
  const [isDev, setIsDev] = useState(false);

  // 개발 환경 확인
  useEffect(() => {
    setIsDev(
      process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost'
    );
  }, []);

  // URL 파라미터에서 인증 결과 처리
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const tokensBase64 = searchParams.get('tokens');
    const platform = searchParams.get('platform');

    if (success === 'true' && tokensBase64) {
      handleAuthSuccess(tokensBase64, platform);
    } else if (error) {
      handleAuthError(decodeURIComponent(error));
    }
  }, [searchParams]);

  /**
   * 인증 성공 처리
   */
  const handleAuthSuccess = async (tokensBase64: string, platform: string | null) => {
    try {
      setAuthStep('processing');
      console.log(`✅ Google 인증 성공 (플랫폼: ${platform})`);

      // Base64 디코딩하여 토큰 파싱
      const tokensData: GoogleAuthTokens = JSON.parse(
        Buffer.from(tokensBase64, 'base64').toString('utf-8')
      );

      // 토큰을 환경별 스토리지에 저장
      await saveTokens(tokensData);

      // 스토어 상태 업데이트
      setTokens(tokensData.access_token, tokensData.refresh_token);
      setLastSyncTime(new Date());
      clearError();

      console.log('🎉 Google Calendar 연동 완료!');

      // URL 파라미터 정리
      const cleanUrl = window.location.pathname;
      router.replace(cleanUrl);

    } catch (error) {
      console.error('토큰 저장 실패:', error);
      handleAuthError('인증 토큰 저장에 실패했습니다.');
    } finally {
      setAuthStep('ready');
    }
  };

  /**
   * 인증 실패 처리
   */
  const handleAuthError = (errorMessage: string) => {
    console.error('❌ Google 인증 실패:', errorMessage);
    setLocalError(errorMessage);
    setError(errorMessage);
    setAuthStep('ready');

    // URL 파라미터 정리
    const cleanUrl = window.location.pathname;
    router.replace(cleanUrl);
  };

  /**
   * Google OAuth 인증 시작
   */
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setLocalError(null);
      clearError();
      setAuthStep('connecting');

      console.log('🔐 Google Calendar 인증 시작...');

      const result = await startGoogleAuth();

      if (!result.success) {
        throw new Error(result.error || 'Google 인증에 실패했습니다.');
      }

      // 성공한 경우 토큰이 이미 저장되어 있음
      if (result.tokens) {
        setTokens(result.tokens.access_token, result.tokens.refresh_token);
        setLastSyncTime(new Date());
        console.log('🎉 Google Calendar 연동 완료!');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      console.error('❌ Google 인증 오류:', errorMessage);
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
      setAuthStep('ready');
    }
  };

  /**
   * Mock 데이터로 테스트 연결 (개발 환경 전용)
   */
  const handleMockConnect = async () => {
    try {
      setIsMockConnecting(true);
      setLocalError(null);
      clearError();

      console.log('🧪 개발 모드: Mock 데이터로 연결 시작...');

      // Mock 토큰 생성 및 설정
      const { generateMockTokens } = await import('@/lib/google-calendar/mock-data');
      const mockTokens = generateMockTokens();

      // 딜레이로 실제 인증 과정 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 스토어에 Mock 토큰 설정
      setTokens(mockTokens.access_token, mockTokens.refresh_token || '');
      setLastSyncTime(new Date());

      console.log('✅ Mock 데이터 연결 완료!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mock 연결 중 오류가 발생했습니다.';
      console.error('❌ Mock 연결 오류:', errorMessage);
      setLocalError(errorMessage);
      setError(errorMessage);
    } finally {
      setIsMockConnecting(false);
    }
  };

  /**
   * 에러 상태 정리
   */
  const handleClearError = () => {
    setLocalError(null);
    clearError();
  };

  const currentPlatform = isCapacitorEnvironment() ? 'mobile' : 'web';

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      {/* 연동 안내 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">구글 캘린더 연동</h2>
          <p className="text-sm text-muted-foreground">
            구글 캘린더와 연결하여 일정을 동기화하세요
          </p>
        </div>
      </div>

      {/* 에러 메시지 표시 */}
      {localError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{localError}</p>
              <button
                onClick={handleClearError}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 처리 중 상태 표시 */}
      {authStep !== 'ready' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {authStep === 'connecting' && '구글 인증 페이지로 이동 중...'}
                {authStep === 'processing' && '인증 정보를 처리하는 중...'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                잠시만 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 권한 안내 */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          요청 권한 안내
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Eye className="w-4 h-4 text-green-500" />
            <span>캘린더 이벤트 읽기 (읽기 전용)</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span>사용자 프로필 정보 (이름, 이메일)</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          DayStep은 <strong>읽기 전용 권한</strong>만 요청하며, 캘린더를 수정하거나
          삭제하지 않습니다. 언제든지 연동을 해제할 수 있습니다.
        </p>
      </div>

      {/* 플랫폼별 안내 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>현재 환경:</strong> {currentPlatform === 'mobile' ? '모바일 앱' : '웹 브라우저'}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {currentPlatform === 'mobile'
            ? '모바일 브라우저가 열려 Google 인증을 진행합니다.'
            : '새 창에서 Google 인증을 진행합니다. 팝업을 허용해주세요.'
          }
        </p>
      </div>

      {/* 연결 버튼 */}
      <button
        onClick={handleConnect}
        disabled={isConnecting || authStep !== 'ready'}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isConnecting || authStep !== 'ready' ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            {authStep === 'connecting' && '인증 중...'}
            {authStep === 'processing' && '처리 중...'}
            {authStep === 'ready' && isConnecting && '연결 중...'}
          </>
        ) : (
          <>
            <LinkIcon className="w-4 h-4" />
            구글 계정으로 연결
          </>
        )}
      </button>

      {/* 추가 안내 */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          연결하면 <strong>Google 개인정보처리방침</strong> 및 <strong>서비스 약관</strong>에 동의하는 것으로 간주됩니다.
          <br />
          DayStep은 Google에서 승인한 안전한 연동 방식을 사용합니다.
        </p>
      </div>
    </div>
  );
}