// 클라이언트 사이드 Google Calendar 인증 유틸리티
// 웹과 Capacitor 환경 모두 지원

import { Capacitor } from '@capacitor/core';

export interface GoogleAuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

export interface AuthResult {
  success: boolean;
  tokens?: GoogleAuthTokens;
  error?: string;
}

/**
 * 현재 환경이 Capacitor인지 확인
 */
export function isCapacitorEnvironment(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * 플랫폼별 Google OAuth 인증 실행
 */
export async function startGoogleAuth(): Promise<AuthResult> {
  try {
    const platform = isCapacitorEnvironment() ? 'mobile' : 'web';
    console.log(`🔐 Google OAuth 시작 (플랫폼: ${platform})`);

    // 1단계: 서버에서 인증 URL 가져오기
    const urlResponse = await fetch(`/api/auth/google/url?platform=${platform}`);
    const urlData = await urlResponse.json();

    if (!urlResponse.ok) {
      console.error('인증 URL 생성 실패:', urlData);
      return {
        success: false,
        error: urlData.error || '인증 URL 생성에 실패했습니다.'
      };
    }

    const { authUrl } = urlData;
    console.log('📋 인증 URL 생성 완료:', authUrl);

    // 2단계: 플랫폼별 OAuth 플로우 실행
    if (isCapacitorEnvironment()) {
      return await handleCapacitorAuth(authUrl);
    } else {
      return await handleWebAuth(authUrl);
    }

  } catch (error) {
    console.error('Google OAuth 실행 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '인증 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Capacitor 환경에서 OAuth 처리
 */
async function handleCapacitorAuth(authUrl: string): Promise<AuthResult> {
  try {
    console.log('📱 Capacitor Browser로 OAuth 실행');

    // Capacitor Browser 플러그인 동적 로드
    const { Browser } = await import('@capacitor/browser');

    // Browser로 OAuth 페이지 열기
    const result = await Browser.open({
      url: authUrl,
      windowName: '_blank',
      toolbarColor: '#000000',
      presentationStyle: 'popover'
    });

    console.log('📱 Browser 결과:', result);

    // URL 변경 감지 및 토큰 추출
    return new Promise((resolve) => {
      const checkUrl = setInterval(async () => {
        try {
          // Browser에서 URL 변경을 감지하는 방법이 제한적이므로
          // 콜백 처리를 위해 다른 접근 방식 사용
          // 실제로는 deep link나 custom scheme을 통해 처리해야 함

          // 임시: 사용자가 수동으로 완료했다고 가정하고 토큰 확인
          const tokens = await checkStoredTokens();
          if (tokens) {
            clearInterval(checkUrl);
            await Browser.close();
            resolve({
              success: true,
              tokens
            });
          }
        } catch (error) {
          console.error('토큰 확인 중 오류:', error);
        }
      }, 2000);

      // 타임아웃 설정 (2분)
      setTimeout(() => {
        clearInterval(checkUrl);
        Browser.close();
        resolve({
          success: false,
          error: '인증 시간이 초과되었습니다.'
        });
      }, 120000);
    });

  } catch (error) {
    console.error('Capacitor OAuth 실패:', error);
    return {
      success: false,
      error: '모바일 환경에서 인증을 실행할 수 없습니다.'
    };
  }
}

/**
 * 웹 환경에서 OAuth 처리
 */
async function handleWebAuth(authUrl: string): Promise<AuthResult> {
  return new Promise((resolve) => {
    console.log('🌐 웹 브라우저 팝업으로 OAuth 실행');

    // 팝업 창 크기 및 위치 설정
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // OAuth 팝업 창 열기
    const popup = window.open(
      authUrl,
      'googleAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      resolve({
        success: false,
        error: '팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.'
      });
      return;
    }

    // 메시지 기반 통신으로 OAuth 완료 감지
    const handleMessage = async (event: MessageEvent) => {
      // 보안: 우리 도메인에서 온 메시지만 처리
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        clearInterval(checkTokens);
        window.removeEventListener('message', handleMessage);

        // 팝업 닫기 시도 (에러 무시)
        try {
          if (!popup.closed) {
            popup.close();
          }
        } catch (error) {
          console.debug('성공 시 팝업 닫기 중 COOP 제한:', error);
        }

        // 토큰 확인
        const tokens = await checkStoredTokens();
        if (tokens) {
          resolve({
            success: true,
            tokens
          });
        } else {
          resolve({
            success: false,
            error: '인증이 완료되었지만 토큰을 가져올 수 없습니다.'
          });
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        clearInterval(checkTokens);
        window.removeEventListener('message', handleMessage);

        // 팝업 닫기 시도 (에러 무시)
        try {
          if (!popup.closed) {
            popup.close();
          }
        } catch (error) {
          console.debug('에러 시 팝업 닫기 중 COOP 제한:', error);
        }

        resolve({
          success: false,
          error: event.data.error || '인증 중 오류가 발생했습니다.'
        });
      }
    };

    // 메시지 리스너 등록
    window.addEventListener('message', handleMessage);

    // 백업: 주기적으로 토큰 확인 (COOP 경고 없이)
    const checkTokens = setInterval(async () => {
      // popup.closed 접근 대신 토큰 존재 여부로만 판단
      const tokens = await checkStoredTokens();
      if (tokens) {
        clearInterval(checkTokens);
        window.removeEventListener('message', handleMessage);

        console.log('✅ 백업 방식으로 토큰 감지됨');

        // 팝업 닫기 시도 (에러 무시)
        try {
          if (!popup.closed) {
            popup.close();
          }
        } catch (error) {
          // COOP 에러 무시
          console.debug('팝업 닫기 시도 중 COOP 제한:', error);
        }

        resolve({
          success: true,
          tokens
        });
      }
    }, 3000); // 3초마다 토큰 확인

    // 타임아웃 설정 (5분)
    setTimeout(() => {
      clearInterval(checkTokens);
      window.removeEventListener('message', handleMessage);

      // 팝업 닫기 시도 (에러 무시)
      try {
        if (!popup.closed) {
          popup.close();
        }
      } catch (error) {
        // COOP 에러 무시
        console.debug('타임아웃 시 팝업 닫기 중 COOP 제한:', error);
      }

      resolve({
        success: false,
        error: '인증 시간이 초과되었습니다.'
      });
    }, 300000);
  });
}

/**
 * 저장된 토큰 확인 (환경별 스토리지)
 */
async function checkStoredTokens(): Promise<GoogleAuthTokens | null> {
  try {
    if (isCapacitorEnvironment()) {
      // Capacitor Preferences에서 토큰 확인
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'google_calendar_tokens' });

      if (value) {
        return JSON.parse(value);
      }
    } else {
      // 웹 localStorage에서 토큰 확인
      const tokens = localStorage.getItem('google_calendar_tokens');
      if (tokens) {
        return JSON.parse(tokens);
      }
    }
    return null;
  } catch (error) {
    console.error('토큰 확인 실패:', error);
    return null;
  }
}

