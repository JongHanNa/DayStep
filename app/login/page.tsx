"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoginButton } from "@/components/auth/LoginButton";
import { UnauthenticatedOnly } from "@/components/auth/AuthGuard";
import DemoLoginForm from "@/components/auth/DemoLoginForm";

// URL 파라미터를 직접 파싱하는 함수 (static export 호환)
function getUrlParams() {
  if (typeof window === "undefined") return { error: null, redirect: null, demo: null };

  const urlParams = new URLSearchParams(window.location.search);
  return {
    error: urlParams.get("error"),
    redirect: urlParams.get("redirect"),
    demo: urlParams.get("demo"),
  };
}

// 오류 메시지 매핑
function getErrorMessage(error: string | null) {
  switch (error) {
    // 서버 라우트 에러들 (새로 추가)
    case "no_code":
      return "인증 코드가 없습니다. 다시 로그인을 시도해주세요.";
    case "session_null":
      return "세션 생성에 실패했습니다. 다시 로그인을 시도해주세요.";
    case "unknown_error":
      return "알 수 없는 오류가 발생했습니다. 다시 시도해주세요.";
    // 기존 에러들
    case "missing_code":
      return "인증 코드가 누락되었습니다. 다시 시도해주세요.";
    case "session_exchange_failed":
      return "인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    case "flow_state_not_found":
      return "로그인 세션이 만료되었습니다. 다시 로그인을 시도해주세요.";
    case "code_verifier_failed":
      return "인증 검증에 실패했습니다. 다시 로그인을 시도해주세요.";
    case "no_user_data":
      return "사용자 정보를 가져올 수 없습니다. 다시 시도해주세요.";
    case "callback_failed":
      return "로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    case "api_callback_failed":
      return "서버 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    case "network_error":
      return "네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.";
    case "no_auth_code":
      return "인증 코드를 받지 못했습니다. 다시 시도해주세요.";
    case "logout_failed":
      return "로그아웃 처리 중 오류가 발생했습니다.";
    case "middleware_error":
      return "시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    case "flow_expired":
      return "로그인 세션이 만료되었습니다. 다시 로그인을 시도해주세요.";
    case "mobile_auth_failed":
      return "모바일 인증 처리 중 오류가 발생했습니다. 다시 시도해주세요.";
    default:
      if (error && error.length > 0) {
        return `로그인 처리 중 오류가 발생했습니다: ${error}`;
      }
      return null;
  }
}

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);
  const [urlParams, setUrlParams] = useState<{
    error: string | null;
    redirect: string | null;
    demo: string | null;
  }>({ error: null, redirect: null, demo: null });

  // 개발 환경 여부 확인 (웹 개발 또는 Capacitor 개발 환경)
  const isDevelopment = process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_CAPACITOR_ENV === 'development';

  useEffect(() => {
    // LoginPage 마운트 - 클라이언트 사이드 렌더링
    setIsClient(true);
    setUrlParams(getUrlParams());
  }, []);

  useEffect(() => {
    if (urlParams.error) {
      console.error("로그인 페이지 오류:", urlParams.error);
    }
  }, [urlParams.error]);

  // 클라이언트에서만 렌더링
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">페이지 로딩 중...</p>
        </div>
      </div>
    );
  }

  const errorMessage = getErrorMessage(urlParams.error);

  return (
    <UnauthenticatedOnly>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 sm:space-y-10">
          {/* 헤더 */}
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              DayStep
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
              로그인
            </h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              나만의 다짐과 할일을 체계적으로 관리해보세요
            </p>

            {urlParams.redirect && (
              <p className="mt-4 sm:mt-5 text-sm sm:text-base text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 p-3 sm:p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
                로그인 후 요청하신 페이지로 이동합니다
              </p>
            )}
          </div>

          {/* 오류 메시지 */}
          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm sm:text-base text-red-700 dark:text-red-300">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* 로그인 폼 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/20 p-10 sm:p-12">
            <div className="space-y-6 sm:space-y-8">
              <LoginButton provider="google" />

              {/* 데모 모드: 포트폴리오 체험 로그인 */}
              {urlParams.demo === 'true' && (
                <>
                  {/* 구분선 */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white/80 dark:bg-gray-800/80 px-4 text-gray-500 dark:text-gray-400">
                        Pro 계정 체험
                      </span>
                    </div>
                  </div>

                  {/* 데모 로그인 폼 */}
                  <DemoLoginForm />
                </>
              )}

              {/* 개발 환경 전용: 테스트 계정 로그인 */}
              {isDevelopment && (
                <>
                  {/* 구분선 */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white/80 dark:bg-gray-800/80 px-4 text-gray-500 dark:text-gray-400">
                        개발 전용
                      </span>
                    </div>
                  </div>

                  {/* 테스트 계정 로그인 버튼 */}
                  <LoginButton provider="test-account" />
                </>
              )}
            </div>
          </div>

          {/* 푸터 */}
          <div className="text-center text-sm sm:text-base text-gray-500 dark:text-gray-400">
            <p className="leading-relaxed">
              로그인하면{" "}
              <a
                href="/terms"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
              >
                이용약관
              </a>{" "}
              및{" "}
              <a
                href="/privacy"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-medium"
              >
                개인정보처리방침
              </a>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </UnauthenticatedOnly>
  );
}
