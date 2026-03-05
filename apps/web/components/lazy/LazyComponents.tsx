"use client";

import { lazy, Suspense } from "react";
import {
  LoadingSkeleton,
  TodoItemSkeleton,
} from "@/components/ui/loading-skeleton";
import { CenteredLoadingSpinner } from "@/components/ui/loading-spinner";

// 동적 import로 컴포넌트 분할

const TodoStatsComponent = lazy(() =>
  import("@/components/todos/TodoStats").then((module) => ({
    default: module.TodoStats,
  }))
);
const TodoFilterComponent = lazy(() =>
  import("@/components/todos/TodoFilter").then((module) => ({
    default: module.TodoFilter,
  }))
);

// Wrapper 컴포넌트들

export function LazyTodoStats() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <LoadingSkeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      }
    >
      <TodoStatsComponent />
    </Suspense>
  );
}

export function LazyTodoFilter() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col sm:flex-row gap-4">
          <LoadingSkeleton className="h-10 flex-1" />
          <LoadingSkeleton className="h-10 w-32" />
          <LoadingSkeleton className="h-10 w-24" />
        </div>
      }
    >
      <TodoFilterComponent />
    </Suspense>
  );
}

// 로그인 관련 컴포넌트들도 동적 로드
const LoginButtonComponent = lazy(() =>
  import("@/components/auth/LoginButton").then((module) => ({
    default: module.LoginButton,
  }))
);

export function LazyLoginButton({
  provider,
}: {
  provider: "google";
}) {
  return (
    <Suspense fallback={<LoadingSkeleton className="h-12 w-full rounded-lg" />}>
      <LoginButtonComponent provider={provider} />
    </Suspense>
  );
}

// 이미지 최적화 컴포넌트들
const ProgressiveImageComponent = lazy(() =>
  import("@/components/ui/optimized-image").then((module) => ({
    default: module.ProgressiveImage,
  }))
);
const LazyImageComponent = lazy(() =>
  import("@/components/ui/optimized-image").then((module) => ({
    default: module.LazyImage,
  }))
);
const ResponsiveImageComponent = lazy(() =>
  import("@/components/ui/optimized-image").then((module) => ({
    default: module.ResponsiveImage,
  }))
);
const AdaptiveImageComponent = lazy(() =>
  import("@/components/ui/optimized-image").then((module) => ({
    default: module.AdaptiveImage,
  }))
);

// 이미지 최적화 Lazy 래퍼들
export function LazyProgressiveImage(props: any) {
  return (
    <Suspense
      fallback={
        <div
          className="bg-muted animate-pulse"
          style={{ width: props.width, height: props.height }}
        />
      }
    >
      <ProgressiveImageComponent {...props} />
    </Suspense>
  );
}

export function LazyLazyImage(props: any) {
  return (
    <Suspense
      fallback={
        <div
          className="bg-muted animate-pulse"
          style={{ width: props.width, height: props.height }}
        />
      }
    >
      <LazyImageComponent {...props} />
    </Suspense>
  );
}

export function LazyResponsiveImage(props: any) {
  return (
    <Suspense
      fallback={
        <div
          className="bg-muted animate-pulse"
          style={{ width: props.width, height: props.height }}
        />
      }
    >
      <ResponsiveImageComponent {...props} />
    </Suspense>
  );
}

export function LazyAdaptiveImage(props: any) {
  return (
    <Suspense
      fallback={
        <div
          className="bg-muted animate-pulse"
          style={{ width: props.width, height: props.height }}
        />
      }
    >
      <AdaptiveImageComponent {...props} />
    </Suspense>
  );
}

// 프리페칭 유틸리티 함수들
export const prefetchTodoComponents = () => {
  if (typeof window !== "undefined") {
    import("@/components/todos/TodoStats");
    import("@/components/todos/TodoFilter");
  }
};

export const prefetchAuthComponents = () => {
  if (typeof window !== "undefined") {
    import("@/components/auth/LoginButton");
  }
};

export const prefetchImageComponents = () => {
  if (typeof window !== "undefined") {
    import("@/components/ui/optimized-image");
  }
};

// 네트워크 상태에 따른 선택적 프리페칭
export const smartPrefetch = () => {
  if (typeof window === "undefined") return;

  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  // 빠른 네트워크 연결시에만 프리페칭
  if (connection) {
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;

    // 4G 또는 wifi 환경에서만 프리페칭
    if (effectiveType === "4g" || downlink > 1.5) {
      // 200ms 지연 후 프리페칭 시작
      setTimeout(() => {
        prefetchTodoComponents();
        prefetchImageComponents(); // 이미지 컴포넌트도 프리페치
      }, 200);
    }
  } else {
    // 네트워크 정보를 얻을 수 없으면 보수적으로 접근
    setTimeout(() => {
      prefetchTodoComponents();
    }, 500);
  }
};
