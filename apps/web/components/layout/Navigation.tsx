"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { Clock, Settings } from "lucide-react";
import { SyncStatusIndicator } from "@/components/ui/pull-to-refresh";
import { usePlatformUI } from "@/hooks/usePlatformUI";
import { useEffect, useState } from "react";

/**
 * 네비게이션 컴포넌트
 */
export function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { isMobile } = usePlatformUI();
  const [safeAreaTop, setSafeAreaTop] = useState(0);

  // console.log('Navigation - isAuthenticated:', isAuthenticated, 'user:', user?.id);

  useEffect(() => {
    const setupSafeArea = () => {
      // 웹 환경에서는 Safe Area Insets CSS 활용
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaInsetTop = computedStyle.getPropertyValue(
        "env(safe-area-inset-top)"
      );

      if (safeAreaInsetTop && safeAreaInsetTop !== "0px") {
        const insetValue = parseInt(safeAreaInsetTop.replace("px", "")) || 0;
        setSafeAreaTop(insetValue);
      } else {
        setSafeAreaTop(0);
      }
    };

    setupSafeArea();
  }, []);

  const navigation = [
    { name: "타임라인", href: "/", icon: Clock },
    { name: "설정", href: "/settings", icon: Settings },
  ];


  if (!isAuthenticated) {
    return null;
  }

  // 모바일 환경에서는 네비게이션 숨기기
  if (isMobile) {
    return null;
  }

  return (
    <nav
      className="bg-background border-b border-border sticky top-0 z-[60] hardware-accelerated"
      style={{
        paddingTop: `${safeAreaTop}px`,
        minHeight: `${56 + safeAreaTop}px`,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* 로고 */}
          <div className="flex items-center">
            <Link
              href="/"
              className="touch-target text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm"
              aria-label="DayStep 홈으로 이동"
            >
              DayStep
            </Link>
          </div>

          {/* 데스크톱 네비게이션 */}
          <div
            className="flex items-center space-x-1"
            role="navigation"
            aria-label="주요 네비게이션"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`touch-target flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${item.name} 페이지로 이동`}
                >
                  <Icon className="w-4 h-4 mr-2" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* 동기화 상태 정보 제거됨 - 설정화면으로 이동 */}
        </div>
      </div>
    </nav>
  );
}
