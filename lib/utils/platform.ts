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
 * 웹 환경인지 확인 (Capacitor가 아닌 브라우저)
 */
export const isWebEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isCapacitorEnv();
};
