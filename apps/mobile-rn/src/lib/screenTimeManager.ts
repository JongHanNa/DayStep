/**
 * Screen Time Manager — iOS FamilyControls + ManagedSettings + DeviceActivity 래핑
 * react-native-device-activity 패키지 사용
 *
 * 주요 기능:
 * - 스크린타임 권한 요청/확인
 * - 수면 중 비허용 앱 차단 (shield)
 * - 기상 시 차단 해제
 * - DeviceActivity 스케줄 등록 (자동 해제)
 */
import {Platform} from 'react-native';

// react-native-device-activity 패키지가 설치되면 실제 import로 교체
// 현재는 안전한 폴백 구현
let DeviceActivity: any = null;

try {
  DeviceActivity = require('react-native-device-activity');
} catch {
  // 패키지 미설치 시 무시
}

export type AuthorizationStatus = 'approved' | 'denied' | 'notDetermined';

/**
 * FamilyControls 권한 요청 (.individual)
 */
export async function requestAuthorization(): Promise<'approved' | 'denied'> {
  if (Platform.OS !== 'ios' || !DeviceActivity) {
    return 'denied';
  }

  try {
    const result = await DeviceActivity.requestAuthorization();
    return result === 'approved' ? 'approved' : 'denied';
  } catch (error) {
    console.error('[ScreenTime] requestAuthorization error:', error);
    return 'denied';
  }
}

/**
 * 현재 권한 상태 확인
 */
export async function getAuthorizationStatus(): Promise<AuthorizationStatus> {
  if (Platform.OS !== 'ios' || !DeviceActivity) {
    return 'notDetermined';
  }

  try {
    const status = await DeviceActivity.getAuthorizationStatus();
    if (status === 'approved') return 'approved';
    if (status === 'denied') return 'denied';
    return 'notDetermined';
  } catch {
    return 'notDetermined';
  }
}

/**
 * ManagedSettingsStore에 shield 적용 — 허용 앱 외 모든 앱 차단
 */
export async function shieldAllExceptAllowed(): Promise<void> {
  if (Platform.OS !== 'ios' || !DeviceActivity) return;

  try {
    await DeviceActivity.enableShield();
  } catch (error) {
    console.error('[ScreenTime] shieldAllExceptAllowed error:', error);
  }
}

/**
 * 모든 차단 해제 — 수면 종료/포기 시 호출
 */
export async function clearShield(): Promise<void> {
  if (Platform.OS !== 'ios' || !DeviceActivity) return;

  try {
    await DeviceActivity.disableShield();
  } catch (error) {
    console.error('[ScreenTime] clearShield error:', error);
  }
}

/**
 * DeviceActivity 스케줄 등록 — expectedWakeTime까지 shield 유지 후 자동 해제
 * 앱이 강제 종료되어도 DeviceActivityMonitor extension이 해제 처리
 */
export async function scheduleAutoUnshield(wakeTime: Date): Promise<void> {
  if (Platform.OS !== 'ios' || !DeviceActivity) return;

  try {
    await DeviceActivity.startMonitoring('sleep-session', {
      intervalEnd: {
        hour: wakeTime.getHours(),
        minute: wakeTime.getMinutes(),
        second: 0,
      },
    });
  } catch (error) {
    console.error('[ScreenTime] scheduleAutoUnshield error:', error);
  }
}

/**
 * 스크린타임 기능 사용 가능 여부
 */
export function isScreenTimeAvailable(): boolean {
  return Platform.OS === 'ios' && DeviceActivity != null;
}
