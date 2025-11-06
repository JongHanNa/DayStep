-- 노트-노트 N:N 관계를 위한 junction table 생성
-- 양방향 연결: A→B 연결 시 B에서도 A를 볼 수 있음

CREATE TABLE IF NOT EXISTS note_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),

  -- 순환 참조 방지: 자기 자신 연결 불가
  CONSTRAINT no_self_reference CHECK (source_note_id != target_note_id),

  -- 중복 방지: 동일한 연결이 중복 생성되지 않도록
  CONSTRAINT unique_note_connection UNIQUE (source_note_id, target_note_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_note_notes_source_note_id ON note_notes(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_notes_target_note_id ON note_notes(target_note_id);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE note_notes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 노트 연결만 조회 가능
CREATE POLICY "Users can view their own note connections"
  ON note_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_notes.source_note_id
      AND notes.user_id = auth.uid()
    )
  );

-- RLS 정책: 사용자는 자신의 노트 연결만 생성 가능
CREATE POLICY "Users can create their own note connections"
  ON note_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_notes.source_note_id
      AND notes.user_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_notes.target_note_id
      AND notes.user_id = auth.uid()
    )
  );

-- RLS 정책: 사용자는 자신의 노트 연결만 삭제 가능
CREATE POLICY "Users can delete their own note connections"
  ON note_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_notes.source_note_id
      AND notes.user_id = auth.uid()
    )
  );
