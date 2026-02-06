/**
 * Electron 테마 브릿지
 * 다크모드 전환 시 Windows 타이틀바 오버레이 색상 동기화
 */

const THEME_COLORS = {
  light: '#f5f5f7',
  dark: '#121212',
} as const;

export async function syncElectronTitleBarColor(theme: 'light' | 'dark'): Promise<void> {
  if (typeof window === 'undefined') return;

  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return;

  try {
    const color = THEME_COLORS[theme];
    await electronAPI.theme.setTitleBarOverlay(color);
    console.log(`[ElectronTheme] 타이틀바 색상 변경: ${color}`);
  } catch (error) {
    console.warn('[ElectronTheme] 타이틀바 색상 동기화 실패:', error);
  }
}

export function listenSystemThemeChange(callback: (theme: 'light' | 'dark') => void): (() => void) | null {
  if (typeof window === 'undefined') return null;

  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return null;

  return electronAPI.theme.onThemeChanged((theme: string) => {
    callback(theme as 'light' | 'dark');
  });
}
