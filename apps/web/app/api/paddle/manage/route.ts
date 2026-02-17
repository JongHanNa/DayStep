/**
 * Paddle 구독 관리 API Route
 * - 구독 취소 (cancel)
 * - 취소 철회 (reactivate)
 * - 결제 수단 변경 트랜잭션 생성 (update-payment)
 * - 플랜 변경 (change-plan): 월간→연간 업그레이드
 * - 환불 (refund): 7일 이내 전액 환불
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

    if (!action || !['cancel', 'reactivate', 'update-payment', 'change-plan', 'refund'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "cancel", "reactivate", "update-payment", "change-plan", or "refund"' },
        { status: 400 }
      );
    }

    // subscriptions 테이블에서 paddle_subscription_id 조회
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('paddle_subscription_id, subscription_end_date, subscription_start_date')
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
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[Paddle manage] SUPABASE_SERVICE_ROLE_KEY not set — DB updates will use anon key and may fail due to RLS');
    }
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
        cancelledAt: new Date().toISOString(),
        dbUpdated: !cancelDbError,
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

      // Paddle 응답에서 새 billing period 추출
      const paddleData = await paddleRes.json();
      const newEndDate = paddleData?.data?.current_billing_period?.ends_at || null;
      const nextBilledAt = paddleData?.data?.next_billed_at || null;

      // 성공 시 DB 업데이트 (webhook 도착 전 즉시 반영)
      const changePlanClient = serviceClient || supabase;
      const updateFields: Record<string, any> = {
        paddle_price_id: newPriceId,
        product_id: 'pro_yearly',
      };
      if (newEndDate) {
        updateFields.subscription_end_date = new Date(newEndDate).toISOString();
      }

      const { error: changePlanDbError } = await changePlanClient
        .from('subscriptions')
        .update(updateFields)
        .eq('paddle_subscription_id', paddleSubId);

      if (changePlanDbError) {
        console.error('[Paddle manage] change-plan DB update failed:', changePlanDbError, 'for:', paddleSubId);
      }

      return NextResponse.json({
        success: true,
        message: 'Plan changed to yearly',
        subscriptionEndDate: newEndDate,
        nextBilledAt: nextBilledAt,
      });
    }

    if (action === 'refund') {
      // 7일 이내 검증
      const startDate = subscription.subscription_start_date;
      if (!startDate) {
        return NextResponse.json(
          { error: '구독 시작일 정보가 없습니다.' },
          { status: 400 }
        );
      }

      const daysSinceStart = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart > 7) {
        return NextResponse.json(
          { error: '환불 가능 기간(7일)이 지났습니다.' },
          { status: 400 }
        );
      }

      // 재구독 환불 제한: refund_count > 0이면 환불 불가
      const refundCheckClient = serviceClient || supabase;
      const { data: userData, error: userError } = await refundCheckClient
        .from('users')
        .select('refund_count')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('[Paddle manage] refund_count check failed:', userError);
        // DB 조회 실패 시에도 환불 진행 차단 (안전 측)
        return NextResponse.json(
          { error: '사용자 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.' },
          { status: 500 }
        );
      }

      if (userData && (userData.refund_count ?? 0) > 0) {
        return NextResponse.json(
          { error: '이전에 환불을 받은 이력이 있어 환불이 불가합니다. 환불 보장은 최초 1회 구독에 한해 제공됩니다.' },
          { status: 400 }
        );
      }

      // 1. 모든 completed 트랜잭션 조회
      const txRes = await fetch(
        `${PADDLE_API_BASE}/transactions?subscription_id=${paddleSubId}&status=completed&order_by=created_at[DESC]&per_page=50`,
        {
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!txRes.ok) {
        const errData = await txRes.json().catch(() => ({}));
        console.error('Paddle transactions fetch error:', errData);
        return NextResponse.json(
          { error: `트랜잭션 조회 실패: ${errData?.error?.detail || '알 수 없는 오류'}` },
          { status: txRes.status }
        );
      }

      const txData = await txRes.json();
      const transactions = txData.data || [];
      if (transactions.length === 0) {
        return NextResponse.json(
          { error: '환불할 트랜잭션을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      // 2. 각 트랜잭션마다 Paddle Adjustments API 호출 (전액 환불)
      const refundResults: Array<{ transactionId: string; status: string }> = [];

      for (const transaction of transactions) {
        const lineItems = transaction.details?.line_items || [];
        if (lineItems.length === 0) {
          console.warn(`[Paddle refund] Transaction ${transaction.id} has no line items, skipping`);
          continue;
        }

        const refundItems = lineItems.map((item: any) => ({
          item_id: item.id,
          type: 'full' as const,
        }));

        const adjustRes = await fetch(
          `${PADDLE_API_BASE}/adjustments`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${PADDLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'refund',
              transaction_id: transaction.id,
              reason: 'customer request within 7-day policy',
              items: refundItems,
            }),
          }
        );

        if (!adjustRes.ok) {
          const errData = await adjustRes.json().catch(() => ({}));
          console.error(`Paddle adjustment error for transaction ${transaction.id}:`, errData);
          return NextResponse.json(
            {
              error: `환불 요청 실패 (트랜잭션 ${transaction.id}): ${errData?.error?.detail || errData?.error?.type || '알 수 없는 오류'}`,
              details: errData,
              partialRefunds: refundResults,
            },
            { status: adjustRes.status }
          );
        }

        const adjustData = await adjustRes.json();
        refundResults.push({
          transactionId: transaction.id,
          status: adjustData.data?.status || 'pending_approval',
        });
      }

      if (refundResults.length === 0) {
        return NextResponse.json(
          { error: '환불 가능한 트랜잭션이 없습니다.' },
          { status: 400 }
        );
      }

      // 4. DB 업데이트: 구독 취소 처리
      const refundClient = serviceClient || supabase;
      const { error: refundDbError } = await refundClient
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('paddle_subscription_id', paddleSubId);

      if (refundDbError) {
        console.error('[Paddle manage] refund DB update failed:', refundDbError, 'for:', paddleSubId);
      }

      // 4-1. users 테이블의 refund_count 즉시 증가 (webhook 미도착 대비)
      const { error: refundCountError } = await refundClient
        .from('users')
        .update({ refund_count: (userData?.refund_count ?? 0) + 1 })
        .eq('id', user.id);

      if (refundCountError) {
        console.error('[Paddle manage] refund_count update failed:', refundCountError, 'for user:', user.id);
      }

      // 5. Paddle 구독도 즉시 취소
      await fetch(
        `${PADDLE_API_BASE}/subscriptions/${paddleSubId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            effective_from: 'immediately',
          }),
        }
      ).catch((err) => {
        console.error('[Paddle manage] subscription cancel after refund failed:', err);
      });

      return NextResponse.json({
        success: true,
        message: `환불 요청이 처리되었습니다. (${refundResults.length}건)`,
        refundResults,
        cancelledAt: new Date().toISOString(),
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
