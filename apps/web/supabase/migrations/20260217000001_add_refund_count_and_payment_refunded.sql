-- users 테이블에 refund_count 추가 (환불 횟수 추적)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refund_count integer NOT NULL DEFAULT 0;

-- subscription_event_type_enum에 payment_refunded 추가
-- (기존에 refund_issued만 있었고, 웹훅에서 payment_refunded를 사용하여 INSERT 실패하던 버그 수정)
ALTER TYPE subscription_event_type_enum ADD VALUE IF NOT EXISTS 'payment_refunded';
