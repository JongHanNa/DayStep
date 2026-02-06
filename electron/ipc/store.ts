import { ipcMain } from 'electron';
import { getStore } from '../store';

export function registerStoreIPC() {
  ipcMain.handle('store:get', async (_event, key: string) => {
    try {
      return getStore().get(key as any);
    } catch {
      return null;
    }
  });

  ipcMain.handle('store:set', async (_event, key: string, value: any) => {
    try {
      getStore().set(key as any, value);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('store:remove', async (_event, key: string) => {
    try {
      getStore().delete(key as any);
      return true;
    } catch {
      return false;
    }
  });
}
