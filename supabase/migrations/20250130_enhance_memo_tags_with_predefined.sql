-- Enhanced Memo Tag System with Predefined Tags
-- Implementing dual-table approach similar to motivation message system

-- ==============================
-- 1. Create Memo Tag Templates Table (Predefined Tags)
-- ==============================

CREATE TABLE IF NOT EXISTS memo_tag_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20) NOT NULL,
  icon VARCHAR(50) DEFAULT 'tag',
  description TEXT,
  category VARCHAR(30) NOT NULL DEFAULT 'general', -- 'productivity', 'personal', 'priority', 'type'
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약 조건
  CONSTRAINT memo_tag_templates_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  CONSTRAINT memo_tag_templates_category_valid CHECK (
    category IN ('productivity', 'personal', 'priority', 'type', 'general')
  ),
  CONSTRAINT memo_tag_templates_color_format CHECK (
    color ~ '^#[0-9A-Fa-f]{6}$' OR
    color IN ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray', 'slate', 'indigo', 'cyan', 'teal', 'emerald', 'lime', 'amber', 'rose')
  )
);

-- ==============================
-- 2. Enhance Existing memo_tags Table
-- ==============================

-- Add template relationship and system derivation fields
ALTER TABLE memo_tags ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES memo_tag_templates(id) ON DELETE SET NULL;
ALTER TABLE memo_tags ADD COLUMN IF NOT EXISTS is_system_derived BOOLEAN DEFAULT false;
ALTER TABLE memo_tags ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'tag';

-- Update existing is_predefined column usage for clarity
COMMENT ON COLUMN memo_tags.is_predefined IS '사용자가 생성했지만 템플릿 기반인 태그 (수정 가능하지만 특별 표시)';
COMMENT ON COLUMN memo_tags.template_id IS '기반이 된 시스템 템플릿 ID (있는 경우)';
COMMENT ON COLUMN memo_tags.is_system_derived IS '시스템 템플릿에서 파생된 태그 여부';

-- ==============================
-- 3. Create Indexes for Performance
-- ==============================

-- memo_tag_templates 인덱스
CREATE INDEX IF NOT EXISTS idx_memo_tag_templates_category ON memo_tag_templates(category);
CREATE INDEX IF NOT EXISTS idx_memo_tag_templates_active ON memo_tag_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_memo_tag_templates_sort_order ON memo_tag_templates(category, sort_order);
CREATE INDEX IF NOT EXISTS idx_memo_tag_templates_name ON memo_tag_templates(name);

-- memo_tags 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_memo_tags_template_id ON memo_tags(template_id);
CREATE INDEX IF NOT EXISTS idx_memo_tags_system_derived ON memo_tags(is_system_derived);

-- ==============================
-- 4. memo_tag_templates에는 RLS 적용하지 않음 (전역 접근)
-- ==============================

-- memo_tag_templates는 모든 사용자가 읽을 수 있도록 RLS 비활성화
-- (motivation_templates와 동일한 패턴)

-- ==============================
-- 5. Update memo_tags RLS Policies
-- ==============================

-- 기존 RLS 정책은 유지하되, 템플릿 기반 태그 생성을 위한 정책 추가
-- 사용자는 템플릿을 기반으로 자신만의 태그를 생성할 수 있음

-- ==============================
-- 6. Insert Default Predefined Tags
-- ==============================

-- 생산성 관련 태그
INSERT INTO memo_tag_templates (name, color, icon, description, category, sort_order) VALUES
  ('업무', '#3B82F6', 'briefcase', '업무 관련 메모', 'productivity', 1),
  ('공부', '#8B5CF6', 'book-open', '학습 및 공부 관련', 'productivity', 2),
  ('프로젝트', '#06B6D4', 'folder', '프로젝트 관련 메모', 'productivity', 3),
  ('미팅', '#10B981', 'users', '회의 및 미팅 관련', 'productivity', 4),
  ('아이디어', '#F59E0B', 'lightbulb', '떠오른 아이디어 기록', 'productivity', 5)
ON CONFLICT (name) DO NOTHING;

-- 개인 관련 태그
INSERT INTO memo_tag_templates (name, color, icon, description, category, sort_order) VALUES
  ('개인', '#EC4899', 'user', '개인적인 메모', 'personal', 1),
  ('가족', '#F97316', 'heart', '가족 관련 메모', 'personal', 2),
  ('건강', '#84CC16', 'activity', '건강 관련 메모', 'personal', 3),
  ('취미', '#A855F7', 'music', '취미 활동 관련', 'personal', 4),
  ('여행', '#14B8A6', 'map-pin', '여행 계획 및 기록', 'personal', 5)
ON CONFLICT (name) DO NOTHING;

-- 우선순위 관련 태그
INSERT INTO memo_tag_templates (name, color, icon, description, category, sort_order) VALUES
  ('긴급', '#EF4444', 'alert-circle', '긴급한 사항', 'priority', 1),
  ('중요', '#F97316', 'star', '중요한 사항', 'priority', 2),
  ('나중에', '#6B7280', 'clock', '나중에 처리할 사항', 'priority', 3),
  ('완료', '#22C55E', 'check-circle', '완료된 사항', 'priority', 4)
ON CONFLICT (name) DO NOTHING;

