/**
 * User Preferences — RN용 Supabase 설정 관리
 * 웹 apps/web/lib/supabase/preferences.ts 패턴 재사용
 */
import {supabase} from './supabase';

/** app_settings 키로 앱 설정 로드 */
export async function loadAppSettings(
  userId: string,
): Promise<Record<string, any> | null> {
  try {
    const {data, error} = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', userId)
      .eq('preference_key', 'app_settings')
      .maybeSingle();

    if (error) {
      console.error('[Preferences] load error:', error);
      return null;
    }

    return data?.preference_value ?? null;
  } catch (err) {
    console.error('[Preferences] load error:', err);
    return null;
  }
}

/** cleaning_settings 키로 청소 설정 로드 */
export async function loadCleaningSettings(
  userId: string,
): Promise<Record<string, any> | null> {
  try {
    const {data, error} = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', userId)
      .eq('preference_key', 'cleaning_settings')
      .maybeSingle();

    if (error) {
      console.error('[Preferences] cleaning load error:', error);
      return null;
    }

    return data?.preference_value ?? null;
  } catch (err) {
    console.error('[Preferences] cleaning load error:', err);
    return null;
  }
}

/** cleaning_settings 키로 청소 설정 저장 (upsert) */
export async function saveCleaningSettings(
  userId: string,
  settings: Record<string, any>,
): Promise<boolean> {
  try {
    const {error} = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          preference_key: 'cleaning_settings',
          preference_value: {
            ...settings,
            _lastSyncedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id,preference_key', ignoreDuplicates: false},
      )
      .select();

    if (error) {
      console.error('[Preferences] cleaning save error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Preferences] cleaning save error:', err);
    return false;
  }
}

/** sleep_settings 키로 수면 설정 로드 */
export async function loadSleepSettings(
  userId: string,
): Promise<Record<string, any> | null> {
  try {
    const {data, error} = await supabase
      .from('user_preferences')
      .select('preference_value')
      .eq('user_id', userId)
      .eq('preference_key', 'sleep_settings')
      .maybeSingle();

    if (error) {
      console.error('[Preferences] sleep load error:', error);
      return null;
    }

    return data?.preference_value ?? null;
  } catch (err) {
    console.error('[Preferences] sleep load error:', err);
    return null;
  }
}

/** sleep_settings 키로 수면 설정 저장 (upsert) */
export async function saveSleepSettings(
  userId: string,
  settings: Record<string, any>,
): Promise<boolean> {
  try {
    const {error} = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          preference_key: 'sleep_settings',
          preference_value: {
            ...settings,
            _lastSyncedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id,preference_key', ignoreDuplicates: false},
      )
      .select();

    if (error) {
      console.error('[Preferences] sleep save error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Preferences] sleep save error:', err);
    return false;
  }
}

/** app_settings 키로 앱 설정 저장 (upsert) */
export async function saveAppSettings(
  userId: string,
  settings: Record<string, any>,
): Promise<boolean> {
  try {
    const {error} = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          preference_key: 'app_settings',
          preference_value: {
            ...settings,
            _lastSyncedAt: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        },
        {onConflict: 'user_id,preference_key', ignoreDuplicates: false},
      )
      .select();

    if (error) {
      console.error('[Preferences] save error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Preferences] save error:', err);
    return false;
  }
}
