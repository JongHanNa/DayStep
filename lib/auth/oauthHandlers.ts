/**
 * OAuth Handlers
 *
 * Google/Kakao OAuth 로그인 핸들러를 모듈화하여 재사용성을 높입니다.
 * AuthContext에서 분리된 순수 OAuth 로직을 처리합니다.
 */

import { supabase } from "../supabase";
import { toSiteURL } from "../utils";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { AuthError } from "@supabase/supabase-js";
import type { OAuthProvider, OAuthResult } from "./types";

/**
 * Google OAuth 핸들러
 *
 * 웹/모바일 환경을 자동 감지하고 적절한 OAuth 플로우를 실행합니다.
 * - 모바일: @capgo/capacitor-social-login 네이티브 SDK 사용
 * - 웹: Supabase OAuth 리다이렉트 사용
 */
export async function handleGoogleSignIn(): Promise<OAuthResult> {
  console.log("[OAuth] Starting Google sign in...");

  try {
    const platform = Capacitor.getPlatform();
    const isNativePlatform = Capacitor.isNativePlatform();

    console.log("[OAuth] Platform detection:", {
      platform,
      isNativePlatform,
      protocol:
        typeof window !== "undefined" ? window.location.protocol : "unknown",
      hostname:
        typeof window !== "undefined" ? window.location.hostname : "unknown",
    });

    if (platform === "ios" || isNativePlatform) {
      // 모바일: Native SDK 사용
      console.log("[OAuth] Using native Google Sign-In SDK");

      const { SocialLogin } = await import("@capgo/capacitor-social-login");

      if (!SocialLogin) {
        throw new Error("Capacitor Social Login 플러그인을 찾을 수 없습니다.");
      }

      // 플러그인 초기화
      await SocialLogin.initialize({
        google: {
          webClientId:
            process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
            "757915574433-i9todve2jiq000i5eeqob0b99oa84r42.apps.googleusercontent.com",
          iOSClientId:
            process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
            "757915574433-ksm0oaisr0e8heoi4c1ffld3v0jvqkr5.apps.googleusercontent.com",
          iOSServerClientId:
            process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
            "757915574433-i9todve2jiq000i5eeqob0b99oa84r42.apps.googleusercontent.com",
        },
      });

      const loginResult = await SocialLogin.login({
        provider: "google",
        options: {
          scopes: ["email", "profile"],
        },
      });

      if (loginResult.provider !== "google") {
        throw new Error("예상치 못한 로그인 결과입니다.");
      }

      const googleResult = loginResult.result as any;
      const idToken = googleResult.idToken || googleResult.accessToken?.token;

      if (!idToken) {
        throw new Error("Google 로그인에서 idToken을 받지 못했습니다.");
      }

      console.log(
        "[OAuth] Native Google login successful, creating Supabase session..."
      );

      // Supabase 세션 생성
      const { data: sessionData, error: supabaseError } =
        await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });

      if (supabaseError || !sessionData.session || !sessionData.user) {
        console.error(
          "[OAuth] Supabase session creation failed:",
          supabaseError
        );
        throw supabaseError || new Error("Supabase 세션 생성 실패");
      }

      // 세션을 Capacitor Preferences에 저장
      await Preferences.set({
        key: "supabase_auth_session",
        value: JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: sessionData.session.expires_at,
          token_type: sessionData.session.token_type,
          user: sessionData.user,
        }),
      });

      console.log(
        "[OAuth] Native Google authentication completed successfully"
      );
      return { error: null };
    } else {
      // 웹: OAuth 리다이렉트 사용 (Nextbase 패턴)
      console.log("[OAuth] Using web OAuth flow");

      // 🎯 Nextbase 패턴: toSiteURL 함수로 안전한 redirectTo 설정
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
    }
  } catch (error) {
    console.error("[OAuth] Google sign in error:", error);
    return { error: mapOAuthError(error) };
  }
}

/**
 * Kakao OAuth 핸들러
 *
 * 현재는 웹 환경에서만 지원됩니다.
 * 모바일에서는 아직 구현되지 않았습니다.
 */
export async function handleKakaoSignIn(): Promise<OAuthResult> {
  console.log("[OAuth] Starting Kakao sign in...");

  try {
    const isNativePlatform = Capacitor.isNativePlatform();

    if (isNativePlatform) {
      // 모바일에서는 아직 Kakao 미지원
      console.warn("[OAuth] Kakao login not supported on mobile");
      return {
        error: {
          message: "모바일에서는 카카오 로그인이 지원되지 않습니다",
          status: 400,
        } as AuthError,
      };
    }

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

  const isNativePlatform = Capacitor.isNativePlatform();

  if (isNativePlatform) {
    // 모바일: Native SDK 로그아웃
    try {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      await SocialLogin.logout({ provider: "google" });
      console.log("[OAuth] Native OAuth sessions cleared");
    } catch (error) {
      console.error("[OAuth] Native logout error:", error);
    }
  } else {
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

  // Capacitor Preferences에서 OAuth 관련 키들 삭제
  const keysToRemove = [
    "supabase_auth_session",
    "supabase.auth.session",
    "supabase.auth.token",
    "capacitor_session",
  ];

  for (const key of keysToRemove) {
    try {
      await Preferences.remove({ key });
      console.log(`[OAuth] Preferences key removed: ${key}`);
    } catch (prefError) {
      console.warn(
        `[OAuth] Failed to remove preferences key: ${key}`,
        prefError
      );
    }
  }
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
