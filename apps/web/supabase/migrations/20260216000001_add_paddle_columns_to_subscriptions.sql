-- Paddle 결제 연동을 위한 컬럼 추가
-- paddle_subscription_id, paddle_price_id를 subscriptions 테이블에 추가
-- payment_completed 이벤트 타입을 subscription_event_type_enum에 추가

-- 1. subscriptions 테이블에 Paddle 전용 컬럼 추가
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id TEXT;

-- Paddle 구독 ID 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription_id
  ON public.subscriptions(paddle_subscription_id);

-- 2. subscription_event_type_enum에 payment_completed 추가
ALTER TYPE subscription_event_type_enum ADD VALUE IF NOT EXISTS 'payment_completed';

-- 코멘트 추가
COMMENT ON COLUMN public.subscriptions.paddle_subscription_id IS 'Paddle 구독 고유 ID (웹 결제용)';
COMMENT ON COLUMN public.subscriptions.paddle_price_id IS 'Paddle 가격 ID (월간/연간 구분)';
