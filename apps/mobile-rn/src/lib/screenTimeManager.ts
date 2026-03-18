/**
 * Screen Time Manager — iOS FamilyControls + ManagedSettings + DeviceActivity 래핑
 * react-native-device-activity 패키지 사용
 *
 * 주요 기능:
 * - 스크린타임 권한 요청/확인
 * - 수면 중 비허용 앱 차단 (enableBlockAllMode)
 * - 기상 시 차단 해제 (disableBlockAllMode + resetBlocks)
 * - DeviceActivity 스케줄 등록 (자동 해제)
 */
import {
  requestAuthorization as _requestAuth,
  getAuthorizationStatus as _getAuthStatus,
  enableBlockAllMode,
  disableBlockAllMode,
  resetBlocks,
  startMonitoring,
  stopMonitoring,
  configureActions,
  isAvailable,
  AuthorizationStatus,
} from 'react-native-device-activity';

export type AuthStatus = 'approved' | 'denied' | 'notDetermined';

/**
 * FamilyControls 권한 요청 (.individual)
 * 성공 시 resolve (void), 실패 시 throw
 */
export async function requestAuthorization(): Promise<void> {
  if (!isAvailable()) {
    throw new Error('Screen Time is not available on this device');
  }
  await _requestAuth('individual');
}

/**
 * 현재 권한 상태 확인 (동기)
 */
export function getAuthorizationStatus(): AuthStatus {
  if (!isAvailable()) {
    return 'notDetermined';
  }

  const status = _getAuthStatus();
  if (status === AuthorizationStatus.approved) return 'approved';
  if (status === AuthorizationStatus.denied) return 'denied';
  return 'notDetermined';
}

/**
 * ManagedSettingsStore — 모든 앱 차단 (허용 앱 제외)
 */
export function shieldAllExceptAllowed(): void {
  if (!isAvailable()) return;

  try {
    enableBlockAllMode('sleep-session');
  } catch (error) {
    console.error('[ScreenTime] shieldAllExceptAllowed error:', error);
  }
}

/**
 * 모든 차단 해제 — 수면 종료/포기 시 호출
 */
export function clearShield(): void {
  if (!isAvailable()) return;

  try {
    disableBlockAllMode('sleep-session-end');
    resetBlocks('sleep-session-end');
  } catch (error) {
    console.error('[ScreenTime] clearShield error:', error);
  }
}

/**
 * DeviceActivity 스케줄 등록 — expectedWakeTime까지 shield 유지 후 자동 해제
 * 앱이 강제 종료되어도 DeviceActivityMonitor extension이 해제 처리
 */
export async function scheduleAutoUnshield(wakeTime: Date): Promise<void> {
  if (!isAvailable()) return;

  const now = new Date();
  try {
    // intervalDidEnd 시 자동으로 shield 해제하도록 action 등록
    configureActions({
      activityName: 'sleep-session',
      callbackName: 'intervalDidEnd',
      actions: [
        { type: 'disableBlockAllMode' },
        { type: 'resetBlocks' },
      ],
    });

    await startMonitoring(
      'sleep-session',
      {
        intervalStart: {
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: 0,
        },
        intervalEnd: {
          hour: wakeTime.getHours(),
          minute: wakeTime.getMinutes(),
          second: 0,
        },
        repeats: false,
      },
      [], // events 배열 필수
    );
  } catch (error) {
    console.error('[ScreenTime] scheduleAutoUnshield error:', error);
  }
}

/**
 * DeviceActivity 모니터링 중단
 */
export function cancelAutoUnshield(): void {
  if (!isAvailable()) return;

  try {
    stopMonitoring(['sleep-session']);
  } catch (error) {
    console.error('[ScreenTime] cancelAutoUnshield error:', error);
  }
}

/**
 * 스크린타임 기능 사용 가능 여부
 */
export function isScreenTimeAvailable(): boolean {
  return isAvailable();
}
