-- subscriptions 테이블에 auto_renew_enabled 컬럼 추가
-- 구독 자동 갱신 여부 (Revenue Cat will_renew 필드와 매핑)

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew_enabled BOOLEAN DEFAULT true;

-- 코멘트 추가
COMMENT ON COLUMN public.subscriptions.auto_renew_enabled IS '구독 자동 갱신 여부 (Revenue Cat will_renew)';
