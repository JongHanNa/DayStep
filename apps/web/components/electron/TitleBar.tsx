'use client';

import { useEffect, useState } from 'react';
import { isElectronEnvironment } from '@/lib/utils';
import { Minus, Square, X } from 'lucide-react';

/**
 * Electron 커스텀 타이틀바
 *
 * - Mac: 신호등 버튼 영역에 맞춘 패딩 (네이티브 버튼 사용)
 * - Windows: 최소화/최대화/닫기 버튼 직접 구현
 * - 드래그 가능 영역 (-webkit-app-region: drag)
 */
export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isElectronEnvironment()) return;
    setIsVisible(true);

    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    electronAPI.app.getPlatform().then((platform: string) => {
      setIsMac(platform === 'darwin');
    });

    electronAPI.window.isMaximized().then(setIsMaximized);
  }, []);

  if (!isVisible) return null;

  const handleMinimize = () => (window as any).electronAPI?.window.minimize();
  const handleMaximize = async () => {
    await (window as any).electronAPI?.window.maximize();
    const maximized = await (window as any).electronAPI?.window.isMaximized();
    setIsMaximized(maximized);
  };
  const handleClose = () => (window as any).electronAPI?.window.close();

  return (
    <div className="electron-titlebar">
      {/* 드래그 가능 영역 */}
      <div className="electron-titlebar-drag" />

      {/* Windows 전용 컨트롤 버튼 */}
      {!isMac && (
        <div className="electron-titlebar-controls">
          <button
            className="electron-titlebar-btn electron-titlebar-btn-minimize"
            onClick={handleMinimize}
            aria-label="최소화"
          >
            <Minus size={12} />
          </button>
          <button
            className="electron-titlebar-btn electron-titlebar-btn-maximize"
            onClick={handleMaximize}
            aria-label={isMaximized ? '이전 크기로' : '최대화'}
          >
            <Square size={10} />
          </button>
          <button
            className="electron-titlebar-btn electron-titlebar-btn-close"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
