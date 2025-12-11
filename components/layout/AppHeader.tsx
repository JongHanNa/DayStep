'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Sun, Moon, Clock, X } from 'lucide-react';
import { useSidebarStore } from '@/state/stores/sidebarStore';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { getPageTitleFromPath } from '@/config/navigation';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/app/context/AuthContext';

/** 기본 정리 모드 시간 (초) - 5분 */
const ORGANIZE_DURATION_SECONDS = 5 * 60;

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { open } = useSidebarStore();
  const currentMode = useADHDModeStore(state => state.currentMode);
  const organizeStartTime = useADHDModeStore(state => state.organizeMode.startTime);
  const enterEntryMode = useADHDModeStore(state => state.enterEntryMode);
  const resetOrganizeMode = useADHDModeStore(state => state.resetOrganizeMode);
  const { adhdModeEnabled } = useSettingsStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { isAuthenticated, loading } = useAuth();

  const pageTitle = getPageTitleFromPath(pathname);

  // 정리 모드 타이머 상태
  const [remainingSeconds, setRemainingSeconds] = useState(ORGANIZE_DURATION_SECONDS);

  // 정리 모드 타이머 로직
  useEffect(() => {
    if (currentMode !== 'organize' || !organizeStartTime) {
      setRemainingSeconds(ORGANIZE_DURATION_SECONDS);
      return;
    }

    // startTime 기준으로 남은 시간 계산
    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - new Date(organizeStartTime).getTime()) / 1000);
      return Math.max(0, ORGANIZE_DURATION_SECONDS - elapsed);
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // 타이머 종료 시 진입 화면으로 (인터럽트 모달은 OrganizeModeWrapper에서 처리)
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentMode, organizeStartTime]);

  // 시간 포맷팅 (MM:SS)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 정리 모드 종료
  const handleExitOrganize = useCallback(() => {
    resetOrganizeMode();
    enterEntryMode();
    router.push('/'); // 다른 페이지에서도 메인 페이지로 이동
  }, [resetOrganizeMode, enterEntryMode, router]);

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

          {/* 중앙: 페이지 제목 (+ 정리 모드 타이머) */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-base-content">
              {pageTitle}
            </h1>
            {currentMode === 'organize' && (
              <>
                <span className="text-base-content/30">|</span>
                <Clock className="w-4 h-4 text-base-content/60" />
                <span className="text-lg font-bold text-base-content tabular-nums">
                  {formatTime(remainingSeconds)}
                </span>
              </>
            )}
          </div>

          {/* 오른쪽: 테마 토글 (+ 정리 모드 종료 버튼) */}
          <div className="flex items-center">
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
            {currentMode === 'organize' && (
              <button
                onClick={handleExitOrganize}
                className="btn btn-ghost btn-circle"
                aria-label="정리 모드 종료"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 헤더 높이만큼 공간 확보 (safe-area-top 포함) */}
      <div className="h-[--header-total-height]" />
    </>
  );
}
