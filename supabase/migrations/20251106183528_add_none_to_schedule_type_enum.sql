-- schedule_type_enum에 'none' (선택안함) 값 추가
-- 기존 데이터에 영향 없음, 새로운 선택지 추가만

ALTER TYPE schedule_type_enum ADD VALUE IF NOT EXISTS 'none';
