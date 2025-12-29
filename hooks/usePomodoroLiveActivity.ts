/**
 * usePomodoroLiveActivity Hook
 *
 * 포모도로 타이머와 iOS Live Activity를 연동합니다.
 * Dynamic Island와 잠금 화면에 타이머 상태를 표시합니다.
 *
 * @requires iOS 16.2+
 */

import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import type { TimerState, TimerType } from '@/types/pomodoro';
import { LiveActivityService, type PomodoroSessionType } from '@/lib/capacitor/liveActivity';

// 업데이트 간격 (ms) - 성능 최적화를 위해 10초마다
const UPDATE_INTERVAL = 10000;

// TimerType을 PomodoroSessionType으로 변환
function toSessionType(timerType: TimerType): PomodoroSessionType {
  switch (timerType) {
    case 'POMODORO':
      return 'focus';
    case 'SHORT_BREAK':
      return 'short_break';
    case 'LONG_BREAK':
      return 'long_break';
    default:
      return 'focus';
  }
}

interface UsePomodoroLiveActivityOptions {
  /** 타이머 상태 */
  timerState: TimerState;
  /** 연결된 할일 이름 */
  todoName?: string;
  /** 타이머 시작 시간 (ms timestamp) */
  startTimeMs?: number;
  /** Live Activity 활성화 여부 */
  enabled?: boolean;
}

/**
 * 포모도로 Live Activity 연동 Hook
 *
 * @example
 * ```tsx
 * usePomodoroLiveActivity({
 *   timerState: workerTimerState,
 *   todoName: connectedTodo?.title,
 *   startTimeMs: currentSession?.startTime,
 *   enabled: true,
 * });
 * ```
 */
export function usePomodoroLiveActivity({
  timerState,
  todoName,
  startTimeMs,
  enabled = true,
}: UsePomodoroLiveActivityOptions) {
  // 마지막 업데이트 시간 추적
  const lastUpdateRef = useRef<number>(0);
  // Live Activity 활성 상태
  const isActivityActiveRef = useRef<boolean>(false);
  // 시작 시간 저장 (세션 시작 시점)
  const sessionStartTimeRef = useRef<number>(0);

  /**
   * Live Activity 시작
   */
  const startLiveActivity = useCallback(async () => {
    const platform = Capacitor.getPlatform();

    // 🐛 디버깅: 플랫폼 확인
    console.log('[LiveActivity Debug] startLiveActivity called, platform:', platform, 'enabled:', enabled);

    // iOS가 아니면 무시
    if (platform !== 'ios' || !enabled) {
      console.log('[LiveActivity Debug] Skipping - not iOS or disabled');
      return;
    }

    const effectiveStartTime = startTimeMs || Date.now();
    sessionStartTimeRef.current = effectiveStartTime;

    try {
      await LiveActivityService.start({
        durationMs: timerState.duration,
        sessionType: toSessionType(timerState.timerType),
        startTimeMs: effectiveStartTime,
        todoName,
      });

      isActivityActiveRef.current = true;
      lastUpdateRef.current = Date.now();
      console.log('[LiveActivity] Started');
    } catch (error) {
      console.error('[LiveActivity] Failed to start:', error);
    }
  }, [timerState.duration, timerState.timerType, todoName, startTimeMs, enabled]);

  /**
   * Live Activity 업데이트
   */
  const updateLiveActivity = useCallback(async () => {
    // iOS가 아니거나 비활성화면 무시
    if (Capacitor.getPlatform() !== 'ios' || !enabled || !isActivityActiveRef.current) {
      return;
    }

    // 업데이트 간격 체크 (10초마다)
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
      return;
    }

    try {
      await LiveActivityService.updateFromTimer({
        remainingMs: timerState.remainingTime,
        totalDurationMs: timerState.duration,
        sessionType: toSessionType(timerState.timerType),
        startTimeMs: sessionStartTimeRef.current || startTimeMs || Date.now() - timerState.elapsed,
        todoName,
      });

      lastUpdateRef.current = now;
    } catch (error) {
      console.error('[LiveActivity] Failed to update:', error);
    }
  }, [timerState, todoName, startTimeMs, enabled]);

  /**
   * Live Activity 종료
   */
  const endLiveActivity = useCallback(async (keepOnScreenMs?: number) => {
    // iOS가 아니면 무시
    if (Capacitor.getPlatform() !== 'ios' || !enabled) {
      return;
    }

    if (!isActivityActiveRef.current) {
      return;
    }

    try {
      await LiveActivityService.end({
        sessionType: toSessionType(timerState.timerType),
        todoName,
        keepOnScreenMs: keepOnScreenMs || 14400000, // 기본 4시간
      });

      isActivityActiveRef.current = false;
      console.log('[LiveActivity] Ended');
    } catch (error) {
      console.error('[LiveActivity] Failed to end:', error);
    }
  }, [timerState.timerType, todoName, enabled]);

  // 타이머 시작 감지
  useEffect(() => {
    // 🐛 디버깅: timerState 변화 확인
    console.log('[LiveActivity Debug] timerState changed:', {
      isRunning: timerState.isRunning,
      status: timerState.status,
      isActivityActive: isActivityActiveRef.current,
      platform: Capacitor.getPlatform(),
    });

    if (timerState.isRunning && timerState.status === 'running' && !isActivityActiveRef.current) {
      console.log('[LiveActivity Debug] Conditions met, starting Live Activity...');
      startLiveActivity();
    }
  }, [timerState.isRunning, timerState.status, startLiveActivity]);

  // 타이머 tick 업데이트
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused && isActivityActiveRef.current) {
      updateLiveActivity();
    }
  }, [timerState.remainingTime, timerState.isRunning, timerState.isPaused, updateLiveActivity]);

  // 타이머 완료/정지 감지
  useEffect(() => {
    if (timerState.status === 'completed' && isActivityActiveRef.current) {
      // 완료 시 4시간 동안 잠금 화면에 유지
      endLiveActivity(14400000);
    } else if (timerState.status === 'idle' && isActivityActiveRef.current) {
      // 정지 시 즉시 제거
      endLiveActivity(0);
    }
  }, [timerState.status, endLiveActivity]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (isActivityActiveRef.current) {
        // 비동기 정리 (완료를 기다리지 않음)
        LiveActivityService.end({
          sessionType: toSessionType(timerState.timerType),
          todoName,
          keepOnScreenMs: 0,
        }).catch(console.error);
      }
    };
  }, [timerState.timerType, todoName]);

  return {
    /** Live Activity가 현재 활성 상태인지 */
    isActive: isActivityActiveRef.current,
    /** Live Activity 수동 시작 */
    start: startLiveActivity,
    /** Live Activity 수동 종료 */
    end: endLiveActivity,
    /** Live Activity 수동 업데이트 */
    update: updateLiveActivity,
  };
}

export default usePomodoroLiveActivity;
