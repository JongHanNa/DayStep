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
