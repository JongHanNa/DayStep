-- ================================================================
-- 1. cherished_people 트리거 함수
-- ================================================================
CREATE OR REPLACE FUNCTION update_usage_stats_on_cherished_people_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_usage_stats
    SET cherished_people_count = cherished_people_count + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET cherished_people_count = GREATEST(0, cherished_people_count - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 2. care_interactions 트리거 함수
-- ================================================================
CREATE OR REPLACE FUNCTION update_usage_stats_on_care_interaction_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_usage_stats (user_id) VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE user_usage_stats
    SET care_interaction_count = care_interaction_count + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_usage_stats
    SET care_interaction_count = GREATEST(0, care_interaction_count - 1),
        updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. 트리거 등록
-- ================================================================
DROP TRIGGER IF EXISTS trigger_usage_stats_cherished_people ON cherished_people;
CREATE TRIGGER trigger_usage_stats_cherished_people
AFTER INSERT OR DELETE ON cherished_people
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_cherished_people_change();

DROP TRIGGER IF EXISTS trigger_usage_stats_care_interaction ON care_interactions;
CREATE TRIGGER trigger_usage_stats_care_interaction
AFTER INSERT OR DELETE ON care_interactions
FOR EACH ROW EXECUTE FUNCTION update_usage_stats_on_care_interaction_change();

-- ================================================================
-- 4. 기존 잘못된 카운트 전체 재계산 (실제 레코드 수로 덮어씀)
-- ================================================================
UPDATE user_usage_stats u
SET
  cherished_people_count = (
    SELECT COUNT(*) FROM cherished_people WHERE user_id = u.user_id
  ),
  care_interaction_count = (
    SELECT COUNT(*) FROM care_interactions WHERE user_id = u.user_id
  ),
  updated_at = now();
