/**
 * Electron OAuth Handlers
 *
 * Electron 환경에서 Google OAuth를 시스템 브라우저를 통해 처리합니다.
 * 로컬 HTTP 서버로 콜백을 수신하고 Supabase 세션을 생성합니다.
 */

import { supabase } from '../supabase';
import { ElectronPreferences } from '../electron/electronPreferences';
import type { OAuthResult } from './types';

/**
 * Electron에서 Google OAuth 실행
 *
 * 1. IPC로 메인 프로세스에 OAuth 요청
 * 2. 메인 프로세스가 시스템 브라우저로 Supabase OAuth URL 열기
 * 3. 로컬 HTTP 서버로 콜백 수신
 * 4. 코드를 렌더러에 전달 → Supabase 세션 생성
 */
export async function handleGoogleSignInElectron(): Promise<OAuthResult> {
  console.log('[OAuth:Electron] Starting Google sign in...');

  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) {
    return { error: { message: 'Electron API를 사용할 수 없습니다', status: 500 } as any };
  }

  try {
    // OAuth 콜백 리스너 등록
    return new Promise<OAuthResult>((resolve) => {
      const cleanup = electronAPI.auth.onOAuthCallback(async (data: any) => {
        cleanup(); // 리스너 해제

        if (data.error) {
          console.error('[OAuth:Electron] OAuth callback error:', data.error);
          resolve({
            error: { message: '로그인이 취소되었습니다', status: 400 } as any,
          });
          return;
        }

        if (data.access_token) {
          // Implicit flow: access_token이 직접 전달됨 (hash fragment 캡처)
          console.log('[OAuth:Electron] Access token received directly, setting session...');
          try {
            const { data: sessionData, error: setSessionError } =
              await supabase.auth.setSession({
                access_token: data.access_token,
                refresh_token: data.refresh_token || '',
              });

            if (setSessionError || !sessionData.session) {
              console.error('[OAuth:Electron] setSession failed:', setSessionError);
              resolve({
                error: { message: '세션 설정 실패', status: 500 } as any,
              });
              return;
            }

            // Electron 저장소에 세션 저장
            await ElectronPreferences.set({
              key: 'supabase_auth_session',
              value: JSON.stringify({
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                expires_at: sessionData.session.expires_at,
                token_type: sessionData.session.token_type,
                user: sessionData.user,
              }),
            });

            console.log('[OAuth:Electron] Authentication completed successfully (implicit flow)');
            resolve({ error: null });
          } catch (err) {
            console.error('[OAuth:Electron] Session creation failed:', err);
            resolve({
              error: { message: '세션 생성 실패', status: 500 } as any,
            });
          }
        } else if (data.code) {
          // PKCE flow: code가 전달됨
          console.log('[OAuth:Electron] OAuth code received, exchanging...');
          try {
            const { data: sessionData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(data.code);

            if (exchangeError || !sessionData.session) {
              console.error('[OAuth:Electron] Code exchange failed:', exchangeError);
              resolve({
                error: { message: '인증 코드 교환 실패', status: 500 } as any,
              });
              return;
            }

            // Electron 저장소에 세션 저장
            await ElectronPreferences.set({
              key: 'supabase_auth_session',
              value: JSON.stringify({
                access_token: sessionData.session.access_token,
                refresh_token: sessionData.session.refresh_token,
                expires_at: sessionData.session.expires_at,
                token_type: sessionData.session.token_type,
                user: sessionData.user,
              }),
            });

            console.log('[OAuth:Electron] Authentication completed successfully (PKCE flow)');
            resolve({ error: null });
          } catch (err) {
            console.error('[OAuth:Electron] Session creation failed:', err);
            resolve({
              error: { message: '세션 생성 실패', status: 500 } as any,
            });
          }
        } else {
          // code도 access_token도 없음 — 에러 처리
          console.error('[OAuth:Electron] No code or access_token received');
          resolve({
            error: { message: '인증 정보를 받지 못했습니다', status: 400 } as any,
          });
        }
      });

      // 메인 프로세스에 OAuth 요청
      electronAPI.auth.openOAuth('google').catch((err: any) => {
        cleanup();
        console.error('[OAuth:Electron] IPC error:', err);
        resolve({
          error: { message: 'OAuth 시작 실패', status: 500 } as any,
        });
      });
    });
  } catch (error) {
    console.error('[OAuth:Electron] Unexpected error:', error);
    return {
      error: { message: '알 수 없는 오류가 발생했습니다', status: 500 } as any,
    };
  }
}
