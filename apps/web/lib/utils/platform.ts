/**
 * 플랫폼 환경 감지 유틸리티
 */

/**
 * Capacitor 환경인지 확인
 * - capacitor: 프로토콜로 판단
 */
export const isCapacitorEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'capacitor:';
};

/**
 * Electron 환경인지 확인
 * - electronAPI 객체 존재 여부로 판단
 */
export const isElectronEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
};

/**
 * 웹 환경인지 확인 (Capacitor/Electron이 아닌 브라우저)
 */
export const isWebEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isCapacitorEnv() && !isElectronEnv();
};

/**
 * Capacitor iOS: WKWebView root scrollView contentOffset을 (0,0)으로 리셋
 *
 * body가 overflow:hidden이면 window.scrollTo는 NO-OP.
 * 일시적으로 overflow를 해제하여 scrollTo가 UIScrollView에 전파되도록 함.
 */
export function resetCapacitorScrollOffset(): void {
  if (typeof window === 'undefined') return;
  if (window.location.protocol !== 'capacitor:') return;

  const html = document.documentElement;
  const body = document.body;

  // overflow:hidden !important를 일시 해제
  html.style.setProperty('overflow', 'auto', 'important');
  body.style.setProperty('overflow', 'auto', 'important');
  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    html.style.removeProperty('overflow');
    body.style.removeProperty('overflow');
  });
}
