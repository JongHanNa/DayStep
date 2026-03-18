/**
 * 청소 설정 동기화 훅 (RN)
 * useSettingsSync 패턴 미러
 *
 * - 로그인 시 DB에서 cleaning_settings 로드 (timestamp 비교)
 * - 설정 변경 시 500ms debounce → DB 저장
 */
import {useEffect, useRef, useCallback} from 'react';
import {
  useCleaningStore,
  getCleaningSettingsForSync,
} from '@/stores/cleaningStore';
import {
  loadCleaningSettings,
  saveCleaningSettings,
} from '@/lib/preferences';

export function useCleaningSettingsSync(userId: string | undefined) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const previousSettingsRef = useRef<string>('');

  const loadCleaningSettingsFromDB = useCleaningStore(
    s => s.loadCleaningSettingsFromDB,
  );
  const _cleaningSettingsSyncedAt = useCleaningStore(
    s => s._cleaningSettingsSyncedAt,
  );

  // DB에 설정 저장
  const saveSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const settings = getCleaningSettingsForSync();
      await saveCleaningSettings(userId, settings);
    } catch (err) {
      console.error('[CleaningSettingsSync] save error:', err);
    }
  }, [userId]);

  // DB에서 설정 로드
  const loadSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const dbSettings = await loadCleaningSettings(userId);

      if (dbSettings) {
        const localSyncedAt = _cleaningSettingsSyncedAt;
        const dbSyncedAt = dbSettings._lastSyncedAt;

        if (
          !localSyncedAt ||
          (dbSyncedAt && new Date(dbSyncedAt) > new Date(localSyncedAt))
        ) {
          loadCleaningSettingsFromDB(dbSettings);
        } else {
          await saveSettings();
        }
      } else {
        await saveSettings();
      }
    } catch (err) {
      console.error('[CleaningSettingsSync] load error:', err);
    } finally {
      isInitialLoadRef.current = false;
    }
  }, [
    userId,
    loadCleaningSettingsFromDB,
    _cleaningSettingsSyncedAt,
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

    const currentSettings = JSON.stringify(getCleaningSettingsForSync());
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
