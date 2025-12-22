/**
 * ThemeBridge - iOS WebView 배경색 제어를 위한 Capacitor 플러그인
 *
 * 용도: 다크모드 전환 시 iOS overscroll(고무줄 효과) 영역의 배경색 동기화
 */

import { registerPlugin } from '@capacitor/core';

export interface ThemeBridgePlugin {
  /**
   * WebView의 scrollView 배경색을 설정합니다.
   * @param options.color - HEX 색상 코드 (예: "#121212", "#FFFFFF")
   */
  setScrollViewBackgroundColor(options: { color: string }): Promise<{ success: boolean; color: string }>;
}

const ThemeBridge = registerPlugin<ThemeBridgePlugin>('ThemeBridge', {
  web: () => Promise.resolve({
    setScrollViewBackgroundColor: async (options: { color: string }) => {
      console.log('[ThemeBridge Web] setScrollViewBackgroundColor called (no-op):', options.color);
      return { success: true, color: options.color };
    }
  } as ThemeBridgePlugin),
});

export default ThemeBridge;

// 테마별 배경색 상수 (globals.css의 --color-base-100과 일치)
export const THEME_BACKGROUND_COLORS = {
  light: '#ffffff', // bg-base-100 라이트모드
  dark: '#121212',  // bg-base-100 다크모드
} as const;

/**
 * iOS WebView 배경색을 테마에 맞게 업데이트합니다.
 * Capacitor 환경에서만 동작합니다.
 */
export async function syncWebViewBackgroundColor(theme: 'light' | 'dark'): Promise<void> {
  try {
    // Capacitor 환경 체크
    if (typeof window === 'undefined') return;

    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const color = THEME_BACKGROUND_COLORS[theme];
    await ThemeBridge.setScrollViewBackgroundColor({ color });

    console.log(`[ThemeBridge] WebView 배경색 변경: ${color}`);
  } catch (error) {
    // 플러그인이 없거나 웹 환경인 경우 무시
    console.warn('[ThemeBridge] 배경색 동기화 실패:', error);
  }
}
