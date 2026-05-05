/**
 * 수면 설정 동기화 훅 (RN)
 * useCleaningSettingsSync 패턴 미러
 *
 * - 로그인 시 DB에서 sleep_settings 로드 (timestamp 비교)
 * - 설정 변경 시 500ms debounce → DB 저장
 */
import {useEffect, useRef, useCallback} from 'react';
import {
  useSleepStore,
  getSleepSettingsForSync,
} from '@/stores/sleepStore';
import {
  loadSleepSettings,
  saveSleepSettings,
} from '@/lib/preferences';

export function useSleepSettingsSync(userId: string | undefined) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const previousSettingsRef = useRef<string>('');

  const loadSleepSettingsFromDB = useSleepStore(
    s => s.loadSleepSettingsFromDB,
  );
  const _sleepSettingsSyncedAt = useSleepStore(
    s => s._sleepSettingsSyncedAt,
  );

  // DB에 설정 저장
  const saveSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const settings = getSleepSettingsForSync();
      await saveSleepSettings(userId, settings);
      console.log('[SleepSettingsSync] saved to DB');
    } catch (err) {
      console.error('[SleepSettingsSync] save error:', err);
    }
  }, [userId]);

  // DB에서 설정 로드
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const dbSettings = await loadSleepSettings(userId);

      if (dbSettings) {
        const localSyncedAt = _sleepSettingsSyncedAt;
        const dbSyncedAt = dbSettings._lastSyncedAt;

        if (
          !localSyncedAt ||
          (dbSyncedAt && new Date(dbSyncedAt) > new Date(localSyncedAt))
        ) {
          loadSleepSettingsFromDB(dbSettings);
          console.log('[SleepSettingsSync] loaded from DB');
        } else {
          await saveSettings();
        }
      } else {
        await saveSettings();
      }
    } catch (err) {
      console.error('[SleepSettingsSync] load error:', err);
    } finally {
      isInitialLoadRef.current = false;
    }
  }, [
    userId,
    loadSleepSettingsFromDB,
    _sleepSettingsSyncedAt,
    saveSettings,
  ]);

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

    const currentSettings = JSON.stringify(getSleepSettingsForSync());
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
