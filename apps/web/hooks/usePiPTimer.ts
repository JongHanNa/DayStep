/**
 * usePiPTimer Hook (Web Stub)
 *
 * iOS PiP (Picture-in-Picture) 기능은 React Native 앱에서만 사용 가능합니다.
 * 웹/Electron 환경에서는 no-op 스텁입니다.
 */

interface UsePiPTimerOptions {
  timerState?: any;
  onPiPStopped?: () => void;
  onTimerComplete?: () => void;
  onRestoreUI?: () => void;
}

export function usePiPTimer(_options: UsePiPTimerOptions = {}) {
  return {
    startPiP: async (_startTimeMs: number, _durationMs: number, _title?: string) => false,
    updateStartTime: async (_startTimeMs: number) => false,
    stopPiP: async () => false,
    isActive: false,
    isAvailable: false,
  };
}

export default usePiPTimer;
