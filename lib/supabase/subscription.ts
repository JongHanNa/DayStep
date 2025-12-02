/**
 * 구독 관련 Supabase API
 *
 * 개발 테스트용 구독 취소 등
 */

import { supabase } from '../supabase';

/**
 * 개발 환경 전용: 구독 즉시 취소
 *
 * @param userId - 사용자 ID
 * @returns 성공 여부
 */
export async function devCancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV !== 'development') {
    console.warn('🚨 devCancelSubscription은 개발 환경에서만 사용 가능합니다.');
    return {
      success: false,
      error: '개발 환경에서만 사용 가능합니다.',
    };
  }

  try {
    console.log('💳 [DEV] 구독 취소 시작:', userId);

    // RPC 함수 호출
    const { error } = await (supabase.rpc as any)('dev_cancel_subscription', {
      p_user_id: userId,
    });

    if (error) {
      console.error('💳 [DEV] 구독 취소 실패:', error);
      return {
        success: false,
        error: error.message || '구독 취소 실패',
      };
    }

    console.log('💳 [DEV] 구독 취소 완료');
    return { success: true };
  } catch (err: any) {
    console.error('💳 [DEV] 구독 취소 오류:', err);
    return {
      success: false,
      error: err.message || '구독 취소 중 오류 발생',
    };
  }
}

/**
 * 개발 환경 전용: 구독 활성화 (테스트용)
 *
 * @param userId - 사용자 ID
 * @returns 성공 여부
 */
export async function devActivateSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  // 개발 환경에서만 허용
  if (process.env.NODE_ENV !== 'development') {
    console.warn('🚨 devActivateSubscription은 개발 환경에서만 사용 가능합니다.');
    return {
      success: false,
      error: '개발 환경에서만 사용 가능합니다.',
    };
  }

  try {
    console.log('💳 [DEV] 구독 활성화 시작:', userId);

    // 직접 업데이트
    const { error } = await (supabase as any)
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('💳 [DEV] 구독 활성화 실패:', error);
      return {
        success: false,
        error: error.message || '구독 활성화 실패',
      };
    }

    console.log('💳 [DEV] 구독 활성화 완료');
    return { success: true };
  } catch (err: any) {
    console.error('💳 [DEV] 구독 활성화 오류:', err);
    return {
      success: false,
      error: err.message || '구독 활성화 중 오류 발생',
    };
  }
}
