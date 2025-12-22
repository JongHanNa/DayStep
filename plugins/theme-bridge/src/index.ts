import { registerPlugin } from '@capacitor/core';
import type { ThemeBridgePlugin } from './definitions';

const ThemeBridge = registerPlugin<ThemeBridgePlugin>('ThemeBridge', {
  web: () => import('./web').then(m => new m.ThemeBridgeWeb()),
});

export * from './definitions';
export { ThemeBridge };

// 테마별 배경색 상수
export const THEME_BACKGROUND_COLORS = {
  light: '#f5f5f7', // bg-base-200 라이트모드
  dark: '#121212',  // bg-base-200 다크모드 (--color-base-200)
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
