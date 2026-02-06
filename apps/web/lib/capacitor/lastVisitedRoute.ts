/**
 * Capacitor 환경에서 마지막 방문 페이지를 저장하고 복원하는 헬퍼
 * iOS WebView 재시작 시 사용자가 마지막으로 사용하던 페이지로 복귀
 */

import { isCapacitorEnvironment } from '../supabase/core';

const LAST_VISITED_ROUTE_KEY = 'last_visited_route';

/**
 * 현재 경로를 Capacitor Preferences에 저장
 * @param route - 저장할 경로 (예: '/routines', '/timeline')
 */
export async function saveLastVisitedRoute(route: string): Promise<void> {
  // Capacitor 환경에서만 동작
  if (!isCapacitorEnvironment()) {
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');

    await Preferences.set({
      key: LAST_VISITED_ROUTE_KEY,
      value: route,
    });

    console.log(`📍 [LastVisitedRoute] 저장됨: ${route}`);
  } catch (error) {
    console.warn('⚠️ [LastVisitedRoute] 저장 실패:', error);
  }
}

/**
 * Capacitor Preferences에서 마지막 방문 경로 읽기
 * @returns 저장된 경로 또는 null
 */
export async function getLastVisitedRoute(): Promise<string | null> {
  // Capacitor 환경에서만 동작
  if (!isCapacitorEnvironment()) {
    return null;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');

    const { value } = await Preferences.get({ key: LAST_VISITED_ROUTE_KEY });

    if (value) {
      console.log(`📍 [LastVisitedRoute] 복원됨: ${value}`);
      return value;
    }

    console.log('📍 [LastVisitedRoute] 저장된 경로 없음');
    return null;
  } catch (error) {
    console.warn('⚠️ [LastVisitedRoute] 읽기 실패:', error);
    return null;
  }
}

/**
 * 저장된 마지막 방문 경로 삭제 (로그아웃 시 사용)
 */
export async function clearLastVisitedRoute(): Promise<void> {
  // Capacitor 환경에서만 동작
  if (!isCapacitorEnvironment()) {
    return;
  }

  try {
    const { Preferences } = await import('@capacitor/preferences');

    await Preferences.remove({ key: LAST_VISITED_ROUTE_KEY });

    console.log('📍 [LastVisitedRoute] 삭제 완료');
  } catch (error) {
    console.warn('⚠️ [LastVisitedRoute] 삭제 실패:', error);
  }
}
