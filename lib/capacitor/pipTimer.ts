/**
 * PiP Timer Service for Pomodoro Timer
 *
 * iOS Picture-in-Picture를 통해 홈 화면에서도
 * 플로팅 타이머 창을 표시합니다.
 *
 * @requires iOS 15.0+
 */

import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';

// Plugin interface
interface PiPTimerPlugin {
  isPiPAvailable(): Promise<{ available: boolean }>;
  startPiP(options: { duration: number; title?: string }): Promise<{ started: boolean }>;
  updateTimer(options: { remaining: number }): Promise<{ updated: boolean }>;
  stopPiP(): Promise<{ stopped: boolean }>;
  addListener(
    eventName: 'pipStarted' | 'pipStopped' | 'pipRestoreUI' | 'timerComplete',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
}

// Register plugin
const PiPTimer = registerPlugin<PiPTimerPlugin>('PiPTimer');

/**
 * PiP Timer Service
 *
 * 홈 화면에서 플로팅 타이머를 표시합니다.
 */
export const PiPTimerService = {
  /**
   * PiP 사용 가능 여부 확인
   */
  async isAvailable(): Promise<boolean> {
    // iOS에서만 지원
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const { available } = await PiPTimer.isPiPAvailable();
      return available;
    } catch (error) {
      console.warn('[PiPTimer] isAvailable check failed:', error);
      return false;
    }
  },

  /**
   * PiP 타이머 시작
   * @param durationSeconds - 타이머 시간 (초)
   * @param title - 타이머 제목 (선택)
   */
  async start(durationSeconds: number, title?: string): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const { started } = await PiPTimer.startPiP({
        duration: durationSeconds,
        title: title || '',
      });
      console.log('[PiPTimer] Started:', started);
      return started;
    } catch (error) {
      console.error('[PiPTimer] Failed to start:', error);
      return false;
    }
  },

  /**
   * 타이머 업데이트
   * @param remainingSeconds - 남은 시간 (초)
   */
  async update(remainingSeconds: number): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const { updated } = await PiPTimer.updateTimer({
        remaining: remainingSeconds,
      });
      return updated;
    } catch (error) {
      console.error('[PiPTimer] Failed to update:', error);
      return false;
    }
  },

  /**
   * PiP 타이머 종료
   */
  async stop(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'ios') {
      return false;
    }

    try {
      const { stopped } = await PiPTimer.stopPiP();
      console.log('[PiPTimer] Stopped:', stopped);
      return stopped;
    } catch (error) {
      console.error('[PiPTimer] Failed to stop:', error);
      return false;
    }
  },

  /**
   * 이벤트 리스너 등록
   */
  async addListener(
    eventName: 'pipStarted' | 'pipStopped' | 'pipRestoreUI' | 'timerComplete',
    callback: () => void
  ): Promise<PluginListenerHandle | null> {
    if (Capacitor.getPlatform() !== 'ios') {
      return null;
    }

    try {
      return await PiPTimer.addListener(eventName, callback);
    } catch (error) {
      console.error('[PiPTimer] Failed to add listener:', error);
      return null;
    }
  },
};

export default PiPTimerService;
