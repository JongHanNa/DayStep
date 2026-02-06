-- 구독 정보 테이블 생성
-- 사용자의 구독 상태, Revenue Cat 정보, 유료화 오픈일 기준 기존 사용자 처리 등을 관리

-- 구독 상태 ENUM
DO $$ BEGIN
  CREATE TYPE subscription_status_enum AS ENUM (
    'trial',      -- 무료 체험 중
    'active',     -- 활성 구독
    'cancelled',  -- 취소됨 (기간 만료까지 유지)
    'expired',    -- 만료됨
    'paused'      -- 일시 정지
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 플랫폼 ENUM
DO $$ BEGIN
  CREATE TYPE platform_enum AS ENUM (
    'ios',
    'android',
    'web'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- subscriptions 테이블
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 구독 상태
  status subscription_status_enum NOT NULL DEFAULT 'trial',

  -- 플랫폼 정보
  platform platform_enum NOT NULL DEFAULT 'web',
  product_id TEXT NOT NULL, -- 'pro_monthly' | 'pro_yearly' | 'legacy_trial'

  -- Revenue Cat 정보
  revenue_cat_subscriber_id TEXT,
  revenue_cat_original_transaction_id TEXT,

  -- 날짜 정보
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- 영수증 정보 (선택 사항)
  original_purchase_date TIMESTAMPTZ,
  latest_receipt_data TEXT,

  -- 유료화 오픈일 기준 기존 사용자 처리
  is_legacy_user BOOLEAN DEFAULT false,
  legacy_grace_period_end TIMESTAMPTZ,

  -- 프로모션 정보
  promo_code TEXT,
  promo_discount_percentage INTEGER CHECK (promo_discount_percentage >= 0 AND promo_discount_percentage <= 100),
  promo_duration_months INTEGER,

  -- 메타데이터
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 제약 조건
  CONSTRAINT unique_user_subscription UNIQUE (user_id),
  CONSTRAINT valid_trial_dates CHECK (trial_end_date IS NULL OR trial_start_date IS NULL OR trial_end_date >= trial_start_date),
  CONSTRAINT valid_subscription_dates CHECK (subscription_end_date IS NULL OR subscription_start_date IS NULL OR subscription_end_date >= subscription_start_date)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenue_cat_id ON public.subscriptions(revenue_cat_subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_platform ON public.subscriptions(platform);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_date ON public.subscriptions(trial_end_date) WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscription_end_date ON public.subscriptions(subscription_end_date) WHERE status = 'active';

-- RLS (Row Level Security) 활성화
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 구독만 조회 가능
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: Service Role만 구독 정보 수정 가능 (Webhook용)
DROP POLICY IF EXISTS "Only service role can modify subscriptions" ON public.subscriptions;
CREATE POLICY "Only service role can modify subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at 자동 갱신 트리거 함수 (존재하지 않으면 생성)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거 추가
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 코멘트 추가
COMMENT ON TABLE public.subscriptions IS '사용자 구독 정보 관리 테이블 (Revenue Cat 통합)';
COMMENT ON COLUMN public.subscriptions.status IS '구독 상태: trial(체험), active(활성), cancelled(취소), expired(만료), paused(일시정지)';
COMMENT ON COLUMN public.subscriptions.platform IS '구독 플랫폼: ios, android, web';
COMMENT ON COLUMN public.subscriptions.product_id IS 'Revenue Cat 상품 ID: pro_monthly, pro_yearly, legacy_trial';
COMMENT ON COLUMN public.subscriptions.revenue_cat_subscriber_id IS 'Revenue Cat 구독자 고유 ID (앱 사용자 ID)';
COMMENT ON COLUMN public.subscriptions.revenue_cat_original_transaction_id IS 'Revenue Cat 원본 거래 ID';
COMMENT ON COLUMN public.subscriptions.is_legacy_user IS '유료화 오픈 이전 가입한 기존 사용자 여부';
COMMENT ON COLUMN public.subscriptions.legacy_grace_period_end IS '기존 사용자 유예 기간 종료일';
COMMENT ON COLUMN public.subscriptions.promo_code IS '적용된 프로모션 코드';
COMMENT ON COLUMN public.subscriptions.metadata IS '추가 메타데이터 (JSON 형식)';
