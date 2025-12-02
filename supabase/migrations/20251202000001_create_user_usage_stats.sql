-- ================================================================
-- 사용자 용량 통계 테이블 및 트리거 생성
-- 용량 기반 구독 제한 시스템을 위한 실시간 카운트 추적
-- ================================================================

-- 1. user_usage_stats 테이블 생성
CREATE TABLE IF NOT EXISTS user_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 용량 카운트
  todo_count INTEGER NOT NULL DEFAULT 0,
  habit_count INTEGER NOT NULL DEFAULT 0,  -- 반복 할일 (recurrence_pattern != 'none')
  project_count INTEGER NOT NULL DEFAULT 0,
  goal_count INTEGER NOT NULL DEFAULT 0,
  note_count INTEGER NOT NULL DEFAULT 0,
  area_resource_count INTEGER NOT NULL DEFAULT 0,
  contact_count INTEGER NOT NULL DEFAULT 0,

  -- 메타데이터
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. RLS 정책
ALTER TABLE user_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage stats"
  ON user_usage_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage stats"
  ON user_usage_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON user_usage_stats(user_id);

-- ================================================================
-- 4. 트리거 함수: 용량 카운트 자동 업데이트
-- ================================================================

-- 4.1 todos 트리거 함수
CREATE OR REPLACE FUNCTION update_usage_stats_on_todo_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- user_usage_stats가 없으면 생성
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- 카운트 업데이트
    IF NEW.recurrence_pattern IS NULL OR NEW.recurrence_pattern = 'none' THEN
      UPDATE user_usage_stats
      SET todo_count = todo_count + 1, updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSE
      UPDATE user_usage_stats
      SET habit_count = habit_count + 1, updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.recurrence_pattern IS NULL OR OLD.recurrence_pattern = 'none' THEN
      UPDATE user_usage_stats
      SET todo_count = GREATEST(0, todo_count - 1), updated_at = now()
      WHERE user_id = OLD.user_id;
    ELSE
      UPDATE user_usage_stats
      SET habit_count = GREATEST(0, habit_count - 1), updated_at = now()
      WHERE user_id = OLD.user_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- recurrence_pattern이 변경된 경우 (일반 할일 ↔ 습관 전환)
    IF (OLD.recurrence_pattern IS NULL OR OLD.recurrence_pattern = 'none')
       AND (NEW.recurrence_pattern IS NOT NULL AND NEW.recurrence_pattern != 'none') THEN
      -- 일반 → 습관
      UPDATE user_usage_stats
      SET todo_count = GREATEST(0, todo_count - 1),
          habit_count = habit_count + 1,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    ELSIF (OLD.recurrence_pattern IS NOT NULL AND OLD.recurrence_pattern != 'none')
       AND (NEW.recurrence_pattern IS NULL OR NEW.recurrence_pattern = 'none') THEN
      -- 습관 → 일반
      UPDATE user_usage_stats
      SET habit_count = GREATEST(0, habit_count - 1),
          todo_count = todo_count + 1,
          updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 projects 트리거 함수
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

-- 4.3 goals 트리거 함수
CREATE OR REPLACE FUNCTION update_usage_stats_on_goal_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_usage_stats
    SET goal_count = goal_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET goal_count = GREATEST(0, goal_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 notes 트리거 함수
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

-- 4.5 areas_resources 트리거 함수
CREATE OR REPLACE FUNCTION update_usage_stats_on_area_resource_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_usage_stats
    SET area_resource_count = area_resource_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET area_resource_count = GREATEST(0, area_resource_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.6 contacts 트리거 함수
CREATE OR REPLACE FUNCTION update_usage_stats_on_contact_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_usage_stats
    SET contact_count = contact_count + 1, updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET contact_count = GREATEST(0, contact_count - 1), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 5. 트리거 생성
-- ================================================================

-- todos 트리거
DROP TRIGGER IF EXISTS trigger_usage_stats_todo ON todos;
CREATE TRIGGER trigger_usage_stats_todo
AFTER INSERT OR DELETE OR UPDATE OF recurrence_pattern ON todos
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_todo_change();

-- projects 트리거
DROP TRIGGER IF EXISTS trigger_usage_stats_project ON projects;
CREATE TRIGGER trigger_usage_stats_project
AFTER INSERT OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_project_change();

-- goals 트리거
DROP TRIGGER IF EXISTS trigger_usage_stats_goal ON goals;
CREATE TRIGGER trigger_usage_stats_goal
AFTER INSERT OR DELETE ON goals
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_goal_change();

-- notes 트리거
DROP TRIGGER IF EXISTS trigger_usage_stats_note ON notes;
CREATE TRIGGER trigger_usage_stats_note
AFTER INSERT OR DELETE ON notes
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_note_change();

-- areas_resources 트리거
DROP TRIGGER IF EXISTS trigger_usage_stats_area_resource ON areas_resources;
CREATE TRIGGER trigger_usage_stats_area_resource
AFTER INSERT OR DELETE ON areas_resources
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_area_resource_change();

-- contacts 트리거 (테이블이 존재하는 경우만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    DROP TRIGGER IF EXISTS trigger_usage_stats_contact ON contacts;
    CREATE TRIGGER trigger_usage_stats_contact
    AFTER INSERT OR DELETE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_contact_change();
  END IF;
END $$;

-- ================================================================
-- 6. 기존 사용자 용량 초기화 함수
-- ================================================================

CREATE OR REPLACE FUNCTION initialize_user_usage_stats(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage_stats (
    user_id,
    todo_count,
    habit_count,
    project_count,
    goal_count,
    note_count,
    area_resource_count,
    contact_count,
    last_calculated_at
  )
  SELECT
    p_user_id,
    COALESCE((SELECT COUNT(*) FROM todos WHERE user_id = p_user_id AND (recurrence_pattern IS NULL OR recurrence_pattern = 'none')), 0),
    COALESCE((SELECT COUNT(*) FROM todos WHERE user_id = p_user_id AND recurrence_pattern IS NOT NULL AND recurrence_pattern != 'none'), 0),
    COALESCE((SELECT COUNT(*) FROM projects WHERE user_id = p_user_id), 0),
    COALESCE((SELECT COUNT(*) FROM goals WHERE user_id = p_user_id), 0),
    COALESCE((SELECT COUNT(*) FROM notes WHERE user_id = p_user_id), 0),
    COALESCE((SELECT COUNT(*) FROM areas_resources WHERE user_id = p_user_id), 0),
    COALESCE((
      SELECT COUNT(*) FROM contacts WHERE user_id = p_user_id
    ), 0),
    now()
  ON CONFLICT (user_id) DO UPDATE SET
    todo_count = EXCLUDED.todo_count,
    habit_count = EXCLUDED.habit_count,
    project_count = EXCLUDED.project_count,
    goal_count = EXCLUDED.goal_count,
    note_count = EXCLUDED.note_count,
    area_resource_count = EXCLUDED.area_resource_count,
    contact_count = EXCLUDED.contact_count,
    last_calculated_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. 모든 기존 사용자 용량 초기화
-- ================================================================

DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM initialize_user_usage_stats(user_record.id);
  END LOOP;
END $$;

-- 완료 메시지
COMMENT ON TABLE user_usage_stats IS '사용자별 엔티티 용량 통계 - 구독 제한 시스템용';
