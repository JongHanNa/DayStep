import React from "react";
import type { Metadata } from "next";
import "./globals.css";

// 모바일 빌드 호환성을 위해 layout에서는 force-dynamic 제거
// 개별 페이지/라우트에서 필요시 설정
import { generateSEO } from "@/lib/seo";
import { AuthProvider, AuthState } from "./context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import SecondBrainBottomNav from "@/components/layout/SecondBrainBottomNav";
import { openDyslexic } from "@/lib/fonts";
import { FontProvider } from "@/components/providers/FontProvider";
// 성능 모니터링 비활성화
// import { PerformanceProvider } from "@/components/providers/PerformanceProvider";
// import { PerformanceMonitorProvider } from "@/components/dev/PerformanceMonitor";
import { Toaster } from "sonner";
import { RealtimeSyncProvider } from "@/components/providers/RealtimeSyncProvider";
import { ReminderProvider } from "@/components/providers/ReminderProvider";
import { MotivationProvider } from "@/components/providers/MotivationProvider";
import { NoteTagProvider } from "@/components/providers/NoteTagProvider";
import { STYLING, UI_LAYOUT } from "@/lib/constants";
import { getTailwindClasses } from "@/lib/theme-colors";
export const metadata: Metadata = {
  ...generateSEO({}),
};

// 쿠키 문제 해결을 위해 클라이언트 전용 인증으로 변경
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 서버 클라이언트 호출 제거 - AuthProvider에서 클라이언트 사이드로 처리
  const initialAuth: AuthState = {
    isAuthenticated: false, // 기본값, AuthProvider에서 클라이언트 사이드에서 확인
    user: null,
  };

  const { safeAreaBackground, darkSafeArea } = getTailwindClasses();

  return (
    <html lang="ko" className={openDyslexic.variable}>
      <body className="antialiased mobile-container scrollbar-hide">
        <ThemeProvider>
          <FontProvider>
            <AuthProvider initialAuth={initialAuth}>
              <MotivationProvider>
                <NoteTagProvider>
                  <RealtimeSyncProvider>
                    <ReminderProvider>
                    {/* <Navigation /> */}
                    <main
                      className={`scrollbar-hide ${safeAreaBackground} ${darkSafeArea} pb-16`}
                    >
                      {children}
                    </main>
                    <SecondBrainBottomNav />
                    <Toaster
                  position="top-right"
                  richColors
                  offset={UI_LAYOUT.TOAST_OFFSET}
                  toastOptions={{
                    style: {
                      fontSize: STYLING.TOAST_FONT_SIZE,
                      padding: STYLING.TOAST_PADDING,
                      minHeight: `${STYLING.TOAST_MIN_HEIGHT}px`,
                      borderRadius: `${STYLING.TOAST_BORDER_RADIUS}px`,
                      boxShadow: STYLING.TOAST_BOX_SHADOW,
                    },
                    className: STYLING.MOBILE_TOAST_CLASS,
                  }}
                    />
                    </ReminderProvider>
                  </RealtimeSyncProvider>
                </NoteTagProvider>
              </MotivationProvider>
              </AuthProvider>
            </FontProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}