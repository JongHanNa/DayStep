import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

/**
 * Revenue Cat Webhook Handler
 *
 * 구독 이벤트를 Revenue Cat으로부터 받아 Supabase에 동기화
 *
 * 지원 이벤트:
 * - INITIAL_PURCHASE: 첫 구매 (체험 → 유료 전환 또는 바로 구매)
 * - RENEWAL: 구독 갱신
 * - CANCELLATION: 구독 취소
 * - EXPIRATION: 구독 만료
 * - PRODUCT_CHANGE: 상품 변경 (월→년 등)
 * - BILLING_ISSUE: 결제 문제
 * - REFUND: 환불
 * - UNCANCELLATION: 취소 철회 (자동 갱신 재활성화)
 */

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type: string;
    id: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    period_type: 'TRIAL' | 'NORMAL' | 'PROMOTIONAL';
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE';
    environment: 'PRODUCTION' | 'SANDBOX';
    original_transaction_id: string;
    transaction_id: string;
    presented_offering_id?: string;
    subscriber_attributes?: Record<string, any>;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 환경 변수 확인
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const revenueCatWebhookSecret = Deno.env.get('REVENUE_CAT_WEBHOOK_SECRET');

    // Webhook 검증 (프로덕션에서 필수)
    const authHeader = req.headers.get('Authorization');
    if (revenueCatWebhookSecret && authHeader !== `Bearer ${revenueCatWebhookSecret}`) {
      console.error('Unauthorized webhook request');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase 클라이언트 생성 (서비스 키 사용)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Webhook 이벤트 파싱
    const webhookEvent: RevenueCatWebhookEvent = await req.json();
    const { event } = webhookEvent;

    console.log(`Received Revenue Cat event: ${event.type} for user ${event.app_user_id}`);

    // 이벤트 타입별 처리
    switch (event.type) {
      case 'INITIAL_PURCHASE':
        await handleInitialPurchase(supabase, event);
        break;

      case 'RENEWAL':
        await handleRenewal(supabase, event);
        break;

      case 'CANCELLATION':
        await handleCancellation(supabase, event);
        break;

      case 'EXPIRATION':
        await handleExpiration(supabase, event);
        break;

      case 'PRODUCT_CHANGE':
        await handleProductChange(supabase, event);
        break;

      case 'BILLING_ISSUE':
        await handleBillingIssue(supabase, event);
        break;

      case 'REFUND':
        await handleRefund(supabase, event);
        break;

      case 'UNCANCELLATION':
        await handleUncancellation(supabase, event);
        break;

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true, event_type: event.type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Product ID 정규화 (_dev, _prod 접미사 제거)
 *
 * @example
 * normalizeProductId('pro_monthly_dev') → 'pro_monthly'
 * normalizeProductId('pro_yearly_prod') → 'pro_yearly'
 * normalizeProductId('pro_monthly') → 'pro_monthly'
 */
function normalizeProductId(productId: string): string {
  return productId.replace(/_(dev|prod)$/, '');
}

/**
 * subscription 레코드가 없으면 기본값으로 생성하는 방어 로직
 * INITIAL_PURCHASE 이벤트가 누락된 경우(인증 오류 등)를 대비
 */
async function ensureSubscriptionExists(supabase: any, event: any) {
  const userId = event.app_user_id;

  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    console.log(`Subscription record missing for user ${userId}, creating from ${event.type} event`);
    const platform = mapStoreToPlatform(event.store);
    await supabase.from('subscriptions').insert({
      user_id: userId,
      status: 'active',
      platform,
      product_id: event.product_id,
      revenue_cat_subscriber_id: userId,
      revenue_cat_original_transaction_id: event.original_transaction_id,
      subscription_start_date: new Date(event.purchased_at_ms),
      subscription_end_date: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    });
  }
}

/**
 * 첫 구매 처리 (체험 → 유료 전환 또는 바로 구매)
 */
async function handleInitialPurchase(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const purchasedAt = new Date(event.purchased_at_ms);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const platform = mapStoreToPlatform(event.store);

  // subscriptions 테이블에서 사용자 구독 조회
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = 결과 없음 (정상)
    throw fetchError;
  }

  const isTrial = event.period_type === 'TRIAL';
  const subscriptionData = {
    user_id: userId,
    status: isTrial ? 'trial' : 'active',
    platform,
    product_id: productId,
    revenue_cat_subscriber_id: userId,
    revenue_cat_original_transaction_id: event.original_transaction_id,
    original_purchase_date: purchasedAt,
    ...(isTrial
      ? {
          trial_start_date: purchasedAt,
          trial_end_date: expiresAt,
        }
      : {
          subscription_start_date: purchasedAt,
          subscription_end_date: expiresAt,
        }),
    auto_renew_enabled: true,
    updated_at: new Date(),
  };

  // 구독 정보 업데이트 또는 생성
  if (subscription) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId);
  } else {
    await supabase
      .from('subscriptions')
      .insert(subscriptionData);
  }

  // users 테이블 업데이트 (캐시)
  await supabase
    .from('users')
    .update({
      has_active_subscription: true,
      subscription_type: normalizeProductId(productId),
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: isTrial ? 'trial_started' : 'subscription_started',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Initial purchase processed for user ${userId}: ${productId} (${isTrial ? 'trial' : 'paid'})`);
}

/**
 * 구독 갱신 처리
 */
async function handleRenewal(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      subscription_end_date: expiresAt,
      auto_renew_enabled: true,
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블 업데이트
  await supabase
    .from('users')
    .update({
      has_active_subscription: true,
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'subscription_renewed',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Renewal processed for user ${userId}: ${productId}`);
}

