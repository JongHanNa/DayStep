/**
 * Paddle 구독 관리 API Route
 * - 구독 취소 (cancel)
 * - 취소 철회 (reactivate)
 * - 결제 수단 변경 트랜잭션 생성 (update-payment)
 * - 플랜 변경 (change-plan): 월간→연간 업그레이드
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_API_BASE = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com';

export async function POST(req: NextRequest) {
  try {
    // PADDLE_API_KEY 확인
    if (!PADDLE_API_KEY) {
      return NextResponse.json(
        { error: 'Paddle API key not configured' },
        { status: 500 }
      );
    }

    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // 사용자 인증 확인
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Request body 파싱
    const body = await req.json();
    const { action } = body as { action: string };

    if (!action || !['cancel', 'reactivate', 'update-payment', 'change-plan'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "cancel", "reactivate", "update-payment", or "change-plan"' },
        { status: 400 }
      );
    }

    // subscriptions 테이블에서 paddle_subscription_id 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('paddle_subscription_id, subscription_end_date')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription?.paddle_subscription_id) {
      return NextResponse.json(
        { error: 'No Paddle subscription found' },
        { status: 404 }
      );
    }

    const paddleSubId = subscription.paddle_subscription_id;

    // service_role 클라이언트 (DB 직접 업데이트용)
    const serviceClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    // action에 따라 Paddle API 호출
    if (action === 'cancel') {
      const paddleRes = await fetch(
        `${PADDLE_API_BASE}/subscriptions/${paddleSubId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            effective_from: 'next_billing_period',
          }),
        }
      );

      if (!paddleRes.ok) {
        const errData = await paddleRes.json().catch(() => ({}));
        console.error('Paddle cancel error:', errData);
        return NextResponse.json(
          { error: `구독 취소 실패: ${errData?.error?.detail || errData?.error?.type || '알 수 없는 오류'}`, details: errData },
          { status: paddleRes.status }
        );
      }

      // cancel 성공 시 DB에 cancelled_at 즉시 설정 (webhook 도착 전 UI 반영용)
      const cancelClient = serviceClient || supabase;
      const { error: cancelDbError } = await cancelClient
        .from('subscriptions')
        .update({ cancelled_at: new Date().toISOString() })
        .eq('paddle_subscription_id', paddleSubId);

      if (cancelDbError) {
        console.error('[Paddle manage] cancel DB update failed:', cancelDbError, 'for:', paddleSubId);
      }

      return NextResponse.json({
        success: true,
        message: 'Subscription cancellation scheduled',
        subscriptionEndDate: subscription.subscription_end_date,
      });
    }

    if (action === 'reactivate') {
      // Paddle API: scheduled_change를 null로 설정하여 취소 예약 해제
      const paddleRes = await fetch(
        `${PADDLE_API_BASE}/subscriptions/${paddleSubId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scheduled_change: null,
          }),
        }
      );

      if (!paddleRes.ok) {
        const errData = await paddleRes.json().catch(() => ({}));
        console.error('Paddle reactivate error:', errData);
        if (paddleRes.status === 403) {
          console.error(
            'Paddle 403 Forbidden: API 키에 Subscriptions Write 권한이 필요합니다. ' +
            'Paddle Dashboard → Developer Tools → Authentication에서 키 권한을 확인하세요.'
          );
        }
        return NextResponse.json(
          { error: `취소 철회 실패: ${errData?.error?.detail || errData?.error?.type || '알 수 없는 오류'}`, details: errData },
          { status: paddleRes.status }
        );
      }

      // reactivate 성공 시 DB에서 cancelled_at 클리어
      const reactivateClient = serviceClient || supabase;
      const { error: dbError } = await reactivateClient
        .from('subscriptions')
        .update({ cancelled_at: null })
        .eq('paddle_subscription_id', paddleSubId);

      if (dbError) {
        console.error('[Paddle manage] reactivate DB update failed:', dbError, 'for:', paddleSubId);
      }
      const dbUpdated = !dbError;

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated',
        dbUpdated,
      });
    }

    if (action === 'update-payment') {
      const paddleRes = await fetch(
        `${PADDLE_API_BASE}/subscriptions/${paddleSubId}/update-payment-method-transaction`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!paddleRes.ok) {
        const errData = await paddleRes.json().catch(() => ({}));
        console.error('Paddle update-payment error:', errData);
        return NextResponse.json(
          { error: `결제 수단 변경 실패: ${errData?.error?.detail || errData?.error?.type || '알 수 없는 오류'}`, details: errData },
          { status: paddleRes.status }
        );
      }

      const paddleData = await paddleRes.json();
      const transactionId = paddleData.data?.id;

      if (!transactionId) {
        return NextResponse.json(
          { error: 'No transaction ID returned from Paddle' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        transactionId,
      });
    }

    if (action === 'change-plan') {
      const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || 'pri_01kbgx1kbjmtw96e0fkjg46j1r';
      const { newPriceId } = body as { newPriceId?: string };

      // 연간 price_id만 허용 (월간→연간 업그레이드만 지원)
      if (!newPriceId || newPriceId !== YEARLY_PRICE_ID) {
        return NextResponse.json(
          { error: '연간 플랜으로의 업그레이드만 지원됩니다.' },
          { status: 400 }
        );
      }

      const paddleRes = await fetch(
        `${PADDLE_API_BASE}/subscriptions/${paddleSubId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            items: [{ price_id: newPriceId, quantity: 1 }],
            proration_billing_mode: 'prorated_immediately',
          }),
        }
      );

      if (!paddleRes.ok) {
        const errData = await paddleRes.json().catch(() => ({}));
        console.error('Paddle change-plan error:', errData);
        return NextResponse.json(
          { error: `플랜 변경 실패: ${errData?.error?.detail || errData?.error?.type || '알 수 없는 오류'}`, details: errData },
          { status: paddleRes.status }
        );
      }

      // 성공 시 DB 업데이트 (webhook 도착 전 즉시 반영)
      const changePlanClient = serviceClient || supabase;
      const { error: changePlanDbError } = await changePlanClient
        .from('subscriptions')
        .update({
          paddle_price_id: newPriceId,
          product_id: 'pro_yearly',
        })
        .eq('paddle_subscription_id', paddleSubId);

      if (changePlanDbError) {
        console.error('[Paddle manage] change-plan DB update failed:', changePlanDbError, 'for:', paddleSubId);
      }

      return NextResponse.json({
        success: true,
        message: 'Plan changed to yearly',
      });
    }
  } catch (error) {
    console.error('Paddle manage API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
