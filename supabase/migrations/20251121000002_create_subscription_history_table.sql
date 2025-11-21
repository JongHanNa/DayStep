-- 구독 히스토리 테이블 생성
-- 모든 구독 이벤트를 감사 로그로 기록 (Revenue Cat Webhook 이벤트)

-- 구독 이벤트 타입 ENUM
DO $$ BEGIN
  CREATE TYPE subscription_event_type_enum AS ENUM (
    'trial_started',        -- 무료 체험 시작
    'trial_converted',      -- 체험 → 유료 전환
    'trial_expired',        -- 체험 만료
    'subscription_started', -- 구독 시작
    'subscription_renewed', -- 구독 갱신
    'subscription_cancelled', -- 구독 취소
    'subscription_expired', -- 구독 만료
    'subscription_paused',  -- 구독 일시 정지
    'subscription_resumed', -- 구독 재개
    'product_changed',      -- 상품 변경 (월→년 등)
    'refund_issued',        -- 환불 발행
    'billing_issue'         -- 결제 문제
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- subscription_history 테이블
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 이벤트 정보
  event_type subscription_event_type_enum NOT NULL,
  event_timestamp TIMESTAMPTZ DEFAULT now(),

  -- 플랫폼 & 상품 정보
  platform platform_enum NOT NULL,
  product_id TEXT NOT NULL,

  -- Revenue Cat 정보
  revenue_cat_event_id TEXT, -- Revenue Cat 이벤트 고유 ID
  revenue_cat_transaction_id TEXT,

  -- 메타데이터 (Revenue Cat Webhook 원본 데이터)
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON public.subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_type ON public.subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event_timestamp ON public.subscription_history(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_history_revenue_cat_event_id ON public.subscription_history(revenue_cat_event_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 히스토리만 조회 가능
DROP POLICY IF EXISTS "Users can view own history" ON public.subscription_history;
CREATE POLICY "Users can view own history"
  ON public.subscription_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS 정책: Service Role만 히스토리 작성 가능 (Webhook용)
DROP POLICY IF EXISTS "Only service role can insert history" ON public.subscription_history;
CREATE POLICY "Only service role can insert history"
  ON public.subscription_history
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 코멘트 추가
COMMENT ON TABLE public.subscription_history IS '구독 이벤트 감사 로그 (Revenue Cat Webhook 기록)';
COMMENT ON COLUMN public.subscription_history.event_type IS '이벤트 타입: trial_started, subscription_renewed, subscription_cancelled 등';
COMMENT ON COLUMN public.subscription_history.event_timestamp IS '이벤트 발생 시각 (Revenue Cat 기준)';
COMMENT ON COLUMN public.subscription_history.revenue_cat_event_id IS 'Revenue Cat 이벤트 고유 ID (중복 방지용)';
COMMENT ON COLUMN public.subscription_history.metadata IS 'Revenue Cat Webhook 원본 데이터 (JSON)';