-- 타입 관련 태그
INSERT INTO memo_tag_templates (name, color, icon, description, category, sort_order) VALUES
  ('할일', '#3B82F6', 'check-square', '해야 할 일', 'type', 1),
  ('메모', '#6B7280', 'sticky-note', '단순 메모', 'type', 2),
  ('링크', '#8B5CF6', 'link', '링크 및 참조', 'type', 3),
  ('목표', '#F59E0B', 'target', '목표 및 계획', 'type', 4)
ON CONFLICT (name) DO NOTHING;

-- ==============================
-- 7. Create Useful Views
-- ==============================

-- 활성 템플릿 태그 뷰 (카테고리별 정렬)
CREATE OR REPLACE VIEW active_memo_tag_templates AS
SELECT
  id,
  name,
  color,
  icon,
  description,
  category,
  sort_order,
  created_at
FROM memo_tag_templates
WHERE is_active = true
ORDER BY category, sort_order, name;

-- 사용자별 전체 태그 뷰 (템플릿 + 사용자 커스텀)
CREATE OR REPLACE VIEW user_memo_tags_with_templates AS
SELECT
  'user' as tag_source,
  mt.id,
  mt.user_id,
  mt.name,
  mt.color,
  mt.icon,
  mt.description,
  COALESCE(mtt.category, 'custom') as category,
  mt.is_predefined,
  mt.is_system_derived,
  mt.template_id,
  mtt.name as template_name,
  mt.created_at,
  mt.updated_at
FROM memo_tags mt
LEFT JOIN memo_tag_templates mtt ON mt.template_id = mtt.id

UNION ALL

SELECT
  'template' as tag_source,
  mtt.id,
  NULL as user_id, -- 템플릿은 특정 사용자에 속하지 않음
  mtt.name,
  mtt.color,
  mtt.icon,
  mtt.description,
  mtt.category,
  false as is_predefined,
  false as is_system_derived,
  NULL as template_id,
  NULL as template_name,
  mtt.created_at,
  NULL as updated_at
FROM memo_tag_templates mtt
WHERE mtt.is_active = true;

-- ==============================
-- 8. Helper Functions
-- ==============================

-- 사용자가 템플릿에서 태그를 생성하는 함수
CREATE OR REPLACE FUNCTION create_tag_from_template(
  p_user_id UUID,
  p_template_id UUID,
  p_custom_name VARCHAR(50) DEFAULT NULL,
  p_custom_color VARCHAR(20) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  template_rec memo_tag_templates%ROWTYPE;
  new_tag_id UUID;
  final_name VARCHAR(50);
  final_color VARCHAR(20);
BEGIN
  -- 템플릿 정보 조회
  SELECT * INTO template_rec FROM memo_tag_templates WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive: %', p_template_id;
  END IF;

  -- 사용자 커스터마이징 적용
  final_name := COALESCE(p_custom_name, template_rec.name);
  final_color := COALESCE(p_custom_color, template_rec.color);

  -- 사용자별 이름 중복 체크
  IF EXISTS (SELECT 1 FROM memo_tags WHERE user_id = p_user_id AND name = final_name) THEN
    RAISE EXCEPTION 'Tag name already exists for user: %', final_name;
  END IF;

  -- 새 태그 생성
  INSERT INTO memo_tags (
    user_id, name, color, icon, description,
    template_id, is_system_derived, is_predefined
  ) VALUES (
    p_user_id, final_name, final_color, template_rec.icon, template_rec.description,
    p_template_id, true, true
  ) RETURNING id INTO new_tag_id;

  RETURN new_tag_id;
END;
$$ LANGUAGE plpgsql;

-- 사용자의 기본 태그 세트 생성 함수 (신규 사용자용)
CREATE OR REPLACE FUNCTION create_default_tags_for_user(p_user_id UUID) RETURNS INTEGER AS $$
DECLARE
  template_rec RECORD;
  created_count INTEGER := 0;
BEGIN
  -- 카테고리별로 기본 태그 몇 개씩 자동 생성
  FOR template_rec IN
    SELECT * FROM memo_tag_templates
    WHERE is_active = true
    AND category IN ('productivity', 'personal', 'priority')
    AND sort_order <= 3 -- 각 카테고리당 상위 3개만
    ORDER BY category, sort_order
  LOOP
    BEGIN
      PERFORM create_tag_from_template(p_user_id, template_rec.id);
      created_count := created_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- 이미 존재하는 태그는 무시하고 계속 진행
      CONTINUE;
    END;
  END LOOP;

  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- 9. Comments
-- ==============================

COMMENT ON TABLE memo_tag_templates IS '메모 태그 템플릿 - 모든 사용자가 사용할 수 있는 미리 정의된 태그';
COMMENT ON COLUMN memo_tag_templates.category IS '태그 카테고리: productivity, personal, priority, type, general';
COMMENT ON COLUMN memo_tag_templates.sort_order IS '카테고리 내 정렬 순서';

COMMENT ON VIEW active_memo_tag_templates IS '활성 상태인 태그 템플릿 목록 (카테고리별 정렬)';
COMMENT ON VIEW user_memo_tags_with_templates IS '사용자별 전체 태그 (사용자 태그 + 템플릿) 통합 뷰';

COMMENT ON FUNCTION create_tag_from_template IS '템플릿을 기반으로 사용자 태그 생성';
COMMENT ON FUNCTION create_default_tags_for_user IS '신규 사용자를 위한 기본 태그 세트 자동 생성';