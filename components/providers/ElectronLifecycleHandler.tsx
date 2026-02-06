'use client';

import { useEffect } from 'react';
import { isElectronEnvironment } from '@/lib/utils';

/**
 * Electron 생명주기 핸들러
 *
 * - .electron CSS 클래스 추가
 * - focus/blur 이벤트 핸들링
 * - 트레이 배지 업데이트
 */
export function ElectronLifecycleHandler() {
  useEffect(() => {
    if (!isElectronEnvironment()) return;

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    // .electron CSS 클래스 추가
    document.documentElement.classList.add('electron');

    // 플랫폼별 클래스 추가
    electronAPI.app.getPlatform().then((platform: string) => {
      if (platform === 'darwin') {
        document.documentElement.classList.add('electron-mac');
      } else if (platform === 'win32') {
        document.documentElement.classList.add('electron-win');
      }
    });

    // focus/blur 이벤트
    const cleanupFocus = electronAPI.lifecycle.onFocus(() => {
      document.documentElement.classList.remove('electron-blurred');
    });

    const cleanupBlur = electronAPI.lifecycle.onBlur(() => {
      document.documentElement.classList.add('electron-blurred');
    });

    return () => {
      cleanupFocus();
      cleanupBlur();
      document.documentElement.classList.remove('electron', 'electron-mac', 'electron-win', 'electron-blurred');
    };
  }, []);

  return null;
}
