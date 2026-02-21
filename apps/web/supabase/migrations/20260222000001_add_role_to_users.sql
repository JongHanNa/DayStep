-- user_role_enum 생성: 'user' (기본) | 'admin'
CREATE TYPE user_role_enum AS ENUM ('user', 'admin');

-- users 테이블에 role 컬럼 추가
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role user_role_enum DEFAULT 'user' NOT NULL;

-- 기존 관리자 설정 (필요 시 아래 주석 해제 후 UUID 교체)
-- UPDATE public.users SET role = 'admin' WHERE id = '관리자UUID';
