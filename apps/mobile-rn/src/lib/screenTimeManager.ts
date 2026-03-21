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
  userDefaultsGet,
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
export async function shieldAllExceptAllowed(): Promise<void> {
  console.log('[ScreenTime] shieldAllExceptAllowed called, isAvailable:', isAvailable());
  if (!isAvailable()) return;

  try {
    await _requestAuth('individual'); // 이미 인증 시 즉시 resolve, 미인증 시 시스템 프롬프트
    enableBlockAllMode('sleep-session');
    const isBlocking = userDefaultsGet<boolean>('isBlockingAll');
    console.log('[ScreenTime] enableBlockAllMode done, isBlockingAll:', isBlocking);
  } catch (error) {
    console.error('[ScreenTime] shieldAllExceptAllowed error (auth or shield):', error);
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
          year: now.getFullYear(),
          month: now.getMonth() + 1, // JS 0-indexed → DateComponents 1-indexed
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: 0,
        },
        intervalEnd: {
          year: wakeTime.getFullYear(),
          month: wakeTime.getMonth() + 1,
          day: wakeTime.getDate(),
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

// ============================================
// 청소 세션 전용 Shield (별도 ManagedSettingsStore)
// ============================================

/**
 * 청소 세션 중 앱 차단 (허용 앱 제외)
 */
export function shieldForCleaning(): void {
  if (!isAvailable()) return;
  try {
    enableBlockAllMode('cleaning-session');
  } catch (error) {
    console.error('[ScreenTime] shieldForCleaning error:', error);
  }
}

/**
 * 청소 세션 종료 시 차단 해제
 */
export function clearCleaningShield(): void {
  if (!isAvailable()) return;
  try {
    disableBlockAllMode('cleaning-session-end');
    resetBlocks('cleaning-session-end');
  } catch (error) {
    console.error('[ScreenTime] clearCleaningShield error:', error);
  }
}

/**
 * 스크린타임 기능 사용 가능 여부
 */
export function isScreenTimeAvailable(): boolean {
  const available = isAvailable();
  console.log('[ScreenTime] isScreenTimeAvailable:', available);
  return available;
}
