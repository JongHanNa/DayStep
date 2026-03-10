/**
 * 설정 동기화 훅 (RN)
 * 웹 apps/web/hooks/useSettingsSync.ts 패턴 재사용
 *
 * - 로그인 시 DB에서 설정 로드 (timestamp 비교)
 * - 설정 변경 시 500ms debounce → DB 저장
 */
import {useEffect, useRef, useCallback} from 'react';
import {useSettingsStore, getSettingsForSync} from '@/stores/settingsStore';
import {loadAppSettings, saveAppSettings} from '@/lib/preferences';

export function useSettingsSync(userId: string | undefined) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const previousSettingsRef = useRef<string>('');

  const loadFromDB = useSettingsStore(s => s.loadFromDB);
  const _lastSyncedAt = useSettingsStore(s => s._lastSyncedAt);

  // DB에 설정 저장
  const saveSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const settings = getSettingsForSync();
      await saveAppSettings(userId, settings);
    } catch (err) {
      console.error('[SettingsSync] save error:', err);
    }
  }, [userId]);

  // DB에서 설정 로드
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const dbSettings = await loadAppSettings(userId);

      if (dbSettings) {
        const localSyncedAt = _lastSyncedAt;
        const dbSyncedAt = dbSettings._lastSyncedAt;

        if (
          !localSyncedAt ||
          (dbSyncedAt && new Date(dbSyncedAt) > new Date(localSyncedAt))
        ) {
          loadFromDB(dbSettings);
        } else {
          await saveSettings();
        }
      } else {
        await saveSettings();
      }
    } catch (err) {
      console.error('[SettingsSync] load error:', err);
    } finally {
      isInitialLoadRef.current = false;
    }
  }, [userId, loadFromDB, _lastSyncedAt, saveSettings]);

  // Debounced 저장
  const debouncedSave = useCallback(() => {
    if (!userId || isInitialLoadRef.current) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSettings();
    }, 500);
  }, [userId, saveSettings]);

  // 로그인 시 DB에서 설정 로드
  useEffect(() => {
    if (userId) {
      isInitialLoadRef.current = true;
      loadSettings();
    }
  }, [userId, loadSettings]);

  // 설정 변경 감지 및 저장
  useEffect(() => {
    if (!userId || isInitialLoadRef.current) return;

    const currentSettings = JSON.stringify(getSettingsForSync());
    if (
      previousSettingsRef.current &&
      previousSettingsRef.current !== currentSettings
    ) {
      debouncedSave();
    }
    previousSettingsRef.current = currentSettings;
  });

  // 클린업
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
}
