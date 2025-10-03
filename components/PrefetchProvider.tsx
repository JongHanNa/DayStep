"use client";

import { useEffect } from "react";
import { smartPrefetch } from "@/components/lazy/LazyComponents";

/**
 * 컴포넌트 프리페칭 제공자
 * 네트워크 상태에 따라 지능적으로 컴포넌트들을 미리 로딩
 */
export function PrefetchProvider() {
  useEffect(() => {
    // 페이지 로딩 완료 후 프리페칭 시작
    if (document.readyState === "complete") {
      smartPrefetch();
    } else {
      const handleLoad = () => {
        smartPrefetch();
        window.removeEventListener("load", handleLoad);
      };
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
    
    // 페이지가 이미 로딩된 경우 cleanup 없음
    return;
  }, []);

  // 사용자 인터랙션에 따른 추가 프리페칭
  useEffect(() => {
    // 마우스 오버나 터치 시작시 해당 페이지 컴포넌트 프리페치
    const handleInteraction = (event: Event) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a[href]") as HTMLAnchorElement;

      if (link && link.href.includes(window.location.origin)) {
        const path = new URL(link.href).pathname;

        // 페이지별 컴포넌트 프리페치
        if (path.includes("/todos")) {
          import("@/components/todos/TodoStats");
          import("@/components/todos/TodoFilter");
        } else if (path.includes("/repository")) {
          import("@/components/repository/RepositoryList");
        }
      }
    };

    // 마우스 오버 및 터치 시작 이벤트에 리스너 추가
    document.addEventListener("mouseover", handleInteraction, {
      passive: true,
    });
    document.addEventListener("touchstart", handleInteraction, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mouseover", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  return null; // UI 렌더링 없음
}
