'use client';

import ADHDSidebar from '@/components/adhd/navigation/ADHDSidebar';
import ADHDBottomTabBar from '@/components/adhd/navigation/ADHDBottomTabBar';

/**
 * 설정 페이지 레이아웃
 * 홈화면과 동일하게 사이드바(데스크톱)/하단탭(모바일) 유지
 */
interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* 데스크톱: 사이드바 */}
      <div className="hidden md:block">
        <ADHDSidebar />
      </div>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 min-w-0 md:ml-16 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* 모바일: 하단 탭바 */}
      <div className="md:hidden">
        <ADHDBottomTabBar />
      </div>
    </div>
  );
}
