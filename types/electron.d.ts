/**
 * Electron API 타입 정의
 * preload.ts에서 contextBridge로 노출된 API의 타입
 */

interface ElectronStoreAPI {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<boolean>;
  remove(key: string): Promise<boolean>;
}

interface ElectronAuthAPI {
  openOAuth(provider: string): Promise<{ success?: boolean; error?: string }>;
  onOAuthCallback(callback: (data: { code?: string; error?: string; provider: string }) => void): () => void;
}

interface ElectronNotificationsAPI {
  show(title: string, body: string, opts?: { silent?: boolean }): Promise<{ success: boolean }>;
  schedule(title: string, body: string, at: number): Promise<{ id: number; scheduled?: boolean; immediate?: boolean }>;
}

interface ElectronLifecycleAPI {
  onFocus(callback: () => void): () => void;
  onBlur(callback: () => void): () => void;
  onBeforeQuit(callback: () => void): () => void;
}

interface ElectronThemeAPI {
  setTitleBarOverlay(color: string): Promise<void>;
  getSystemTheme(): Promise<'light' | 'dark'>;
  onThemeChanged(callback: (theme: string) => void): () => void;
}

interface ElectronAppAPI {
  getVersion(): Promise<string>;
  getPlatform(): Promise<string>;
  openExternal(url: string): Promise<boolean>;
}

interface ElectronSubscriptionAPI {
  openSubscriptionPage(url: string): Promise<{ success: boolean; error?: string }>;
}

interface ElectronTrayAPI {
  updateBadge(count: number): Promise<boolean>;
}

interface ElectronUpdaterAPI {
  checkForUpdates(): Promise<any>;
  onUpdateAvailable(callback: (info: any) => void): () => void;
  installUpdate(): Promise<void>;
}

interface ElectronWindowAPI {
  minimize(): Promise<void>;
  maximize(): Promise<void>;
  close(): Promise<void>;
  isMaximized(): Promise<boolean>;
}

interface ElectronAPI {
  store: ElectronStoreAPI;
  auth: ElectronAuthAPI;
  notifications: ElectronNotificationsAPI;
  lifecycle: ElectronLifecycleAPI;
  theme: ElectronThemeAPI;
  app: ElectronAppAPI;
  subscription: ElectronSubscriptionAPI;
  tray: ElectronTrayAPI;
  updater: ElectronUpdaterAPI;
  window: ElectronWindowAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
