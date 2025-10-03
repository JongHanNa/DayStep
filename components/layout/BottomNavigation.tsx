"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Clock, Settings } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

/**
 * 하단 네비게이션 컴포넌트
 * 모바일 친화적 하단 네비게이션 바
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // 인증되지 않은 경우 표시하지 않음
  if (!isAuthenticated) {
    return null;
  }

  const navigation = [
    { name: "타임라인", href: "/", icon: Clock },
    { name: "설정", href: "/settings", icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[50] shadow-lg hardware-accelerated"
      style={{
        backgroundColor: "#ededee",
        paddingBottom: "env(safe-area-inset-bottom)",
        minHeight: "calc(56px + env(safe-area-inset-bottom))",
      }}
      role="navigation"
      aria-label="하단 네비게이션"
    >
      {/* 하단에서 위로 드래그할 수 있음을 나타내는 인디케이터 - 숨김 처리 */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full opacity-0" />

      <div className="flex items-center justify-around pt-3 pb-2 px-6">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`touch-target flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 focus:outline-none ${
                isActive
                  ? "text-brand scale-105 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 active:scale-95"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.name} 페이지로 이동`}
            >
              <Icon
                className={`w-6 h-6 transition-all duration-300 ${
                  isActive ? 'scale-110' : ''
                }`}
                aria-hidden="true"
              />
              <span className={`text-sm mt-1 font-semibold transition-all duration-300 ${
                isActive ? 'text-brand' : ''
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}