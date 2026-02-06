import { app, BrowserWindow, protocol, shell } from 'electron';
import * as path from 'path';
import { registerAppProtocol } from './protocol';
import { createStore, getWindowState, setWindowState } from './store';
import { registerAuthIPC } from './ipc/auth';
import { registerStoreIPC } from './ipc/store';
import { registerNotificationsIPC } from './ipc/notifications';
import { registerLifecycleIPC } from './ipc/lifecycle';
import { registerThemeIPC } from './ipc/theme';
import { registerSubscriptionIPC } from './ipc/subscription';
import { createTray } from './tray';
import { initAutoUpdater } from './updater';

// app:// 프로토콜을 privileged로 등록 (반드시 app.whenReady() 전에 호출)
// → localStorage, document.cookie, Fetch API 등 정상 동작
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const savedState = getWindowState();

  mainWindow = new BrowserWindow({
    width: savedState.width || 1200,
    height: savedState.height || 800,
    x: savedState.x,
    y: savedState.y,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform !== 'darwin' ? {
      color: '#ffffff',
      symbolColor: '#333333',
      height: 40,
    } : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 16 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#f5f5f7',
  });

  // 윈도우 상태 저장
  const saveWindowState = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const bounds = mainWindow.getBounds();
    setWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized(),
    });
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

  // 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    if (savedState.isMaximized) {
      mainWindow?.maximize();
    }
    mainWindow?.show();
    mainWindow?.webContents.openDevTools();
  });

  // 외부 링크는 시스템 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // app:// 프로토콜로 로드
  mainWindow.loadURL('app://./index.html');
}

// 앱 준비
app.whenReady().then(() => {
  // 커스텀 프로토콜 등록
  registerAppProtocol();

  // electron-store 초기화
  createStore();

  // IPC 핸들러 등록
  registerAuthIPC();
  registerStoreIPC();
  registerNotificationsIPC();
  registerLifecycleIPC();
  registerThemeIPC();
  registerSubscriptionIPC();

  // 윈도우 생성
  createWindow();

  // 시스템 트레이
  createTray(mainWindow!);

  // 자동 업데이트
  initAutoUpdater(mainWindow!);

  // macOS: 앱 활성화 시 윈도우가 없으면 새로 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// 모든 윈도우 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 보안: 네비게이션 제한
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'app:') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
