/**
 * User Preferences - 사용자 설정 관리
 */

import { queryRLSTableWithJWT, fetchWithJWT } from './core';
import { supabase } from '../supabase';

/**
 * JWT 방식으로 사용자 설정 로드
 */
export async function loadUserPreferencesWithJWT(
  userId: string,
  preferenceKey: string
): Promise<any | null> {
  console.log('⚙️ JWT 방식으로 사용자 설정 로드:', { userId, preferenceKey });

  try {
    const result = await queryRLSTableWithJWT('user_preferences', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'preference_key',
        operator: 'eq',
        value: preferenceKey
      }
    ], {
      select: 'preference_value',
      single: true
    });

    if (result?.preference_value) {
      console.log('✅ JWT 사용자 설정 로드 성공:', {
        preferenceKey,
        hasData: !!result.preference_value
      });
      return result.preference_value;
    } else {
      console.log('🔧 JWT 사용자 설정 없음, 기본값 사용:', { preferenceKey });
      return null;
    }
  } catch (error: any) {
    if (error.message?.includes('PGRST116') || error.message?.includes('No rows found')) {
      console.log('🔧 JWT 사용자 설정 없음, 기본값 사용:', { preferenceKey });
      return null;
    }
    console.error('❌ JWT 사용자 설정 로드 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 설정 저장 (upsert)
 */
export async function saveUserPreferencesWithJWT(
  userId: string,
  preferenceKey: string,
  preferenceValue: any
): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  const isNativeEnvironment = Capacitor.isNativePlatform();

  console.log('💾 사용자 설정 저장:', {
    userId,
    preferenceKey,
    hasValue: !!preferenceValue,
    method: isNativeEnvironment ? 'JWT' : 'Supabase-Client'
  });

  try {
    const settingsData = {
      user_id: userId,
      preference_key: preferenceKey,
      preference_value: preferenceValue,
      updated_at: new Date().toISOString()
    };

    if (isNativeEnvironment) {
      // Capacitor 환경: JWT 방식 사용 (409 에러 방지를 위해 바로 UPDATE)
      console.log('🔧 Capacitor 환경에서 바로 PATCH 방식 사용 (409 에러 방지)');

      const updateResult = await fetchWithJWT(`/user_preferences?user_id=eq.${userId}&preference_key=eq.${preferenceKey}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          preference_value: preferenceValue,
          updated_at: new Date().toISOString()
        })
      });

      console.log('✅ JWT 사용자 설정 저장 성공 (UPDATE):', {
        preferenceKey,
        result: !!updateResult
      });
      return true;
    } else {
      // 웹 환경: Supabase 클라이언트의 upsert() 메소드 사용
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(settingsData, {
          onConflict: 'user_id,preference_key',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('❌ Supabase 클라이언트 UPSERT 실패:', error);
        return false;
      }

      console.log('✅ Supabase 클라이언트 UPSERT 성공:', {
        preferenceKey,
        result: !!data
      });
      return true;
    }
  } catch (error) {
    console.error('❌ 사용자 설정 저장 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 타임라인 표시 설정 로드
 */
export async function loadTimelineDisplayPreferencesWithJWT(userId: string): Promise<{
  showDayStartGap: boolean;
  showPastGaps: boolean;
} | null> {
  console.log('📅 JWT 방식으로 타임라인 표시 설정 로드:', { userId });

  try {
    const preferences = await loadUserPreferencesWithJWT(userId, 'timeline_display_settings');

    if (preferences) {
      return {
        showDayStartGap: preferences.showDayStartGap ?? true,
        showPastGaps: preferences.showPastGaps ?? false
      };
    }

    return null;
  } catch (error) {
    console.error('❌ JWT 타임라인 표시 설정 로드 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 타임라인 표시 설정 저장
 */
export async function saveTimelineDisplayPreferencesWithJWT(
  userId: string,
  showDayStartGap: boolean,
  showPastGaps: boolean
): Promise<boolean> {
  console.log('💾 JWT 방식으로 타임라인 표시 설정 저장:', {
    userId,
    showDayStartGap,
    showPastGaps
  });

  try {
    const settingsData = {
      showDayStartGap,
      showPastGaps,
      updatedAt: new Date().toISOString()
    };

    return await saveUserPreferencesWithJWT(userId, 'timeline_display_settings', settingsData);
  } catch (error) {
    console.error('❌ JWT 타임라인 표시 설정 저장 실패:', error);
    return false;
  }
}
