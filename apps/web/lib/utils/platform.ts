/**
 * 플랫폼 환경 감지 유틸리티
 */

/**
 * Electron 환경인지 확인
 * - electronAPI 객체 존재 여부로 판단
 */
export const isElectronEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
};

/**
 * 웹 환경인지 확인 (Electron이 아닌 브라우저)
 */
export const isWebEnv = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !isElectronEnv();
};
