-- users 테이블에 구독 관련 컬럼 추가
-- 빠른 구독 상태 확인을 위한 캐시 컬럼 (subscriptions 테이블과 동기화)

-- subscription_type ENUM
DO $$ BEGIN
  CREATE TYPE subscription_type_enum AS ENUM (
    'free',         -- 무료 (구독 없음)
    'trial',        -- 무료 체험 중
    'pro_monthly',  -- Pro 월간 구독
    'pro_yearly'    -- Pro 연간 구독
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- users 테이블에 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_active_subscription BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_type subscription_type_enum DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- 인덱스 생성 (구독 상태 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_users_has_active_subscription ON public.users(has_active_subscription);
CREATE INDEX IF NOT EXISTS idx_users_subscription_type ON public.users(subscription_type);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON public.users(subscription_expires_at)
  WHERE has_active_subscription = true;

-- 코멘트 추가
COMMENT ON COLUMN public.users.has_active_subscription IS '활성 구독 여부 (캐시, subscriptions 테이블과 동기화)';
COMMENT ON COLUMN public.users.subscription_type IS '구독 타입: free, trial, pro_monthly, pro_yearly';
COMMENT ON COLUMN public.users.subscription_expires_at IS '구독 만료 시각 (trial 또는 active 구독 종료일)';
