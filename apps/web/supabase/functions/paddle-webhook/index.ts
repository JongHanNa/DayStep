import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { createHmac } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

/**
 * Paddle Webhook Handler
 *
 * Paddle 결제 이벤트를 받아 RevenueCat API로 전달하고 Supabase에 동기화
 *
 * 지원 이벤트:
 * - subscription.created: 구독 생성
 * - subscription.activated: 구독 활성화
 * - subscription.updated: 구독 업데이트
 * - subscription.canceled: 구독 취소
 * - subscription.paused: 구독 일시정지
 * - subscription.resumed: 구독 재개
 * - transaction.completed: 거래 완료
 * - transaction.refunded: 환불 처리
 */

interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  notification_id: string;
  data: {
    id: string; // subscription_id or transaction_id
    status: string;
    customer_id: string;
    currency_code: string;
    billing_cycle?: {
      interval: string;
      frequency: number;
    };
    current_billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    scheduled_change?: any;
    items: Array<{
      price: {
        id: string;
        product_id: string;
      };
      quantity: number;
    }>;
    custom_data?: {
      app_user_id?: string;
    };
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paddle-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Paddle Webhook 서명 검증
 */
async function verifyPaddleSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string
): Promise<boolean> {
  if (!signature || !webhookSecret) {
    console.warn('Missing signature or webhook secret');
    return false;
  }

  try {
    // Paddle 서명 형식: ts=timestamp;h1=hash
    const parts = signature.split(';');
    const tsMatch = parts.find(p => p.startsWith('ts='));
    const h1Match = parts.find(p => p.startsWith('h1='));

    if (!tsMatch || !h1Match) {
      console.warn('Invalid signature format');
      return false;
    }

    const timestamp = tsMatch.replace('ts=', '');
    const hash = h1Match.replace('h1=', '');

    // 서명 생성: timestamp:rawBody
    const signedPayload = `${timestamp}:${rawBody}`;

    const encoder = new TextEncoder();
    const key = encoder.encode(webhookSecret);
    const data = encoder.encode(signedPayload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hash === expectedHash;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 환경 변수 확인
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paddleWebhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
    const revenueCatPaddleApiKey = Deno.env.get('REVENUECAT_PADDLE_API_KEY');

    // Raw body 읽기 (서명 검증용)
    const rawBody = await req.text();

    // Webhook 서명 검증 (프로덕션에서 권장)
    const paddleSignature = req.headers.get('Paddle-Signature');
    if (paddleWebhookSecret) {
      const isValid = await verifyPaddleSignature(rawBody, paddleSignature, paddleWebhookSecret);
      if (!isValid) {
        console.error('Invalid Paddle webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Webhook 이벤트 파싱
    const webhookEvent: PaddleWebhookEvent = JSON.parse(rawBody);
    const { event_type, data } = webhookEvent;

    console.log(`Received Paddle event: ${event_type} for subscription/transaction ${data.id}`);

    // custom_data에서 app_user_id 추출
    const appUserId = data.custom_data?.app_user_id;

    if (!appUserId) {
      console.warn('No app_user_id in custom_data, skipping RevenueCat sync');
      return new Response(JSON.stringify({ success: true, warning: 'No app_user_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 이벤트 타입별 처리
    switch (event_type) {
      case 'subscription.created':
      case 'subscription.activated':
        await handleSubscriptionActivated(supabase, data, appUserId, revenueCatPaddleApiKey);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(supabase, data, appUserId, revenueCatPaddleApiKey);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(supabase, data, appUserId);
        break;

      case 'subscription.paused':
        await handleSubscriptionPaused(supabase, data, appUserId);
        break;

      case 'subscription.resumed':
        await handleSubscriptionResumed(supabase, data, appUserId, revenueCatPaddleApiKey);
        break;

      case 'transaction.completed':
        await handleTransactionCompleted(supabase, data, appUserId, revenueCatPaddleApiKey);
        break;

      case 'transaction.refunded':
        await handleTransactionRefunded(supabase, data, appUserId);
        break;

      default:
        console.log(`Unhandled event type: ${event_type}`);
    }

    return new Response(JSON.stringify({ success: true, event_type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * RevenueCat API에 Paddle subscription 토큰 전송
 */
async function sendToRevenueCat(
  subscriptionId: string,
  appUserId: string,
  apiKey: string | undefined
): Promise<boolean> {
  if (!apiKey) {
    console.warn('RevenueCat API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.revenuecat.com/v1/receipts', {
      method: 'POST',
      headers: {
        'X-Platform': 'paddle',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fetch_token: subscriptionId,
        app_user_id: appUserId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RevenueCat API error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`Successfully sent subscription ${subscriptionId} to RevenueCat for user ${appUserId}`);
    return true;
  } catch (error) {
    console.error('Error sending to RevenueCat:', error);
    return false;
  }
}

/**
 * 구독 활성화 처리
 */
async function handleSubscriptionActivated(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string,
  revenueCatApiKey: string | undefined
) {
  const subscriptionId = data.id;
  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const expiresAt = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : null;

  // RevenueCat에 토큰 전송
  await sendToRevenueCat(subscriptionId, appUserId, revenueCatApiKey);

  // Supabase subscriptions 테이블 업데이트
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', appUserId)
    .single();

  const normalizedProductId = normalizeProductId(productId, priceId);

  const subscriptionData = {
    user_id: appUserId,
    status: 'active',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
    paddle_price_id: priceId,
    subscription_start_date: new Date(),
    subscription_end_date: expiresAt,
    cancelled_at: null,
    updated_at: new Date(),
  };

  if (existingSubscription) {
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', appUserId);
  } else {
    await supabase.from('subscriptions').insert(subscriptionData);
  }

  // users 테이블 캐시 업데이트
  await supabase
    .from('users')
    .update({
      has_active_subscription: true,
      subscription_type: normalizedProductId,
      subscription_expires_at: expiresAt,
    })
    .eq('id', appUserId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'subscription_started',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
  });

  console.log(`Subscription activated for user ${appUserId}: ${subscriptionId}`);
}

/**
 * 구독 업데이트 처리
 */
async function handleSubscriptionUpdated(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string,
  revenueCatApiKey: string | undefined
) {
  const subscriptionId = data.id;
  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const expiresAt = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : null;

  // RevenueCat에 토큰 전송 (갱신)
  await sendToRevenueCat(subscriptionId, appUserId, revenueCatApiKey);

  const normalizedProductId = normalizeProductId(productId, priceId);

  // Supabase 업데이트
  const updateData: Record<string, any> = {
    status: data.status === 'active' ? 'active' : data.status,
    product_id: normalizedProductId,
    paddle_price_id: priceId,
    subscription_end_date: expiresAt,
    updated_at: new Date(),
  };

  // 취소 철회 시 cancelled_at 클리어 (active 상태 + scheduled_change 없음 = 취소 철회 완료)
  if (data.status === 'active' && !data.scheduled_change) {
    updateData.cancelled_at = null;
  }

  await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', appUserId);

  await supabase
    .from('users')
    .update({
      has_active_subscription: data.status === 'active',
      subscription_type: data.status === 'active' ? normalizedProductId : 'free',
      subscription_expires_at: expiresAt,
    })
    .eq('id', appUserId);

  // 히스토리 기록 — cancel/pause 등으로 인한 updated 이벤트 구분
  const historyEventType = data.status === 'active' ? 'subscription_renewed' : 'subscription_updated';
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: historyEventType,
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
  });

  console.log(`Subscription updated for user ${appUserId}: ${subscriptionId}`);
}

/**
 * 구독 취소 처리
 */
async function handleSubscriptionCanceled(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string
) {
  const subscriptionId = data.id;
  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const normalizedProductId = normalizeProductId(productId, priceId);
  const expiresAt = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : null;

  // 구독 상태 업데이트
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date(),
      subscription_end_date: expiresAt,
      updated_at: new Date(),
    })
    .eq('user_id', appUserId);

  // users 테이블 캐시 업데이트: 만료일이 지난 경우에만 비활성화
  const now = new Date();
  const isExpired = !expiresAt || expiresAt <= now;

  const userUpdate: Record<string, any> = {
    has_active_subscription: !isExpired,
  };
  if (isExpired) {
    userUpdate.subscription_type = 'free';
  }

  await supabase
    .from('users')
    .update(userUpdate)
    .eq('id', appUserId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'subscription_cancelled',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
  });

  console.log(`Subscription canceled for user ${appUserId}: ${subscriptionId}`);
}

/**
 * 구독 일시정지 처리
 */
async function handleSubscriptionPaused(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string
) {
  const subscriptionId = data.id;
  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const normalizedProductId = normalizeProductId(productId, priceId);

  await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date(),
    })
    .eq('user_id', appUserId);

  await supabase
    .from('users')
    .update({
      has_active_subscription: false,
    })
    .eq('id', appUserId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'subscription_paused',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
  });

  console.log(`Subscription paused for user ${appUserId}: ${subscriptionId}`);
}

/**
 * 구독 재개 처리
 */
async function handleSubscriptionResumed(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string,
  revenueCatApiKey: string | undefined
) {
  const subscriptionId = data.id;
  const expiresAt = data.current_billing_period?.ends_at
    ? new Date(data.current_billing_period.ends_at)
    : null;

  // RevenueCat에 토큰 전송
  await sendToRevenueCat(subscriptionId, appUserId, revenueCatApiKey);

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      subscription_end_date: expiresAt,
      updated_at: new Date(),
    })
    .eq('user_id', appUserId);

  await supabase
    .from('users')
    .update({
      has_active_subscription: true,
      subscription_expires_at: expiresAt,
    })
    .eq('id', appUserId);

  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const normalizedProductId = normalizeProductId(productId, priceId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'subscription_resumed',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_subscription_id: subscriptionId,
  });

  console.log(`Subscription resumed for user ${appUserId}: ${subscriptionId}`);
}

/**
 * 거래 완료 처리 (일회성 결제 또는 구독 결제)
 */
async function handleTransactionCompleted(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string,
  revenueCatApiKey: string | undefined
) {
  const transactionId = data.id;

  // 구독 관련 거래인 경우 RevenueCat에 전송
  await sendToRevenueCat(transactionId, appUserId, revenueCatApiKey);

  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const normalizedProductId = normalizeProductId(productId, priceId);

  // 히스토리 기록
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'payment_completed',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_transaction_id: transactionId,
  });

  console.log(`Transaction completed for user ${appUserId}: ${transactionId}`);
}

/**
 * 환불 처리
 */
async function handleTransactionRefunded(
  supabase: any,
  data: PaddleWebhookEvent['data'],
  appUserId: string
) {
  const transactionId = data.id;
  const productId = data.items[0]?.price?.product_id || '';
  const priceId = data.items[0]?.price?.id || '';
  const normalizedProductId = normalizeProductId(productId, priceId);

  // 구독 상태를 cancelled로 변경
  await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date(),
    })
    .eq('user_id', appUserId);

  // users 테이블 캐시 업데이트 + refund_count 증가
  const { data: currentUser } = await supabase
    .from('users')
    .select('refund_count')
    .eq('id', appUserId)
    .single();

  await supabase
    .from('users')
    .update({
      has_active_subscription: false,
      subscription_type: 'free',
      refund_count: (currentUser?.refund_count ?? 0) + 1,
    })
    .eq('id', appUserId);

  // 히스토리 기록 (payment_refunded enum 값 사용)
  await insertSubscriptionHistory(supabase, {
    user_id: appUserId,
    event_type: 'payment_refunded',
    platform: 'web',
    product_id: normalizedProductId,
    paddle_transaction_id: transactionId,
  });

  console.log(`Transaction refunded for user ${appUserId}: ${transactionId} (refund_count: ${(currentUser?.refund_count ?? 0) + 1})`);
}

