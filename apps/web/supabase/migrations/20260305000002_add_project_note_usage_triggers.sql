-- ================================================================
-- 0. 컬럼 추가
-- ================================================================
ALTER TABLE user_usage_stats
  ADD COLUMN IF NOT EXISTS project_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note_count    integer NOT NULL DEFAULT 0;

-- ================================================================
-- 1. projects 트리거 함수
-- ================================================================
CREATE OR REPLACE FUNCTION update_usage_stats_on_project_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_usage_stats
    SET project_count = project_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET project_count = GREATEST(0, project_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. notes 트리거 함수 (원동력)
-- ================================================================
CREATE OR REPLACE FUNCTION update_usage_stats_on_note_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_usage_stats
    SET note_count = note_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET note_count = GREATEST(0, note_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. 트리거 등록
-- ================================================================
DROP TRIGGER IF EXISTS trigger_usage_stats_project ON projects;
CREATE TRIGGER trigger_usage_stats_project
AFTER INSERT OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_project_change();

DROP TRIGGER IF EXISTS trigger_usage_stats_note ON notes;
CREATE TRIGGER trigger_usage_stats_note
AFTER INSERT OR DELETE ON notes
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_note_change();

-- ================================================================
-- 4. 기존 카운트 재계산
-- ================================================================
UPDATE user_usage_stats u
SET
  project_count = (SELECT COUNT(*) FROM projects WHERE user_id = u.user_id),
  note_count    = (SELECT COUNT(*) FROM notes    WHERE user_id = u.user_id),
  updated_at    = now();
