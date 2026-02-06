/**
 * Electron 알림 래퍼
 * IPC를 통해 네이티브 Notification API 사용
 */

function getElectronAPI() {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI;
}

export async function showNotification(
  title: string,
  body: string,
  opts?: { silent?: boolean }
): Promise<boolean> {
  const api = getElectronAPI();
  if (!api) return false;
  const result = await api.notifications.show(title, body, opts);
  return result.success;
}

export async function scheduleNotification(
  title: string,
  body: string,
  at: Date
): Promise<number | null> {
  const api = getElectronAPI();
  if (!api) return null;
  const result = await api.notifications.schedule(title, body, at.getTime());
  return result.id;
}
