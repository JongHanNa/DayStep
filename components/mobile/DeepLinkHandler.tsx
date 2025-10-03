"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface DeepLinkData {
  url: string;
  section: string;
  todoId?: string;
}

/**
 * 위젯에서 오는 딥링크를 처리하는 컴포넌트
 */
export const DeepLinkHandler: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    // 딥링크 이벤트 리스너 등록
    const handleDeepLink = (event: CustomEvent<DeepLinkData>) => {
      const { section, todoId, url } = event.detail;

      console.log("Deep link received:", event.detail);

      // OAuth 콜백은 DeepLinkHandler에서 처리하지 않음 (mobile/src/App.tsx에서 처리)
      if (
        url &&
        (url.includes("auth/callback") ||
          url.includes("oauth") ||
          url.includes("code="))
      ) {
        console.log(
          "OAuth 콜백 Deep Link 감지 - DeepLinkHandler에서 무시하고 App.tsx에서 처리"
        );
        return;
      }

      // 섹션별로 네비게이션 처리
      switch (section) {
        case "todos":
          if (todoId) {
            // 특정 할일로 이동 (메인 페이지에서 모달 열기)
            router.push(`/?todo=${todoId}`);
          } else {
            // 메인 페이지 (타임라인)로 이동
            router.push("/");
          }
          break;

        case "repository":
          if (todoId) {
            router.push(`/repository?id=${todoId}`);
          } else {
            router.push("/repository");
          }
          break;

        default:
          // 기본적으로 메인 페이지로 이동
          router.push("/");
          break;
      }
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener("daystepDeepLink", handleDeepLink as EventListener);

    // Capacitor 환경에서 직접 전역 이벤트 처리
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      (window as any).handleDayStepDeepLink = (data: DeepLinkData) => {
        handleDeepLink(new CustomEvent("daystepDeepLink", { detail: data }));
      };
    }

    return () => {
      window.removeEventListener(
        "daystepDeepLink",
        handleDeepLink as EventListener
      );
      if (
        typeof window !== "undefined" &&
        (window as any).handleDayStepDeepLink
      ) {
        delete (window as any).handleDayStepDeepLink;
      }
    };
  }, [router]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
};
