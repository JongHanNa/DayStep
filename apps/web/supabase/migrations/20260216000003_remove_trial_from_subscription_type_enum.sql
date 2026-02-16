-- Remove 'trial' from subscription_type_enum
-- trial은 "상품 종류"가 아닌 "구독 상태"이므로 subscription_type_enum에서 제거
-- subscriptions.status = 'trial'은 그대로 유지

-- 1) 기존 trial 데이터를 free로 정리
UPDATE public.users SET subscription_type = 'free' WHERE subscription_type = 'trial';

-- 2) default 제거 (enum 의존성 해제)
ALTER TABLE public.users ALTER COLUMN subscription_type DROP DEFAULT;

-- 3) 컬럼을 text로 변경
ALTER TABLE public.users ALTER COLUMN subscription_type TYPE text;

-- 4) 기존 enum 삭제
DROP TYPE public.subscription_type_enum;

-- 5) trial 없는 새 enum 생성
CREATE TYPE public.subscription_type_enum AS ENUM ('free', 'pro_monthly', 'pro_yearly');

-- 6) 컬럼을 새 enum으로 변경
ALTER TABLE public.users ALTER COLUMN subscription_type TYPE public.subscription_type_enum
  USING subscription_type::public.subscription_type_enum;

-- 7) default 복원
ALTER TABLE public.users ALTER COLUMN subscription_type SET DEFAULT 'free'::public.subscription_type_enum;
