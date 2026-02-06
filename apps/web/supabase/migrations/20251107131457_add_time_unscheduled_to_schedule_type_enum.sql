-- schedule_type_enum에 'time_unscheduled' 값 추가
-- 날짜는 지정되었으나 구체적인 시간은 추후 계획할 할일

ALTER TYPE schedule_type_enum ADD VALUE IF NOT EXISTS 'time_unscheduled';
