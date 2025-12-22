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

// 테마별 배경색 폴백 (SSR 환경용)
const FALLBACK_COLORS = {
  light: '#ffffff',
  dark: '#121212',
} as const;

/**
 * RGB 문자열을 HEX로 변환합니다.
 * 예: "rgb(245, 245, 247)" → "#f5f5f7"
 */
function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return null;
  const [, r, g, b] = match;
  return '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

/**
 * CSS 변수에서 테마 배경색을 동적으로 가져옵니다.
 * globals.css의 --color-base-100 값을 읽고 HEX로 변환합니다.
 * (iOS Swift는 HEX만 파싱 가능, oklch 형식 지원 안함)
 */
function getThemeBackgroundColor(theme: 'light' | 'dark'): string {
  if (typeof window === 'undefined') {
    return FALLBACK_COLORS[theme];
  }

  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme');

  // 요청된 테마로 임시 전환
  root.setAttribute('data-theme', theme);

  // Tailwind 클래스로 계산된 색상 얻기
  const temp = document.createElement('div');
  temp.className = 'bg-base-100';
  document.body.appendChild(temp);
  const computedColor = getComputedStyle(temp).backgroundColor;
  document.body.removeChild(temp);

  // 원래 테마로 복원
  if (currentTheme) {
    root.setAttribute('data-theme', currentTheme);
  }

  // RGB → HEX 변환 (iOS Swift용)
  return rgbToHex(computedColor) || FALLBACK_COLORS[theme];
}

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

    // CSS 변수에서 동적으로 색상 읽기 (globals.css와 자동 동기화)
    const color = getThemeBackgroundColor(theme);
    await ThemeBridge.setScrollViewBackgroundColor({ color });

    console.log(`[ThemeBridge] WebView 배경색 변경: ${color}`);
  } catch (error) {
    // 플러그인이 없거나 웹 환경인 경우 무시
    console.warn('[ThemeBridge] 배경색 동기화 실패:', error);
  }
}