/**
 * Product/Price ID를 구독 타입으로 정규화
 */
function normalizeProductId(productId: string, priceId: string): string {
  // Price ID 기반으로 월간/연간 구분 (프로덕션 + 개발 환경 모두 지원)
  const MONTHLY_PRICE_IDS = [
    'pri_01kbgwtw6fdknst82vxc9sjg3s',  // production
    'pri_01khkk299azmxcvh3g518xemss',  // sandbox/development
  ];
  const YEARLY_PRICE_IDS = [
    'pri_01kbgx1kbjmtw96e0fkjg46j1r',  // production
    'pri_01khkjyjbww8j0dx4gwhbfyth8',  // sandbox/development
  ];

  if (priceId.includes('monthly') || MONTHLY_PRICE_IDS.includes(priceId)) {
    return 'pro_monthly';
  }
  if (priceId.includes('yearly') || YEARLY_PRICE_IDS.includes(priceId)) {
    return 'pro_yearly';
  }

  // 알 수 없는 Price ID — Paddle product_id 기반 폴백
  console.warn(`Unknown priceId: ${priceId}, productId: ${productId}. Falling back to productId-based detection.`);
  if (productId.includes('yearly') || productId.includes('annual')) {
    return 'pro_yearly';
  }
  return 'pro_monthly';
}

/**
 * 구독 히스토리 기록
 */
async function insertSubscriptionHistory(supabase: any, data: any) {
  try {
    // subscription_id 조회
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', data.user_id)
      .single();

    await supabase.from('subscription_history').insert({
      subscription_id: subscription?.id,
      user_id: data.user_id,
      event_type: data.event_type,
      event_timestamp: new Date(),
      platform: data.platform,
      product_id: data.product_id,
      metadata: {
        paddle_subscription_id: data.paddle_subscription_id,
        paddle_transaction_id: data.paddle_transaction_id,
      },
    });
  } catch (error) {
    console.error('Error inserting subscription history:', error);
  }
}
