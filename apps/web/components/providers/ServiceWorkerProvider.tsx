"use client";

import { useEffect, useCallback } from "react";
import { toast } from "sonner";

/**
 * Service Worker 등록 및 관리를 담당하는 Provider
 */
export function ServiceWorkerProvider() {
  const registerServiceWorker = useCallback(async () => {
    try {
      console.log("[PWA] Registering Service Worker...");

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none", // 업데이트 시 캐시 무시
      });

      console.log(
        "[PWA] Service Worker registered successfully:",
        registration
      );

      // Service Worker 상태 변경 감지
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        if (newWorker) {
          console.log("[PWA] New Service Worker installing...");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                // 새 버전 사용 가능
                console.log("[PWA] New version available");
                showUpdateNotification();
              } else {
                // 첫 설치 완료
                console.log("[PWA] App ready for offline use");
                showInstallNotification();
              }
            }
          });
        }
      });

      // 활성 Service Worker 변경 감지
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // 정기적으로 업데이트 확인 (1시간마다)
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    } catch (error) {
      console.error("[PWA] Service Worker registration failed:", error);
    }
  }, []);

  useEffect(() => {
    // Service Worker가 지원되는지 확인
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      registerServiceWorker();
    }
  }, [registerServiceWorker]);

  const showInstallNotification = () => {
    toast.success("앱이 오프라인에서도 사용 가능합니다!", {
      description: "DayStep를 인터넷 연결 없이도 이용할 수 있어요.",
      duration: 5000,
    });
  };

  const showUpdateNotification = () => {
    toast.info("새 버전이 사용 가능합니다", {
      description: "페이지를 새로고침하여 최신 버전을 사용하세요.",
      action: {
        label: "새로고침",
        onClick: () => window.location.reload(),
      },
      duration: 10000,
    });
  };

  return null; // UI를 렌더링하지 않는 Provider
}

/**
 * PWA 설치 프롬프트 관리 Hook
 */
export function usePWAInstall() {
  useEffect(() => {
    let deferredPrompt: any = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("[PWA] Install prompt triggered");

      // 기본 설치 프롬프트 방지
      e.preventDefault();
      deferredPrompt = e;

      // 사용자 정의 설치 UI 표시
      showInstallPrompt();
    };

    const handleAppInstalled = () => {
      console.log("[PWA] App installed successfully");
      deferredPrompt = null;

      toast.success("DayStep가 설치되었습니다!", {
        description: "홈 화면에서 바로 앱을 실행할 수 있어요.",
        duration: 5000,
      });
    };

    const showInstallPrompt = () => {
      toast.info("DayStep를 홈 화면에 추가하세요", {
        description: "앱처럼 빠르고 편리하게 이용할 수 있어요.",
        action: {
          label: "설치",
          onClick: async () => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;

              if (outcome === "accepted") {
                console.log("[PWA] User accepted install prompt");
              } else {
                console.log("[PWA] User dismissed install prompt");
              }

              deferredPrompt = null;
            }
          },
        },
        duration: 15000,
      });
    };

    // 이벤트 리스너 등록
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 정리
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);
}

/**
 * 네트워크 상태 감지 Hook
 */
export function useNetworkStatus() {
  useEffect(() => {
    const handleOnline = () => {
      console.log("[PWA] Network: Online");
      toast.success("인터넷 연결이 복구되었습니다", {
        description: "모든 기능을 정상적으로 이용할 수 있어요.",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      console.log("[PWA] Network: Offline");
      toast.warning("오프라인 모드입니다", {
        description: "일부 기능은 인터넷 연결 시 동기화됩니다.",
        duration: 5000,
      });
    };

    // 네트워크 상태 변경 감지
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // 현재 상태 확인
    if (!navigator.onLine) {
      handleOffline();
    }

    // 정리
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return navigator.onLine;
}