/**
 * 구독 취소 처리 (즉시 비활성화하지 않고 만료일까지 유지)
 */
async function handleCancellation(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트 (상태는 active 유지, cancelled_at 기록)
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date(),
      subscription_end_date: expiresAt, // 만료일까지 유지
      auto_renew_enabled: false,
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블은 만료 시까지 active 유지
  // (만료 시 EXPIRATION 이벤트에서 비활성화)

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'subscription_cancelled',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Cancellation processed for user ${userId}: ${productId}`);
}

/**
 * 구독 만료 처리 (즉시 비활성화)
 */
async function handleExpiration(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트
  await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블 업데이트 (즉시 비활성화)
  await supabase
    .from('users')
    .update({
      has_active_subscription: false,
      subscription_type: 'free',
      subscription_expires_at: null,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: event.period_type === 'TRIAL' ? 'trial_expired' : 'subscription_expired',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Expiration processed for user ${userId}: ${productId}`);
}

/**
 * 상품 변경 처리 (월→년 등)
 */
async function handleProductChange(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트
  await supabase
    .from('subscriptions')
    .update({
      product_id: productId,
      subscription_end_date: expiresAt,
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블 업데이트
  await supabase
    .from('users')
    .update({
      subscription_type: normalizeProductId(productId),
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'product_changed',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Product change processed for user ${userId}: ${productId}`);
}

/**
 * 결제 문제 처리
 */
async function handleBillingIssue(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // 히스토리 기록만 (상태는 유지)
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'billing_issue',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Billing issue recorded for user ${userId}: ${productId}`);
}

/**
 * 환불 처리
 */
async function handleRefund(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트 (즉시 만료)
  await supabase
    .from('subscriptions')
    .update({
      status: 'expired',
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블 업데이트 (즉시 비활성화)
  await supabase
    .from('users')
    .update({
      has_active_subscription: false,
      subscription_type: 'free',
      subscription_expires_at: null,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'refund_issued',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Refund processed for user ${userId}: ${productId}`);
}

/**
 * 취소 철회 처리 (자동 갱신 재활성화)
 */
async function handleUncancellation(supabase: any, event: any) {
  const userId = event.app_user_id;
  const productId = event.product_id;
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const platform = mapStoreToPlatform(event.store);

  await ensureSubscriptionExists(supabase, event);

  // subscriptions 테이블 업데이트 (active로 복원, 취소 기록 제거)
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      cancelled_at: null,
      auto_renew_enabled: true,
      subscription_end_date: expiresAt,
      updated_at: new Date(),
    })
    .eq('user_id', userId);

  // users 테이블 업데이트
  await supabase
    .from('users')
    .update({
      has_active_subscription: true,
      subscription_type: normalizeProductId(productId),
      subscription_expires_at: expiresAt,
    })
    .eq('id', userId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: userId,
    event_type: 'subscription_reactivated',
    platform,
    product_id: productId,
    revenue_cat_event_id: event.id,
    revenue_cat_transaction_id: event.transaction_id,
    metadata: event,
  });

  console.log(`Uncancellation processed for user ${userId}: ${productId}`);
}

/**
 * 히스토리 기록 삽입
 */
async function insertSubscriptionHistory(supabase: any, data: any) {
  // subscription_id 조회
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', data.user_id)
    .single();

  await supabase
    .from('subscription_history')
    .insert({
      subscription_id: subscription?.id,
      user_id: data.user_id,
      event_type: data.event_type,
      event_timestamp: new Date(),
      platform: data.platform,
      product_id: data.product_id,
      revenue_cat_event_id: data.revenue_cat_event_id,
      revenue_cat_transaction_id: data.revenue_cat_transaction_id,
      metadata: data.metadata,
    });
}

/**
 * Revenue Cat store를 플랫폼으로 매핑
 */
function mapStoreToPlatform(store: string): 'ios' | 'android' | 'web' {
  switch (store) {
    case 'APP_STORE':
      return 'ios';
    case 'PLAY_STORE':
      return 'android';
    case 'STRIPE':
      return 'web';
    default:
      return 'web';
  }
}
