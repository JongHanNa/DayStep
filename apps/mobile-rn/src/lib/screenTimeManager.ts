/**
 * Screen Time Manager — 수면 중 앱 차단 통합 매니저
 *
 * iOS: FamilyControls + ManagedSettings + DeviceActivity (react-native-device-activity)
 * Android: Foreground Service + UsageStats + Overlay (AppBlockerModule)
 */
import {Platform, NativeModules} from 'react-native';

export type AuthStatus = 'approved' | 'denied' | 'notDetermined';

// ============================================
// Platform-specific imports
// ============================================

let iosModule: any = null;
if (Platform.OS === 'ios') {
  try {
    iosModule = require('react-native-device-activity');
  } catch {
    // iOS 모듈 없으면 무시
  }
}

const AndroidBlocker = Platform.OS === 'android' ? NativeModules.AppBlockerModule : null;

// ============================================
// Public API (Platform-agnostic)
// ============================================

/**
 * 스크린타임 기능 사용 가능 여부
 */
export function isScreenTimeAvailable(): boolean {
  if (Platform.OS === 'ios') {
    if (!iosModule) return false;
    const available = iosModule.isAvailable();
    console.log('[ScreenTime] isScreenTimeAvailable (iOS):', available);
    return available;
  }

  // Android: 항상 사용 가능 (Android 5.0+)
  console.log('[ScreenTime] isScreenTimeAvailable (Android): true');
  return true;
}

/**
 * 권한 요청
 * iOS: FamilyControls 권한 (.individual)
 * Android: 오버레이 + 사용 접근 권한 (설정 화면으로 이동)
 */
export async function requestAuthorization(): Promise<void> {
  if (Platform.OS === 'ios') {
    if (!iosModule) throw new Error('Screen Time is not available on this device');
    await iosModule.requestAuthorization('individual');
    return;
  }

  // Android: 권한 없으면 순차적으로 설정 화면으로 이동
  if (!AndroidBlocker) return;

  const hasPerms = await AndroidBlocker.hasRequiredPermissions();
  if (hasPerms) return;

  // 오버레이 권한 먼저
  const {default: {canDrawOverlays}} = await import('react-native/Libraries/Utilities/Platform');
  await AndroidBlocker.requestOverlayPermission();
  // 사용 접근 권한은 오버레이 설정에서 돌아온 후 별도 요청 필요
  // → SleepGardenScreen의 useFocusEffect에서 재체크
}

/**
 * 현재 권한 상태 확인
 */
export function getAuthorizationStatus(): AuthStatus {
  if (Platform.OS === 'ios') {
    if (!iosModule) return 'notDetermined';
    const status = iosModule.getAuthorizationStatus();
    if (status === iosModule.AuthorizationStatus?.approved) return 'approved';
    if (status === iosModule.AuthorizationStatus?.denied) return 'denied';
    return 'notDetermined';
  }

  // Android: 동기 호출 불가 → 캐시된 값 반환
  // 실제 체크는 getAuthorizationStatusAsync 사용
  return 'notDetermined';
}

/**
 * 현재 권한 상태 확인 (비동기 — Android용)
 */
export async function getAuthorizationStatusAsync(): Promise<AuthStatus> {
  if (Platform.OS === 'ios') {
    return getAuthorizationStatus();
  }

  if (!AndroidBlocker) return 'notDetermined';
  const status = await AndroidBlocker.getPermissionStatus();
  return status as AuthStatus;
}

/**
 * 모든 앱 차단 (허용 앱 제외) — 수면 세션 시작 시 호출
 */
export async function shieldAllExceptAllowed(): Promise<void> {
  if (Platform.OS === 'ios') {
    console.log('[ScreenTime] shieldAllExceptAllowed called (iOS)');
    if (!iosModule) return;
    try {
      await iosModule.requestAuthorization('individual');
      iosModule.enableBlockAllMode('sleep-session');
      const isBlocking = iosModule.userDefaultsGet('isBlockingAll');
      console.log('[ScreenTime] enableBlockAllMode done, isBlockingAll:', isBlocking);
    } catch (error) {
      console.error('[ScreenTime] shieldAllExceptAllowed error:', error);
    }
    return;
  }

  // Android
  console.log('[ScreenTime] shieldAllExceptAllowed called (Android)');
  if (!AndroidBlocker) return;
  try {
    await AndroidBlocker.startBlocking();
    console.log('[ScreenTime] Android blocking started');
  } catch (error) {
    console.error('[ScreenTime] Android startBlocking error:', error);
  }
}

