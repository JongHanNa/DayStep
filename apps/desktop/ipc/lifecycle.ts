import { ipcMain, BrowserWindow, app, shell } from 'electron';

export function registerLifecycleIPC() {
  // 윈도우 포커스/블러 이벤트 전달
  app.on('browser-window-focus', (_event, window) => {
    window.webContents.send('lifecycle:focus');
  });

  app.on('browser-window-blur', (_event, window) => {
    window.webContents.send('lifecycle:blur');
  });

  app.on('before-quit', () => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((w) => {
      w.webContents.send('lifecycle:beforeQuit');
    });
  });

  // 앱 정보
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getPlatform', () => process.platform);
  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
    return true;
  });

  // 윈도우 컨트롤
  ipcMain.handle('window:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return BrowserWindow.getFocusedWindow()?.isMaximized() ?? false;
  });
}
