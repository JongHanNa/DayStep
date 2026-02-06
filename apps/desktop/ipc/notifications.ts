import { ipcMain, Notification } from 'electron';

const scheduledNotifications = new Map<number, NodeJS.Timeout>();
let nextId = 0;

export function registerNotificationsIPC() {
  ipcMain.handle('notifications:show', async (_event, title: string, body: string, opts?: any) => {
    if (!Notification.isSupported()) return { success: false };

    const notification = new Notification({
      title,
      body,
      silent: opts?.silent ?? false,
    });

    notification.show();
    return { success: true };
  });

  ipcMain.handle('notifications:schedule', async (_event, title: string, body: string, at: number) => {
    const now = Date.now();
    const delay = at - now;

    if (delay <= 0) {
      // 이미 지난 시간이면 즉시 표시
      const notification = new Notification({ title, body });
      notification.show();
      return { id: nextId++, immediate: true };
    }

    const id = nextId++;
    const timeout = setTimeout(() => {
      const notification = new Notification({ title, body });
      notification.show();
      scheduledNotifications.delete(id);
    }, delay);

    scheduledNotifications.set(id, timeout);
    return { id, scheduled: true };
  });
}
