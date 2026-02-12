/**
 * usePomodoroLiveActivity Hook (Web Stub)
 *
 * iOS Live Activity 기능은 React Native 앱에서만 사용 가능합니다.
 * 웹/Electron 환경에서는 no-op 스텁입니다.
 */

import type { TimerState } from '@/types/pomodoro';

interface UsePomodoroLiveActivityOptions {
  timerState: TimerState;
  todoName?: string;
  startTimeMs?: number;
  enabled?: boolean;
}

const noop = async () => {};

export function usePomodoroLiveActivity(_options: UsePomodoroLiveActivityOptions) {
  return {
    isActive: false,
    start: noop,
    end: noop,
    update: noop,
  };
}

export default usePomodoroLiveActivity;
