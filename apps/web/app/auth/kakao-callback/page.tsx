"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleKakaoCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
          console.error("Kakao OAuth 오류:", error);
          router.push(`/login?error=${encodeURIComponent(error)}`);
          return;
        }

        if (!code) {
          console.error("인증 코드가 없습니다");
          router.push("/login?error=no_code");
          return;
        }

        // 상태 검증
        const storedState = sessionStorage.getItem("kakao_oauth_state");
        if (!storedState || storedState !== state) {
          console.error("상태 검증 실패");
          router.push("/login?error=state_mismatch");
          return;
        }

        // sessionStorage 정리
        sessionStorage.removeItem("kakao_oauth_state");

        // 서버사이드에서 토큰 교환 + 사용자 인증을 한번에 처리
        const authResponse = await fetch("/api/auth/kakao-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!authResponse.ok) {
          const authError = await authResponse.json().catch(() => ({}));
          throw new Error(authError.error || "카카오 인증 처리 실패");
        }

        const authData = await authResponse.json();

        if (authData.error) {
          throw new Error(authData.error);
        }

        // 서버에서 받은 세션으로 Supabase 클라이언트 세션 설정
        if (authData.session) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
          });

          if (sessionError) {
            throw new Error(`세션 설정 실패: ${sessionError.message}`);
          }
        } else {
          throw new Error("서버에서 세션을 받지 못했습니다");
        }

        console.log("카카오 로그인 성공!");

        // 성공 시 메인 페이지로 리다이렉트
        router.push("/");
      } catch (error) {
        console.error("Kakao 콜백 처리 오류:", error);
        router.push("/login?error=callback_failed");
      }
    };

    handleKakaoCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">카카오 로그인 처리 중...</p>
      </div>
    </div>
  );
}

export default function KakaoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">카카오 로그인 처리 중...</p>
          </div>
        </div>
      }
    >
      <KakaoCallbackContent />
    </Suspense>
  );
}
