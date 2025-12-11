'use client';

import { usePathname } from 'next/navigation';
import { Menu, Sun, Moon } from 'lucide-react';
import { useSidebarStore } from '@/state/stores/sidebarStore';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { getPageTitleFromPath } from '@/config/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/app/context/AuthContext';

export default function AppHeader() {
  const pathname = usePathname();
  const { open } = useSidebarStore();
  const currentMode = useADHDModeStore(state => state.currentMode);
  const { adhdModeEnabled } = useSettingsStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  const pageTitle = getPageTitleFromPath(pathname);

  // pathname의 trailing slash 제거 (일관된 비교를 위해)
  const normalizedPathname = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname;

  // 세션 확인 중에는 헤더를 숨김 (Capacitor 환경에서 깜빡임 방지)
  // CSS 로딩 실패 대비 인라인 스타일 적용
  if (loading) {
    return (
      <div style={{ display: 'none', opacity: 0, pointerEvents: 'none' }}>
        {/* 완전 숨김 보장 */}
      </div>
    );
  }

  // 숨겨야 하는 경로
  // - /login, /landing, /second-brain/onboarding: 항상 숨김
  // - /: 비인증 시 숨김 (LandingPage), 인증 시 표시 (GraphView)
  const alwaysHiddenPaths = ['/login', '/landing', '/second-brain/onboarding'];

  // ADHD 모드에서 헤더 숨김 (entry, execute, care)
  // organize 모드는 헤더 표시 (그래프 뷰 표시)
  // currentMode가 null이어도 adhdModeEnabled가 true면 entry 화면이므로 숨김
  const headerHiddenModes: ADHDMode[] = ['entry', 'execute', 'care'];
  const shouldHideForADHDMode = adhdModeEnabled && (currentMode === null || headerHiddenModes.includes(currentMode));

  const shouldHide = alwaysHiddenPaths.some(path => normalizedPathname === path) ||
                     (normalizedPathname === '/' && !isAuthenticated) ||
                     shouldHideForADHDMode;

  // CSS 로딩 실패 대비 인라인 스타일로 완전 숨김
  if (shouldHide) {
    return (
      <div style={{ display: 'none', opacity: 0, pointerEvents: 'none' }}>
        {/* 완전 숨김 보장 */}
      </div>
    );
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-base-300 safe-area-top">
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

          {/* 오른쪽: 라이트/다크 모드 토글 */}
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
        </div>
      </header>

      {/* 헤더 높이만큼 공간 확보 (safe-area-top 포함) */}
      <div className="h-[--header-total-height]" />
    </>
  );
}
