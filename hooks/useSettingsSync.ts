'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore, AppSettings, getSettingsForSync } from '@/state/stores/settingsStore';
import { loadAppSettingsWithJWT, saveAppSettingsWithJWT } from '@/lib/supabase/preferences';

/**
 * 설정 동기화 훅
 *
 * - 로그인 시 DB에서 설정 로드
 * - 설정 변경 시 debounce로 DB 저장
 * - localStorage 우선 로드 (빠른 초기화) + DB 백업
 */
export function useSettingsSync(userId: string | undefined) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const previousSettingsRef = useRef<string>('');

  const {
    loadFromDB,
    setIsSyncing,
    _lastSyncedAt,
  } = useSettingsStore();

  // DB에서 설정 로드
  const loadSettings = useCallback(async () => {
    if (!userId) return;

    console.log('🔄 DB에서 설정 로드 시작:', { userId });
    setIsSyncing(true);

    try {
      const dbSettings = await loadAppSettingsWithJWT(userId);

      if (dbSettings) {
        const localSyncedAt = _lastSyncedAt;
        const dbSyncedAt = dbSettings._lastSyncedAt;

        // DB 데이터가 더 최신이면 적용
        if (!localSyncedAt || (dbSyncedAt && new Date(dbSyncedAt) > new Date(localSyncedAt))) {
          console.log('📥 DB 설정이 더 최신, 로컬에 적용');
          loadFromDB(dbSettings);
        } else {
          console.log('📤 로컬 설정이 더 최신, DB에 저장');
          await saveSettings();
        }
      } else {
        // DB에 설정이 없으면 현재 로컬 설정을 DB에 저장
        console.log('📤 DB에 설정 없음, 로컬 설정을 DB에 저장');
        await saveSettings();
      }
    } catch (error) {
      console.error('❌ 설정 로드 실패:', error);
    } finally {
      setIsSyncing(false);
      isInitialLoadRef.current = false;
    }
  }, [userId, loadFromDB, setIsSyncing, _lastSyncedAt]);

  // DB에 설정 저장
  const saveSettings = useCallback(async () => {
    if (!userId) return;

    console.log('💾 DB에 설정 저장 시작');
    setIsSyncing(true);

    try {
      const settings = getSettingsForSync();
      await saveAppSettingsWithJWT(userId, settings);
      console.log('✅ DB 설정 저장 완료');
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, setIsSyncing]);

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

    // 설정이 실제로 변경되었는지 확인
    if (previousSettingsRef.current && previousSettingsRef.current !== currentSettings) {
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

  return {
    loadSettings,
    saveSettings,
  };
}
