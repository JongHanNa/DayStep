'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useADHDModeStore, ADHDMode } from '@/state/stores/adhdModeStore';
import { useAuth } from '@/app/context/AuthContext';
import { isCapacitorEnv } from '@/lib/utils/platform';

/**
 * ADHD 모드 URL 라우팅 동기화 훅
 *
 * 웹 환경에서만 동작:
 * - 상태 변경 시 URL query params 업데이트
 * - 페이지 로드/새로고침 시 URL에서 상태 복원
 *
 * Capacitor 환경에서는 아무 동작도 하지 않음
 */
export function useADHDRouting() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const currentMode = useADHDModeStore((s) => s.currentMode);
  const currentSubView = useADHDModeStore((s) => s.currentSubView);
  const restoreFromUrl = useADHDModeStore((s) => s.restoreFromUrl);

  // 초기 복원 완료 여부 (중복 복원 방지)
  const hasRestoredRef = useRef(false);
  // 내부 업데이트 중인지 (URL → Store 업데이트 시 Store → URL 업데이트 방지)
  const isInternalUpdateRef = useRef(false);

  // 페이지 로드 시 URL → Store 상태 복원 (웹 전용)
  useEffect(() => {
    // Capacitor 환경이면 무시
    if (isCapacitorEnv()) return;
    // 이미 복원했으면 무시
    if (hasRestoredRef.current) return;
    // 사용자 정보가 아직 없으면 대기
    if (!user?.id) return;

    const mode = searchParams.get('mode');
    const tab = searchParams.get('tab');

    // URL에 mode가 있으면 복원
    if (mode) {
      console.log('🌐 URL에서 ADHD 상태 복원:', { mode, tab });
      isInternalUpdateRef.current = true;
      restoreFromUrl(mode, tab, user.id);
      hasRestoredRef.current = true;

      // 약간의 딜레이 후 플래그 해제
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 100);
    } else {
      hasRestoredRef.current = true;
    }
  }, [searchParams, user?.id, restoreFromUrl]);

  // Store 상태 변경 시 URL 업데이트 (웹 전용)
  useEffect(() => {
    // Capacitor 환경이면 무시
    if (isCapacitorEnv()) return;
    // 내부 업데이트 중이면 무시 (무한 루프 방지)
    if (isInternalUpdateRef.current) return;
    // 초기 복원 완료 전에는 무시
    if (!hasRestoredRef.current) return;

    const params = new URLSearchParams();

    // home과 null은 기본값이므로 URL에 포함하지 않음
    if (currentMode && currentMode !== 'home') {
      params.set('mode', currentMode);
    }
    if (currentSubView) {
      params.set('tab', currentSubView);
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // 현재 URL과 다를 때만 업데이트
    // 버그 수정: 실제 현재 URL 계산 (새 URL과 무관하게)
    const currentSearchParams = searchParams.toString();
    const currentUrl = currentSearchParams
      ? `${pathname}?${currentSearchParams}`
      : pathname;

    if (newUrl !== currentUrl) {
      console.log('🌐 ADHD 상태 → URL 업데이트:', newUrl);
      router.replace(newUrl, { scroll: false });
    }
  }, [currentMode, currentSubView, pathname, router, searchParams]);
}
