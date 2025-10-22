-- ===================================================
-- 퀵메모 태그 기능 테이블 추가
-- ===================================================

-- 1. 노트 태그 테이블 (태그 정의)
CREATE TABLE memo_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL, -- 태그 이름 (예: "업무", "개인", "중요")
  color VARCHAR(7) DEFAULT '#3B82F6' NOT NULL, -- 태그 색상 (hex 값)
  description TEXT, -- 태그 설명 (선택적)
  is_active BOOLEAN DEFAULT true NOT NULL, -- 활성화 상태
  position INTEGER DEFAULT 0 NOT NULL, -- 정렬 순서
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- 사용자별 태그명 중복 방지
  UNIQUE(user_id, name)
);

-- 2. 메모-태그 연결 테이블 (Many-to-Many)
CREATE TABLE note_tag_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memo_id UUID REFERENCES quick_memos(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES memo_tags(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,

  -- 메모-태그 중복 연결 방지
  UNIQUE(memo_id, tag_id)
);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_memo_tags_user_id ON memo_tags(user_id);
CREATE INDEX idx_memo_tags_position ON memo_tags(user_id, position);
CREATE INDEX idx_note_tag_links_memo_id ON note_tag_links(memo_id);
CREATE INDEX idx_note_tag_links_tag_id ON note_tag_links(tag_id);
CREATE INDEX idx_note_tag_links_user_id ON note_tag_links(user_id);

-- 4. RLS (Row Level Security) 정책 활성화
ALTER TABLE memo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tag_links ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성 - memo_tags
CREATE POLICY "memo_tags_select_own" ON memo_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "memo_tags_insert_own" ON memo_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "memo_tags_update_own" ON memo_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "memo_tags_delete_own" ON memo_tags
  FOR DELETE USING (auth.uid() = user_id);

-- 6. RLS 정책 생성 - note_tag_links
CREATE POLICY "note_tag_links_select_own" ON note_tag_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "note_tag_links_insert_own" ON note_tag_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "note_tag_links_update_own" ON note_tag_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "note_tag_links_delete_own" ON note_tag_links
  FOR DELETE USING (auth.uid() = user_id);

-- 7. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memo_tags_updated_at
  BEFORE UPDATE ON memo_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. 기본 태그 생성 함수 (사용자 등록 시 호출 가능)
CREATE OR REPLACE FUNCTION create_default_memo_tags(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO memo_tags (user_id, name, color, position) VALUES
    (user_uuid, '중요', '#EF4444', 0),
    (user_uuid, '업무', '#3B82F6', 1),
    (user_uuid, '개인', '#10B981', 2),
    (user_uuid, '아이디어', '#F59E0B', 3),
    (user_uuid, '나중에', '#6B7280', 4)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 9. 노트 삭제 시 태그 링크도 자동 삭제 (CASCADE로 이미 처리되지만 명시적 확인)
-- quick_memos 테이블의 ON DELETE CASCADE가 note_tag_links에도 적용됨

COMMENT ON TABLE memo_tags IS '퀵메모 태그 정의 테이블';
COMMENT ON TABLE note_tag_links IS '퀵메모와 태그의 Many-to-Many 연결 테이블';
COMMENT ON FUNCTION create_default_memo_tags IS '새 사용자를 위한 기본 태그 생성 함수';