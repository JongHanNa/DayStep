'use client';

import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon, Palette } from 'lucide-react';
import { useSidebarStore } from '@/state/stores/sidebarStore';
import { getPageTitleFromPath } from '@/config/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';
import ColorThemeModal from '@/components/settings/ColorThemeModal';

export default function AppHeader() {
  const pathname = usePathname();
  const { open } = useSidebarStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [isColorThemeModalOpen, setIsColorThemeModalOpen] = useState(false);

  const pageTitle = getPageTitleFromPath(pathname);

  // 숨겨야 하는 경로
  const hiddenPaths = ['/', '/login', '/landing', '/second-brain/onboarding'];
  const shouldHide = hiddenPaths.some(path => pathname === path);

  if (shouldHide) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-base-100 border-b border-base-200 safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          {/* 왼쪽: 햄버거 메뉴 버튼 */}
          <button
            onClick={open}
            className="btn btn-ghost btn-circle"
            aria-label="메뉴 열기"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* 중앙: 페이지 제목 */}
          <h1 className="text-lg font-semibold text-base-content">
            {pageTitle}
          </h1>

          {/* 오른쪽: 테마 버튼들 */}
          <div className="flex items-center gap-1">
            {/* 라이트/다크 모드 토글 */}
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-circle"
              aria-label={resolvedTheme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            >
              {resolvedTheme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            {/* 컬러 테마 버튼 */}
            <button
              onClick={() => setIsColorThemeModalOpen(true)}
              className="btn btn-ghost btn-circle"
              aria-label="컬러 테마 선택"
            >
              <Palette className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 헤더 높이만큼 공간 확보 (safe-area-top 포함) */}
      <div className="h-14 safe-area-top" />

      {/* 컬러 테마 모달 */}
      <ColorThemeModal
        isOpen={isColorThemeModalOpen}
        onClose={() => setIsColorThemeModalOpen(false)}
      />
    </>
  );
}
