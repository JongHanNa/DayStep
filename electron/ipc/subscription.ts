import { ipcMain, shell } from 'electron';
import { updateTrayBadge } from '../tray';

export function registerSubscriptionIPC() {
  // 구독 페이지를 시스템 브라우저에서 열기
  ipcMain.handle('subscription:openPage', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (err) {
      console.error('[Subscription] Failed to open page:', err);
      return { success: false, error: String(err) };
    }
  });

  // 트레이 배지 업데이트
  ipcMain.handle('tray:updateBadge', async (_event, count: number) => {
    updateTrayBadge(count);
    return true;
  });
}
