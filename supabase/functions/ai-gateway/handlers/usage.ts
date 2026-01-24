/**
 * 사용량 핸들러
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { createJsonResponse } from '../utils/response.ts';

/**
 * 사용량 조회
 */
export async function handleUsage(
  supabase: SupabaseClient,
  userId: string,
  _req: Request
): Promise<Response> {
  try {
    // 구독 상태 확인
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single();

    const isPro = subscription?.status === 'active' || subscription?.status === 'trial';

    // 사용량 조회
    const { data, error } = await supabase.rpc('get_ai_usage', {
      p_user_id: userId,
      p_is_pro: isPro,
    });

    if (error) {
      throw error;
    }

    return createJsonResponse({
      success: true,
      is_pro: isPro,
      usage: {
        current_count: data.current_count,
        daily_limit: data.daily_limit,
        remaining: data.remaining,
        is_limit_exceeded: data.is_limit_exceeded,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
        estimated_cost: data.estimated_cost,
      },
    });
  } catch (error) {
    console.error('Usage fetch error:', error);
    return createJsonResponse(
      {
        error: 'Failed to fetch usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
