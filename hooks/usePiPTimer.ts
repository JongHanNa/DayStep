/**
 * usePiPTimer Hook
 *
 * 포모도로 타이머와 iOS PiP (Picture-in-Picture)를 연동합니다.
 * 홈 화면에서도 플로팅 타이머 창을 표시합니다.
 *
 * @requires iOS 15.0+
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PiPTimerService } from '@/lib/capacitor/pipTimer';
import type { TimerState } from '@/types/pomodoro';

interface UsePiPTimerOptions {
  /** 포모도로 타이머 상태 (자동 동기화용) */
  timerState?: TimerState;
  /** PiP 종료 시 콜백 */
  onPiPStopped?: () => void;
  /** 타이머 완료 시 콜백 */
  onTimerComplete?: () => void;
  /** 앱 복귀 시 콜백 */
  onRestoreUI?: () => void;
}

/**
 * PiP 타이머 연동 Hook
 *
 * @example
 * ```tsx
 * const { startPiP, stopPiP, isActive, isAvailable } = usePiPTimer({
 *   onTimerComplete: () => console.log('Timer completed!'),
 * });
 *
 * // PiP 시작 (사용자 인터랙션으로 호출해야 함)
 * <button onClick={() => startPiP(1500, 'Focus Session')}>
 *   PiP 타이머
 * </button>
 * ```
 */
export function usePiPTimer(options: UsePiPTimerOptions = {}) {
  const { timerState, onPiPStopped, onTimerComplete, onRestoreUI } = options;

  // 상태
  const [isActive, setIsActive] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Refs
  const isActiveRef = useRef(false);

  // 콜백을 ref로 저장하여 useEffect 의존성에서 제거 (과도한 리스너 등록 방지)
  const callbacksRef = useRef({ onPiPStopped, onTimerComplete, onRestoreUI });

  // 콜백 업데이트
  useEffect(() => {
    callbacksRef.current = { onPiPStopped, onTimerComplete, onRestoreUI };
  }, [onPiPStopped, onTimerComplete, onRestoreUI]);

  // PiP 사용 가능 여부 확인
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await PiPTimerService.isAvailable();
      setIsAvailable(available);
    };

    if (Capacitor.getPlatform() === 'ios') {
      checkAvailability();
    }
  }, []);

  // 이벤트 리스너 등록 (마운트 시 한 번만 실행)
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return;

    let pipStartedListener: { remove: () => void } | null = null;
    let pipStoppedListener: { remove: () => void } | null = null;
    let timerCompleteListener: { remove: () => void } | null = null;
    let restoreUIListener: { remove: () => void } | null = null;

    const setupListeners = async () => {
      pipStartedListener = await PiPTimerService.addListener('pipStarted', () => {
        console.log('[usePiPTimer] PiP started');
        isActiveRef.current = true;
        setIsActive(true);
      });

      pipStoppedListener = await PiPTimerService.addListener('pipStopped', () => {
        console.log('[usePiPTimer] PiP stopped');
        isActiveRef.current = false;
        setIsActive(false);
        callbacksRef.current.onPiPStopped?.();
      });

      timerCompleteListener = await PiPTimerService.addListener('timerComplete', () => {
        console.log('[usePiPTimer] Timer complete');
        isActiveRef.current = false;
        setIsActive(false);
        callbacksRef.current.onTimerComplete?.();
      });

      restoreUIListener = await PiPTimerService.addListener('pipRestoreUI', () => {
        console.log('[usePiPTimer] Restore UI');
        callbacksRef.current.onRestoreUI?.();
      });
    };

    setupListeners();

    return () => {
      pipStartedListener?.remove();
      pipStoppedListener?.remove();
      timerCompleteListener?.remove();
      restoreUIListener?.remove();
    };
  }, []); // 빈 의존성 배열 - 마운트 시 한 번만 실행

  /**
   * PiP 타이머 시작
   * ⚠️ 반드시 사용자 인터랙션(버튼 클릭 등)으로 호출해야 함
   *
   * @param durationMs - 타이머 시간 (밀리초)
   * @param title - 타이머 제목 (선택)
   */
  const startPiP = useCallback(async (durationMs: number, title?: string) => {
    if (!isAvailable) {
      console.warn('[usePiPTimer] PiP not available');
      return false;
    }

    const durationSeconds = Math.ceil(durationMs / 1000);
    const started = await PiPTimerService.start(durationSeconds, title);

    if (started) {
      isActiveRef.current = true;
      setIsActive(true);
    }

    return started;
  }, [isAvailable]);

  /**
   * 타이머 업데이트 (남은 시간)
   * @param remainingMs - 남은 시간 (밀리초)
   */
  const updatePiP = useCallback(async (remainingMs: number) => {
    if (!isActiveRef.current) return false;

    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    return await PiPTimerService.update(remainingSeconds);
  }, []);

  /**
   * PiP 타이머 종료
   */
  const stopPiP = useCallback(async () => {
    if (!isActiveRef.current) return false;

    const stopped = await PiPTimerService.stop();

    if (stopped) {
      isActiveRef.current = false;
      setIsActive(false);
    }

    return stopped;
  }, []);

  // timerState 변경 시 PiP 자동 업데이트 (JavaScript Single Source of Truth)
  useEffect(() => {
    if (!timerState || !isActiveRef.current) return;
    if (!timerState.isRunning || timerState.isPaused) return;
    if (Capacitor.getPlatform() !== 'ios') return;

    // PiP 타이머 업데이트
    PiPTimerService.update(Math.max(0, Math.ceil(timerState.remainingTime / 1000)))
      .catch(console.error);
  }, [timerState?.remainingTime, timerState?.isRunning, timerState?.isPaused]);

  // 타이머 완료 시 PiP 종료
  useEffect(() => {
    if (!timerState || !isActiveRef.current) return;
    if (timerState.status === 'completed' || timerState.status === 'idle') {
      // PiP 종료 (timerComplete 이벤트는 Swift에서 발송하지 않으므로 여기서 처리)
      if (timerState.status === 'completed') {
        callbacksRef.current.onTimerComplete?.();
      }
      PiPTimerService.stop().catch(console.error);
      isActiveRef.current = false;
      setIsActive(false);
    }
  }, [timerState?.status]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isActiveRef.current) {
        PiPTimerService.stop().catch(console.error);
      }
    };
  }, []);

  return {
    /** PiP 타이머 시작 (사용자 인터랙션 필요) */
    startPiP,
    /** 타이머 업데이트 */
    updatePiP,
    /** PiP 타이머 종료 */
    stopPiP,
    /** PiP 현재 활성 상태 */
    isActive,
    /** PiP 사용 가능 여부 (iOS 15+) */
    isAvailable,
  };
}

export default usePiPTimer;
