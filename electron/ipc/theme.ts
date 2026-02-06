import { ipcMain, nativeTheme, BrowserWindow } from 'electron';

export function registerThemeIPC() {
  ipcMain.handle('theme:setTitleBarOverlay', async (_event, color: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win || process.platform === 'darwin') return;

    // Windows: titleBarOverlay 색상 변경
    try {
      win.setTitleBarOverlay({
        color,
        symbolColor: isLightColor(color) ? '#333333' : '#ffffff',
      });
    } catch (err) {
      console.error('[Theme] Failed to set title bar overlay:', err);
    }
  });

  ipcMain.handle('theme:getSystemTheme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  // 시스템 테마 변경 감지
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((w) => {
      w.webContents.send('theme:changed', theme);
    });
  });
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // 밝기 계산 (YIQ)
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128;
}
