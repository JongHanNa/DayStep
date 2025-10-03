-- 퀵메모 태그 시스템 추가
-- 사용자 정의 태그와 메모-태그 다대다 관계 구현

-- ==============================
-- 1. 메모 태그 테이블 생성
-- ==============================

CREATE TABLE IF NOT EXISTS memo_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT '#6B7280', -- 기본 회색
  icon VARCHAR(50) DEFAULT 'tag', -- 아이콘 키
  description TEXT,
  is_predefined BOOLEAN DEFAULT false, -- 시스템 미리 정의된 태그 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT memo_tags_name_user_unique UNIQUE(user_id, name),
  CONSTRAINT memo_tags_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  CONSTRAINT memo_tags_color_format CHECK (
    color ~ '^#[0-9A-Fa-f]{6}$' OR
    color IN ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray', 'slate', 'indigo', 'cyan', 'teal', 'emerald', 'lime', 'amber', 'rose')
  )
);

-- ==============================
-- 2. 메모-태그 연결 테이블 생성 (다대다 관계)
-- ==============================

CREATE TABLE IF NOT EXISTS memo_tag_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id UUID NOT NULL REFERENCES quick_memos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES memo_tags(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약 조건: 같은 메모-태그 조합은 한 번만
  CONSTRAINT memo_tag_links_unique UNIQUE(memo_id, tag_id),

  -- 인덱스를 위한 복합 제약 조건
  CONSTRAINT memo_tag_links_user_memo UNIQUE(user_id, memo_id, tag_id)
);

-- ==============================
-- 3. 인덱스 생성 (성능 최적화)
-- ==============================

-- 메모 태그 인덱스
CREATE INDEX IF NOT EXISTS idx_memo_tags_user_id ON memo_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_memo_tags_name ON memo_tags(name);
CREATE INDEX IF NOT EXISTS idx_memo_tags_color ON memo_tags(color);
CREATE INDEX IF NOT EXISTS idx_memo_tags_predefined ON memo_tags(is_predefined);

-- 메모-태그 연결 인덱스
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_memo_id ON memo_tag_links(memo_id);
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_tag_id ON memo_tag_links(tag_id);
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_user_id ON memo_tag_links(user_id);
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_created_at ON memo_tag_links(created_at);

-- 복합 인덱스 (빠른 태그별 메모 조회)
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_tag_user ON memo_tag_links(tag_id, user_id);
CREATE INDEX IF NOT EXISTS idx_memo_tag_links_memo_user ON memo_tag_links(memo_id, user_id);

-- ==============================
-- 4. RLS (Row Level Security) 정책 설정
-- ==============================

-- memo_tags 테이블 RLS 활성화
ALTER TABLE memo_tags ENABLE ROW LEVEL SECURITY;

-- memo_tags 조회 정책 (자신의 태그만 조회 가능)
CREATE POLICY "Users can view their own memo tags" ON memo_tags
  FOR SELECT USING (auth.uid() = user_id);

-- memo_tags 생성 정책 (자신의 태그만 생성 가능)
CREATE POLICY "Users can create their own memo tags" ON memo_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- memo_tags 업데이트 정책 (자신의 태그만 수정 가능, 미리 정의된 태그는 수정 불가)
CREATE POLICY "Users can update their own memo tags" ON memo_tags
  FOR UPDATE USING (auth.uid() = user_id AND is_predefined = false);

-- memo_tags 삭제 정책 (자신의 태그만 삭제 가능, 미리 정의된 태그는 삭제 불가)
CREATE POLICY "Users can delete their own memo tags" ON memo_tags
  FOR DELETE USING (auth.uid() = user_id AND is_predefined = false);

-- memo_tag_links 테이블 RLS 활성화
ALTER TABLE memo_tag_links ENABLE ROW LEVEL SECURITY;

-- memo_tag_links 조회 정책 (자신의 연결만 조회 가능)
CREATE POLICY "Users can view their own memo tag links" ON memo_tag_links
  FOR SELECT USING (auth.uid() = user_id);

-- memo_tag_links 생성 정책 (자신의 연결만 생성 가능)
CREATE POLICY "Users can create their own memo tag links" ON memo_tag_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- memo_tag_links 삭제 정책 (자신의 연결만 삭제 가능)
CREATE POLICY "Users can delete their own memo tag links" ON memo_tag_links
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================
-- 5. 트리거 설정 (자동 updated_at 갱신)
-- ==============================

