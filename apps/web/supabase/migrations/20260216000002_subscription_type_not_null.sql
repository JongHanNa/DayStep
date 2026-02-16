-- 기존 null 값을 'free'로 정리
UPDATE public.users SET subscription_type = 'free' WHERE subscription_type IS NULL;

-- NOT NULL 제약 추가
ALTER TABLE public.users ALTER COLUMN subscription_type SET NOT NULL;