/**
 * 토큰 저장 (환경별 스토리지)
 */
export async function saveTokens(tokens: GoogleAuthTokens): Promise<void> {
  try {
    const tokenString = JSON.stringify(tokens);

    if (isCapacitorEnvironment()) {
      // Capacitor Preferences에 저장
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({
        key: 'google_calendar_tokens',
        value: tokenString
      });
      console.log('📱 Capacitor에 토큰 저장 완료');
    } else {
      // 웹 localStorage에 저장
      localStorage.setItem('google_calendar_tokens', tokenString);
      console.log('🌐 웹 localStorage에 토큰 저장 완료');
    }
  } catch (error) {
    console.error('토큰 저장 실패:', error);
    throw new Error('인증 토큰 저장에 실패했습니다.');
  }
}

/**
 * 토큰 삭제 (환경별 스토리지)
 */
export async function clearTokens(): Promise<void> {
  try {
    if (isCapacitorEnvironment()) {
      // Capacitor Preferences에서 삭제
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key: 'google_calendar_tokens' });
      console.log('📱 Capacitor에서 토큰 삭제 완료');
    } else {
      // 웹 localStorage에서 삭제
      localStorage.removeItem('google_calendar_tokens');
      console.log('🌐 웹 localStorage에서 토큰 삭제 완료');
    }
  } catch (error) {
    console.error('토큰 삭제 실패:', error);
    throw new Error('인증 토큰 삭제에 실패했습니다.');
  }
}

/**
 * 현재 토큰 유효성 확인
 */
export async function isTokenValid(): Promise<boolean> {
  try {
    const tokens = await checkStoredTokens();
    if (!tokens) return false;

    // 토큰 만료 시간 확인
    const now = Date.now();
    if (tokens.expiry_date && tokens.expiry_date <= now) {
      console.log('🕐 토큰이 만료되었습니다.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('토큰 유효성 확인 실패:', error);
    return false;
  }
}

/**
 * 토큰 갱신 (리프레시 토큰 사용)
 */
export async function refreshTokens(): Promise<AuthResult> {
  try {
    const currentTokens = await checkStoredTokens();
    if (!currentTokens?.refresh_token) {
      return {
        success: false,
        error: '리프레시 토큰이 없습니다. 다시 로그인해주세요.'
      };
    }

    // 서버 API를 통해 토큰 갱신
    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: currentTokens.refresh_token
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '토큰 갱신에 실패했습니다.'
      };
    }

    // 새 토큰 저장
    await saveTokens(data.tokens);

    return {
      success: true,
      tokens: data.tokens
    };

  } catch (error) {
    console.error('토큰 갱신 실패:', error);
    return {
      success: false,
      error: '토큰 갱신 중 오류가 발생했습니다.'
    };
  }
}