-- updated_at 자동 갱신 함수 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- memo_tags 테이블에 updated_at 트리거 설정
CREATE TRIGGER update_memo_tags_updated_at
  BEFORE UPDATE ON memo_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================
-- 6. 기본 미리 정의된 태그 삽입 (옵션)
-- ==============================

-- 미리 정의된 시스템 태그들 (모든 사용자가 사용 가능)
-- 실제 운영에서는 사용자별로 생성하거나 별도 시스템 태그 테이블을 만들 수도 있음

-- 주석: 현재는 사용자별 태그 시스템으로 구현하여 미리 정의된 태그는 삽입하지 않음
-- 추후 필요시 system_memo_tags 테이블을 별도로 만들어 전역 태그 관리 가능

-- ==============================
-- 7. 코멘트 추가
-- ==============================

COMMENT ON TABLE memo_tags IS '퀵메모 태그 - 사용자별 카테고리 관리';
COMMENT ON COLUMN memo_tags.name IS '태그 이름 (사용자당 고유)';
COMMENT ON COLUMN memo_tags.color IS 'CSS 색상 값 또는 색상 이름';
COMMENT ON COLUMN memo_tags.icon IS '태그 아이콘 키 (lucide 아이콘 등)';
COMMENT ON COLUMN memo_tags.is_predefined IS '시스템 미리 정의 태그 여부 (수정/삭제 불가)';

COMMENT ON TABLE memo_tag_links IS '메모-태그 연결 테이블 - 다대다 관계';
COMMENT ON COLUMN memo_tag_links.memo_id IS '연결된 퀵메모 ID';
COMMENT ON COLUMN memo_tag_links.tag_id IS '연결된 태그 ID';

-- ==============================
-- 8. 데이터 검증 함수 (옵션)
-- ==============================

-- 태그 이름 중복 검사 함수
CREATE OR REPLACE FUNCTION check_memo_tag_name_duplicate(
  p_user_id UUID,
  p_name VARCHAR(50),
  p_tag_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM memo_tags
  WHERE user_id = p_user_id
    AND name = p_name
    AND (p_tag_id IS NULL OR id != p_tag_id);

  RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 메모당 최대 태그 수 제한 검사 함수
CREATE OR REPLACE FUNCTION check_memo_tag_limit(
  p_memo_id UUID,
  p_max_tags INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM memo_tag_links
  WHERE memo_id = p_memo_id;

  RETURN current_count < p_max_tags;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- 9. 유용한 뷰 생성 (옵션)
-- ==============================

-- 메모별 태그 정보를 포함한 뷰
CREATE OR REPLACE VIEW memo_with_tags AS
SELECT
  m.id as memo_id,
  m.user_id,
  m.content,
  m.is_pinned,
  m.is_floating,
  m.position,
  m.related_task_id,
  m.linked_date,
  m.linked_timeline_task_id,
  m.is_recurring,
  m.recurrence_type,
  m.created_at as memo_created_at,
  m.updated_at as memo_updated_at,
  COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', t.id,
        'name', t.name,
        'color', t.color,
        'icon', t.icon,
        'description', t.description
      ) ORDER BY t.name
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) as tags
FROM quick_memos m
LEFT JOIN memo_tag_links mtl ON m.id = mtl.memo_id
LEFT JOIN memo_tags t ON mtl.tag_id = t.id
GROUP BY m.id, m.user_id, m.content, m.is_pinned, m.is_floating, m.position,
         m.related_task_id, m.linked_date, m.linked_timeline_task_id,
         m.is_recurring, m.recurrence_type, m.created_at, m.updated_at;

-- 태그별 메모 수 통계 뷰
CREATE OR REPLACE VIEW memo_tag_stats AS
SELECT
  t.id as tag_id,
  t.user_id,
  t.name as tag_name,
  t.color,
  t.icon,
  COUNT(mtl.memo_id) as memo_count,
  t.created_at,
  t.updated_at
FROM memo_tags t
LEFT JOIN memo_tag_links mtl ON t.id = mtl.tag_id
GROUP BY t.id, t.user_id, t.name, t.color, t.icon, t.created_at, t.updated_at
ORDER BY memo_count DESC, t.name;

COMMENT ON VIEW memo_with_tags IS '메모와 연결된 태그들을 JSON 배열로 포함한 뷰';
COMMENT ON VIEW memo_tag_stats IS '태그별 연결된 메모 수 통계 뷰';