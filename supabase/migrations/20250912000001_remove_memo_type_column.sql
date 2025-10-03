-- 퀵메모 테이블에서 memo_type 컬럼 제거
-- 모든 메모가 'quick' 타입으로 통일되어 더 이상 타입 구분이 불필요함

-- memo_type 컬럼 제거
ALTER TABLE quick_memos 
DROP COLUMN IF EXISTS memo_type;

-- 코멘트 업데이트
COMMENT ON TABLE quick_memos IS '사용자 퀵메모 - 모든 메모가 퀵메모 타입으로 통일됨';