-- 할일 테이블에서 상세설명(description) 컬럼 제거
-- 상세설명 기능을 더 이상 사용하지 않으므로 컬럼을 안전하게 삭제

BEGIN;

-- 1. todos 테이블에서 description 컬럼 제거
ALTER TABLE public.todos DROP COLUMN IF EXISTS description;

-- 2. 변경사항 로그
INSERT INTO public.migration_logs (
  migration_name,
  description,
  executed_at
) VALUES (
  'remove_description_column',
  '할일 테이블에서 상세설명 컬럼 제거 - 더 이상 사용하지 않는 기능',
  NOW()
) ON CONFLICT (migration_name) DO NOTHING;

COMMIT;