/**
 * 모든 차단 해제 — 수면 종료/포기 시 호출
 */
export async function clearShield(): Promise<void> {
  if (Platform.OS === 'ios') {
    if (!iosModule) return;
    try {
      iosModule.disableBlockAllMode('sleep-session-end');
      iosModule.resetBlocks('sleep-session-end');
    } catch (error) {
      console.error('[ScreenTime] clearShield error:', error);
    }
    return;
  }

  // Android
  if (!AndroidBlocker) return;
  try {
    await AndroidBlocker.stopBlocking();
    console.log('[ScreenTime] Android blocking stopped');
  } catch (error) {
    console.error('[ScreenTime] Android stopBlocking error:', error);
  }
}

/**
 * DeviceActivity 스케줄 등록 — expectedWakeTime까지 shield 유지 후 자동 해제
 * iOS 전용: 앱이 강제 종료되어도 DeviceActivityMonitor extension이 해제 처리
 * Android: Foreground Service가 계속 실행되므로 별도 스케줄 불필요
 */
export async function scheduleAutoUnshield(wakeTime: Date): Promise<void> {
  if (Platform.OS !== 'ios' || !iosModule) return;

  const now = new Date();
  try {
    iosModule.configureActions({
      activityName: 'sleep-session',
      callbackName: 'intervalDidEnd',
      actions: [
        { type: 'disableBlockAllMode' },
        { type: 'resetBlocks' },
      ],
    });

    await iosModule.startMonitoring(
      'sleep-session',
      {
        intervalStart: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
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
      [],
    );
  } catch (error) {
    console.error('[ScreenTime] scheduleAutoUnshield error:', error);
  }
}

/**
 * DeviceActivity 모니터링 중단 (iOS 전용)
 */
export function cancelAutoUnshield(): void {
  if (Platform.OS !== 'ios' || !iosModule) return;

  try {
    iosModule.stopMonitoring(['sleep-session']);
  } catch (error) {
    console.error('[ScreenTime] cancelAutoUnshield error:', error);
  }
}

// ============================================
// 청소 세션 전용 Shield (iOS 전용)
// ============================================

export function shieldForCleaning(): void {
  if (Platform.OS !== 'ios' || !iosModule) return;
  try {
    iosModule.enableBlockAllMode('cleaning-session');
  } catch (error) {
    console.error('[ScreenTime] shieldForCleaning error:', error);
  }
}

export function clearCleaningShield(): void {
  if (Platform.OS !== 'ios' || !iosModule) return;
  try {
    iosModule.disableBlockAllMode('cleaning-session-end');
    iosModule.resetBlocks('cleaning-session-end');
  } catch (error) {
    console.error('[ScreenTime] clearCleaningShield error:', error);
  }
}

// ============================================
// 자동 수면 차단 (iOS 전용 — DeviceActivity daily 스케줄)
// ============================================

export async function scheduleDailyAutoShield(
  sleepTime: string,
  wakeTime: string,
): Promise<void> {
  if (Platform.OS !== 'ios' || !iosModule) return;

  try {
    iosModule.configureActions({
      activityName: 'daily-sleep',
      callbackName: 'intervalDidStart',
      actions: [{type: 'enableBlockAllMode'}],
    });

    iosModule.configureActions({
      activityName: 'daily-sleep',
      callbackName: 'intervalDidEnd',
      actions: [
        {type: 'disableBlockAllMode'},
        {type: 'resetBlocks'},
      ],
    });

    const [sh, sm] = sleepTime.split(':').map(Number);
    const [wh, wm] = wakeTime.split(':').map(Number);

    await iosModule.startMonitoring(
      'daily-sleep',
      {
        intervalStart: {hour: sh, minute: sm, second: 0},
        intervalEnd: {hour: wh, minute: wm, second: 0},
        repeats: true,
      },
      [],
    );

    console.log(`[ScreenTime] scheduleDailyAutoShield: ${sleepTime} → ${wakeTime}`);
  } catch (error) {
    console.error('[ScreenTime] scheduleDailyAutoShield error:', error);
  }
}

export function cancelDailyAutoShield(): void {
  if (Platform.OS !== 'ios' || !iosModule) return;
  try {
    iosModule.stopMonitoring(['daily-sleep']);
    console.log('[ScreenTime] cancelDailyAutoShield: stopped');
  } catch (error) {
    console.error('[ScreenTime] cancelDailyAutoShield error:', error);
  }
}
