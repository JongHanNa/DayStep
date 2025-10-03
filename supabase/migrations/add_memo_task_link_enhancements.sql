-- 퀵메모-할일 연결 기능 개선을 위한 스키마 확장
-- 반복 할일의 특정 날짜 인스턴스 연결 지원

-- quick_memos 테이블에 추가 컬럼 생성
ALTER TABLE quick_memos 
ADD COLUMN IF NOT EXISTS linked_date DATE,
ADD COLUMN IF NOT EXISTS linked_timeline_task_id UUID REFERENCES timeline_tasks(id) ON DELETE SET NULL;

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_quick_memos_linked_date ON quick_memos(linked_date);
CREATE INDEX IF NOT EXISTS idx_quick_memos_linked_timeline_task_id ON quick_memos(linked_timeline_task_id);
CREATE INDEX IF NOT EXISTS idx_quick_memos_user_linked_date ON quick_memos(user_id, linked_date);

-- 기존 데이터와의 호환성을 위한 체크 제약 조건
ALTER TABLE quick_memos 
ADD CONSTRAINT quick_memos_link_consistency CHECK (
  -- 할일 연결 시 적어도 하나는 있어야 함
  (related_task_id IS NULL AND linked_timeline_task_id IS NULL AND linked_date IS NULL) OR
  (related_task_id IS NOT NULL OR linked_timeline_task_id IS NOT NULL)
);

-- 코멘트 추가
COMMENT ON COLUMN quick_memos.linked_date IS '반복 할일의 특정 날짜 인스턴스 연결을 위한 날짜';
COMMENT ON COLUMN quick_memos.linked_timeline_task_id IS '타임라인 작업과의 직접 연결 (반복 할일의 특정 인스턴스)';