import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 저장소
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    remove: (key: string) => ipcRenderer.invoke('store:remove', key),
  },

  // 인증
  auth: {
    openOAuth: (provider: string) => ipcRenderer.invoke('auth:openOAuth', provider),
    onOAuthCallback: (callback: (data: any) => void) => {
      ipcRenderer.on('auth:oauthCallback', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('auth:oauthCallback');
    },
  },

  // 알림
  notifications: {
    show: (title: string, body: string, opts?: any) =>
      ipcRenderer.invoke('notifications:show', title, body, opts),
    schedule: (title: string, body: string, at: number) =>
      ipcRenderer.invoke('notifications:schedule', title, body, at),
  },

  // 생명주기
  lifecycle: {
    onFocus: (callback: () => void) => {
      ipcRenderer.on('lifecycle:focus', () => callback());
      return () => ipcRenderer.removeAllListeners('lifecycle:focus');
    },
    onBlur: (callback: () => void) => {
      ipcRenderer.on('lifecycle:blur', () => callback());
      return () => ipcRenderer.removeAllListeners('lifecycle:blur');
    },
    onBeforeQuit: (callback: () => void) => {
      ipcRenderer.on('lifecycle:beforeQuit', () => callback());
      return () => ipcRenderer.removeAllListeners('lifecycle:beforeQuit');
    },
  },

  // 테마
  theme: {
    setTitleBarOverlay: (color: string) =>
      ipcRenderer.invoke('theme:setTitleBarOverlay', color),
    getSystemTheme: () => ipcRenderer.invoke('theme:getSystemTheme'),
    onThemeChanged: (callback: (theme: string) => void) => {
      ipcRenderer.on('theme:changed', (_event, theme) => callback(theme));
      return () => ipcRenderer.removeAllListeners('theme:changed');
    },
  },

  // 앱 정보
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  },

  // 구독
  subscription: {
    openSubscriptionPage: (url: string) =>
      ipcRenderer.invoke('subscription:openPage', url),
  },

  // 트레이
  tray: {
    updateBadge: (count: number) => ipcRenderer.invoke('tray:updateBadge', count),
  },

  // 업데이터
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('updater:available', (_event, info) => callback(info));
      return () => ipcRenderer.removeAllListeners('updater:available');
    },
    installUpdate: () => ipcRenderer.invoke('updater:install'),
  },

  // 윈도우 컨트롤
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // macOS Services 메뉴 → "Add to DayStep"
  quickAdd: {
    onPendingTodo: (callback: (data: { text: string; receivedAt: number }) => void) => {
      ipcRenderer.on('quickAdd:pending', (_event, data) => callback(data));
      return () => ipcRenderer.removeAllListeners('quickAdd:pending');
    },
  },
});
