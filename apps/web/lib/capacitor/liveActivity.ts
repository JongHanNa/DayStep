/**
 * Live Activity Service for Pomodoro Timer
 *
 * iOS Live Activities를 통해 Dynamic Island와 잠금 화면에
 * 포모도로 타이머를 표시합니다.
 *
 * @requires iOS 16.2+
 * @requires capacitor-live-activity plugin
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

// Plugin interface
interface LiveActivityPlugin {
  startActivity(options: {
    id: string;
    attributes: Record<string, string>;
    contentState: Record<string, string>;
  }): Promise<void>;
  updateActivity(options: {
    id: string;
    contentState: Record<string, string>;
  }): Promise<void>;
  endActivity(options: {
    id: string;
    contentState: Record<string, string>;
    dismissalDate?: number;
  }): Promise<void>;
  isAvailable(): Promise<{ value: boolean }>;
  isRunning(options: { id: string }): Promise<{ value: boolean }>;
}

// Register plugin
const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity');

// Constants
const POMODORO_ACTIVITY_ID = 'daystep-pomodoro';

// Types
export type PomodoroSessionType = 'focus' | 'short_break' | 'long_break';

export interface PomodoroLiveActivityState {
  remainingTime: string; // "24:48" 형식
  progress: number; // 0 ~ 1
  sessionType: PomodoroSessionType;
  startTime: string; // "17:05" 형식
  endTime: string; // "17:30" 형식
  endTimeMs?: number; // Unix timestamp (ms) for iOS timerInterval
  todoName?: string;
  isCompleted?: boolean;
}

/**
 * 시간(초)을 "MM:SS" 형식으로 변환
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 밀리초를 "HH:MM" 형식으로 변환
 */
function formatTimeFromMs(ms: number): string {
  const date = new Date(ms);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Live Activity Service
 *
 * 포모도로 타이머의 Live Activity를 관리합니다.
 */
export const LiveActivityService = {
  /**
   * Live Activity 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    console.log('[LiveActivity Debug] isAvailable() called');
    // iOS에서만 지원
    if (Capacitor.getPlatform() !== 'ios') {
      console.log('[LiveActivity Debug] isAvailable - not iOS');
      return false;
    }

    try {
      console.log('[LiveActivity Debug] Calling native isAvailable...');
      const result = await LiveActivity.isAvailable();
      console.log('[LiveActivity Debug] Native isAvailable result:', result);
      return result.value;
    } catch (error) {
      console.warn('[LiveActivity] isAvailable check failed:', error);
      return false;
    }
  },

  /**
   * 현재 포모도로 Live Activity가 실행 중인지 확인
   */
  async isRunning(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const { value } = await LiveActivity.isRunning({ id: POMODORO_ACTIVITY_ID });
      return value;
    } catch {
      return false;
    }
  },

  /**
   * 포모도로 타이머 Live Activity 시작
   */
  async start(options: {
    durationMs: number;
    sessionType: PomodoroSessionType;
    startTimeMs: number;
    todoName?: string;
  }): Promise<void> {
    console.log('[LiveActivity Debug] start() called with options:', options);
    console.log('[LiveActivity Debug] Platform:', Capacitor.getPlatform());

    if (Capacitor.getPlatform() !== 'ios') {
      console.log('[LiveActivity Debug] Not iOS, skipping');
      return;
    }

    const isAvailable = await this.isAvailable();
    console.log('[LiveActivity Debug] isAvailable:', isAvailable);

    if (!isAvailable) {
      console.warn('[LiveActivity] Live Activities not available');
      return;
    }

    const { durationMs, sessionType, startTimeMs, todoName } = options;
    const endTimeMs = startTimeMs + durationMs;
    const remainingSeconds = Math.ceil(durationMs / 1000);

    try {
      await LiveActivity.startActivity({
        id: POMODORO_ACTIVITY_ID,
        attributes: {
          appName: 'DayStep',
        },
        contentState: {
          remainingTime: formatTime(remainingSeconds),
          progress: '1',
          sessionType,
          startTime: formatTimeFromMs(startTimeMs),
          endTime: formatTimeFromMs(endTimeMs),
          endTimeMs: String(endTimeMs), // Unix timestamp (ms) for iOS timerInterval
          todoName: todoName || '',
          isCompleted: 'false',
        },
      });

      console.log('[LiveActivity] Pomodoro activity started');
    } catch (error) {
      console.error('[LiveActivity] Failed to start activity:', error);
    }
  },

  /**
   * 포모도로 타이머 Live Activity 업데이트
   */
  async update(state: PomodoroLiveActivityState): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') {
      return;
    }

    const isRunning = await this.isRunning();
    if (!isRunning) {
      return;
    }

    try {
      await LiveActivity.updateActivity({
        id: POMODORO_ACTIVITY_ID,
        contentState: {
          remainingTime: state.remainingTime,
          progress: state.progress.toString(),
          sessionType: state.sessionType,
          startTime: state.startTime,
          endTime: state.endTime,
          endTimeMs: state.endTimeMs ? String(state.endTimeMs) : '',
          todoName: state.todoName || '',
          isCompleted: state.isCompleted ? 'true' : 'false',
        },
      });
    } catch (error) {
      console.error('[LiveActivity] Failed to update activity:', error);
    }
  },

  /**
   * 포모도로 타이머 Live Activity 종료
   *
   * @param keepOnScreen 잠금 화면에 유지 시간 (ms). 기본 4시간(14400000ms)
   */
  async end(options?: {
    sessionType?: PomodoroSessionType;
    todoName?: string;
    keepOnScreenMs?: number;
  }): Promise<void> {
    if (Capacitor.getPlatform() !== 'ios') {
      return;
    }

    const isRunning = await this.isRunning();
    if (!isRunning) {
      return;
    }

    const { sessionType = 'focus', todoName = '', keepOnScreenMs = 14400000 } = options || {};
    const dismissalDate = Date.now() + keepOnScreenMs;

    try {
      await LiveActivity.endActivity({
        id: POMODORO_ACTIVITY_ID,
        contentState: {
          remainingTime: '00:00',
          progress: '0',
          sessionType,
          startTime: '',
          endTime: '',
          todoName,
          isCompleted: 'true',
        },
        dismissalDate,
      });

      console.log('[LiveActivity] Pomodoro activity ended');
    } catch (error) {
      console.error('[LiveActivity] Failed to end activity:', error);
    }
  },

  /**
   * 밀리초 남은 시간으로 업데이트 (편의 메서드)
   */
  async updateFromTimer(options: {
    remainingMs: number;
    totalDurationMs: number;
    sessionType: PomodoroSessionType;
    startTimeMs: number;
    todoName?: string;
  }): Promise<void> {
    const { remainingMs, totalDurationMs, sessionType, startTimeMs, todoName } = options;

    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const progress = Math.max(0, Math.min(1, remainingMs / totalDurationMs));
    const endTimeMs = startTimeMs + totalDurationMs;

    await this.update({
      remainingTime: formatTime(remainingSeconds),
      progress,
      sessionType,
      startTime: formatTimeFromMs(startTimeMs),
      endTime: formatTimeFromMs(endTimeMs),
      endTimeMs,
      todoName,
      isCompleted: remainingMs <= 0,
    });
  },
};

export default LiveActivityService;
