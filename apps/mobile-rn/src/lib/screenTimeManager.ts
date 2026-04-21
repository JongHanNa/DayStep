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
    await AndroidBlocker.startBlocking('sleep');
    console.log('[ScreenTime] Android blocking started (sleep mode)');
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
// 집중(포커스) 세션 전용 Shield
// ============================================

/** 집중 전용 whitelist 토큰 저장 키 (native UserDefaults / SharedPreferences) */
export const FOCUS_WHITELIST_KEY = 'focusUnblockedSelection';

/**
 * 집중 whitelist 적용 — mode 진입 시점에 포커스 전용 selection을 native active whitelist에 로드
 *
 * iOS: 이전 whitelist를 clear하고 저장된 focus 토큰이 있으면 push한다.
 * Android: setAllowedPackages가 이미 브로드캐스트를 쏘지만, 세션 시작 시 명시적으로 reload하려면
 *          동일 배열을 다시 저장하는 방식 대신 services 내부 reload 경로를 활용한다.
 *          (startBlocking('focus')가 이미 reloadAllowedPackages를 호출하므로 보통 불필요)
 */
export function applyFocusWhitelist(): void {
  if (Platform.OS === 'ios') {
    if (!iosModule) return;
    try {
      iosModule.clearWhitelistAndUpdateBlock?.('focus-session-apply-whitelist');
      const token = iosModule.userDefaultsGet?.(FOCUS_WHITELIST_KEY);
      if (typeof token === 'string' && token.length > 0) {
        iosModule.addSelectionToWhitelistAndUpdateBlock?.(
          {activitySelectionToken: token},
          'focus-session-apply-whitelist',
        );
      }
    } catch (error) {
      console.error('[ScreenTime] applyFocusWhitelist error:', error);
    }
    return;
  }

  // Android: setAllowedPackages가 Broadcast로 이미 처리. 별도 no-op.
}

/**
 * 집중 세션 시작 시 차단 활성화
 * iOS: focus 전용 whitelist 적용 후 블록 올 모드 활성
 * Android: AppBlocker foreground service 시작 (현재 whitelist는 Android 구현 내부에서 처리)
 */
export async function shieldForFocus(): Promise<void> {
  if (Platform.OS === 'ios') {
    if (!iosModule) return;
    try {
      await iosModule.requestAuthorization('individual');
      applyFocusWhitelist();
      iosModule.enableBlockAllMode('focus-session');
    } catch (error) {
      console.error('[ScreenTime] shieldForFocus error:', error);
    }
    return;
  }

  if (!AndroidBlocker) return;
  try {
    await AndroidBlocker.startBlocking('focus');
  } catch (error) {
    console.error('[ScreenTime] Android focus startBlocking error:', error);
  }
}

/**
 * 집중 세션 종료/중단 시 차단 해제
 */
export async function clearFocusShield(): Promise<void> {
  if (Platform.OS === 'ios') {
    if (!iosModule) return;
    try {
      iosModule.disableBlockAllMode('focus-session-end');
      iosModule.resetBlocks('focus-session-end');
    } catch (error) {
      console.error('[ScreenTime] clearFocusShield error:', error);
    }
    return;
  }

  if (!AndroidBlocker) return;
  try {
    await AndroidBlocker.stopBlocking();
  } catch (error) {
    console.error('[ScreenTime] Android focus stopBlocking error:', error);
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

// ============================================
// 허용 앱 관리 (Android 전용 — iOS는 네이티브 DeviceActivitySelectionView가 처리)
// ============================================

export type AllowedMode = 'sleep' | 'focus';

export interface InstalledAppInfo {
  packageName: string;
  appName: string;
  iconPath: string | null; // file:// URI or null
}

/**
 * 런처에 노출되는 설치 앱 목록 조회 (Android 전용)
 * iOS에서는 빈 배열 반환 (iOS는 네이티브 picker 사용)
 */
export async function getInstalledApps(): Promise<InstalledAppInfo[]> {
  if (Platform.OS !== 'android' || !AndroidBlocker) return [];
  try {
    const apps = await AndroidBlocker.getInstalledApps();
    return Array.isArray(apps) ? (apps as InstalledAppInfo[]) : [];
  } catch (error) {
    console.error('[ScreenTime] getInstalledApps error:', error);
    return [];
  }
}

/**
 * 허용 앱 목록 저장 (Android 전용)
 * 세션이 진행 중이면 네이티브 서비스가 브로드캐스트로 즉시 반영
 */
export async function setAllowedPackages(
  mode: AllowedMode,
  packages: string[],
): Promise<void> {
  if (Platform.OS !== 'android' || !AndroidBlocker) return;
  try {
    await AndroidBlocker.setAllowedPackages(mode, packages);
  } catch (error) {
    console.error('[ScreenTime] setAllowedPackages error:', error);
  }
}

/**
 * 저장된 허용 앱 목록 조회 (Android 전용)
 */
export async function getAllowedPackages(
  mode: AllowedMode,
): Promise<string[]> {
  if (Platform.OS !== 'android' || !AndroidBlocker) return [];
  try {
    const pkgs = await AndroidBlocker.getAllowedPackages(mode);
    return Array.isArray(pkgs) ? (pkgs as string[]) : [];
  } catch (error) {
    console.error('[ScreenTime] getAllowedPackages error:', error);
    return [];
  }
}
