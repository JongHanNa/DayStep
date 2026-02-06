import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null = null;

export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updater:available', info);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('updater:downloaded');
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error);
  });

  // 앱 시작 후 10초 뒤 업데이트 확인
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Updater] Check failed:', err);
    });
  }, 10000);
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates();
}

export function downloadAndInstallUpdate() {
  autoUpdater.downloadUpdate();
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });
}
