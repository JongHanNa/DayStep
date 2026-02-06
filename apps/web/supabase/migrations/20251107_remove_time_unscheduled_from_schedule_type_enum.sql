-- schedule_type_enum에서 'time_unscheduled' 값 제거
-- time_unscheduled를 사용하는 데이터가 없음을 확인함 (0건)

-- 1. 새로운 enum 타입 생성 (time_unscheduled 제외)
CREATE TYPE schedule_type_enum_new AS ENUM (
    'all_day',
    'timed',
    'anytime',
    'none'
);

-- 2. 기존 default 제거
ALTER TABLE todos
    ALTER COLUMN schedule_type DROP DEFAULT;

-- 3. todos 테이블 컬럼 타입 변경
ALTER TABLE todos
    ALTER COLUMN schedule_type TYPE schedule_type_enum_new
    USING schedule_type::text::schedule_type_enum_new;

-- 4. default 값 다시 설정
ALTER TABLE todos
    ALTER COLUMN schedule_type SET DEFAULT 'none'::schedule_type_enum_new;

-- 5. 기존 enum 타입 삭제
DROP TYPE schedule_type_enum;

-- 6. 새 타입을 원래 이름으로 변경
ALTER TYPE schedule_type_enum_new RENAME TO schedule_type_enum;

-- 코멘트 추가
COMMENT ON TYPE schedule_type_enum IS 'Schedule type for todos: all_day (종일), timed (시간 지정), anytime (언제든지), none (일정 없음)';
