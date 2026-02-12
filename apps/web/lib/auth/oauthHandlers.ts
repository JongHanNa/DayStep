/**
 * OAuth Handlers
 *
 * Google/Kakao OAuth 로그인 핸들러를 모듈화하여 재사용성을 높입니다.
 * AuthContext에서 분리된 순수 OAuth 로직을 처리합니다.
 */

import { supabase } from "../supabase";
import { toSiteURL } from "../utils";
import type { AuthError } from "@supabase/supabase-js";
import type { OAuthResult } from "./types";

/**
 * Google OAuth 핸들러
 *
 * 웹/Electron 환경을 자동 감지하고 적절한 OAuth 플로우를 실행합니다.
 * - Electron: electronOAuthHandlers 사용
 * - 웹: Supabase OAuth 리다이렉트 사용
 */
export async function handleGoogleSignIn(): Promise<OAuthResult> {
  console.log("[OAuth] Starting Google sign in...");

  try {
    // Electron 환경 체크
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      console.log("[OAuth] Electron environment detected, using Electron OAuth flow");
      const { handleGoogleSignInElectron } = await import('./electronOAuthHandlers');
      return handleGoogleSignInElectron();
    }

    // 웹: OAuth 리다이렉트 사용 (Nextbase 패턴)
    console.log("[OAuth] Using web OAuth flow");

    const redirectUrl = toSiteURL("/auth/callback");
    console.log("[OAuth] Generated redirectTo URL:", redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("[OAuth] Web OAuth failed:", error);
      return { error: mapOAuthError(error) };
    }

    console.log("[OAuth] Web OAuth redirect initiated");
    return { error: null };
  } catch (error) {
    console.error("[OAuth] Google sign in error:", error);
    return { error: mapOAuthError(error) };
  }
}

/**
 * Kakao OAuth 핸들러
 *
 * 웹 환경에서만 지원됩니다.
 */
export async function handleKakaoSignIn(): Promise<OAuthResult> {
  console.log("[OAuth] Starting Kakao sign in...");

  try {
    // 웹: 커스텀 OAuth 플로우
    console.log("[OAuth] Using web Kakao OAuth flow");

    const kakaoClientId = "b00dcde236c2f8b028a981303aeb4253";
    const redirectUri = `${window.location.origin}/auth/kakao-callback`;
    const state = btoa(
      JSON.stringify({
        timestamp: Date.now(),
        origin: window.location.origin,
      })
    );

    const kakaoAuthUrl =
      `https://kauth.kakao.com/oauth/authorize?` +
      `client_id=${kakaoClientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=profile_nickname profile_image&` +
      `state=${state}`;

    // 상태를 sessionStorage에 저장
    globalThis.sessionStorage.setItem("kakao_oauth_state", state);

    // Kakao 인증 페이지로 리다이렉트
    window.location.href = kakaoAuthUrl;

    return { error: null };
  } catch (error) {
    console.error("[OAuth] Kakao sign in error:", error);
    return { error: mapOAuthError(error) };
  }
}

/**
 * OAuth 로그아웃 헬퍼
 *
 * 모든 OAuth 세션을 정리합니다.
 */
export async function clearOAuthSessions(): Promise<void> {
  console.log("[OAuth] Clearing OAuth sessions...");

  // 웹: Google OAuth 세션 제거를 위한 iframe 처리
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = "https://accounts.google.com/Logout";
  document.body.appendChild(iframe);

  setTimeout(() => {
    document.body.removeChild(iframe);
    console.log("[OAuth] Web OAuth sessions cleared");
  }, 1000);
}

/**
 * OAuth 에러 매핑 함수
 *
 * 다양한 OAuth 에러를 사용자 친화적인 메시지로 변환합니다.
 */
export function mapOAuthError(error: unknown): AuthError {
  if (error instanceof Error) {
    // 특정 OAuth 에러 패턴 매핑
    if (
      error.message.includes("popup_closed") ||
      error.message.includes("cancelled")
    ) {
      return { message: "로그인이 취소되었습니다", status: 400 } as AuthError;
    }
    if (
      error.message.includes("network") ||
      error.message.includes("Network")
    ) {
      return {
        message: "네트워크 연결을 확인해주세요",
        status: 0,
      } as AuthError;
    }
    if (error.message.includes("timeout")) {
      return {
        message: "로그인 요청이 시간 초과되었습니다",
        status: 408,
      } as AuthError;
    }
    if (
      error.message.includes("unauthorized") ||
      error.message.includes("403")
    ) {
      return { message: "인증이 거부되었습니다", status: 403 } as AuthError;
    }

    return { message: error.message, status: 500 } as AuthError;
  }

  return {
    message: "알 수 없는 오류가 발생했습니다",
    status: 500,
  } as AuthError;
}
