-- ============================================================================
-- Migration: inbox_filtering_views
-- Description: 명료화 페이지 수집함 필터링을 DB 레벨로 통합
-- Created: 2025-01-05
-- ============================================================================

-- ============================================================================
-- 1. 할일 수집함 Materialized View
-- ============================================================================
-- 필터링 조건:
--   - recurrence_pattern = 'none' (반복 할일 제외)
--   - clarification != 'waiting' (대기중: 무조건 제외)
--   - NOT (clarification = 'scheduled' AND start_time IS NOT NULL) (일정+날짜: 제외)
--   - NOT (clarification = 'next_action' AND array_length(next_action_contexts, 1) > 0) (다음행동+상황: 제외)

CREATE MATERIALIZED VIEW IF NOT EXISTS inbox_todos AS
SELECT t.*
FROM todos t
WHERE t.recurrence_pattern = 'none'
  AND t.clarification != 'waiting'
  AND t.clarification != 'someday'
  AND NOT (t.clarification = 'reminder' AND t.start_time IS NOT NULL)
  AND NOT (t.clarification = 'scheduled' AND t.start_time IS NOT NULL)
  AND NOT (t.clarification = 'next_action' AND COALESCE(array_length(t.next_action_contexts, 1), 0) > 0);

COMMENT ON MATERIALIZED VIEW inbox_todos IS '할일 수집함: 명료화가 필요한 할일 목록';


-- ============================================================================
-- 2. 프로젝트 수집함 Materialized View
-- ============================================================================
-- 필터링 조건:
--   - NOT (area_resource_id IS NOT NULL AND end_date IS NOT NULL AND total_todos > 0)
--   - 영역/자원, 종료일, 할일(1개 이상)이 모두 있는 프로젝트는 제외

CREATE MATERIALIZED VIEW IF NOT EXISTS inbox_projects AS
SELECT p.*
FROM projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) as todo_count
  FROM todos
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) t ON t.project_id = p.id
WHERE NOT (
  p.area_resource_id IS NOT NULL
  AND p.end_date IS NOT NULL
  AND COALESCE(t.todo_count, 0) > 0
);

COMMENT ON MATERIALIZED VIEW inbox_projects IS '프로젝트 수집함: 명료화가 필요한 프로젝트 목록';


-- ============================================================================
-- 3. 목표 수집함 Materialized View
-- ============================================================================
-- 필터링 조건:
--   - NOT ((area_id IS NOT NULL OR resource_id IS NOT NULL) AND end_date IS NOT NULL)
--   - 영역/자원과 종료일이 모두 있는 목표는 제외

CREATE MATERIALIZED VIEW IF NOT EXISTS inbox_goals AS
SELECT g.*
FROM goals g
WHERE NOT (
  (g.area_id IS NOT NULL OR g.resource_id IS NOT NULL)
  AND g.end_date IS NOT NULL
);

COMMENT ON MATERIALIZED VIEW inbox_goals IS '목표 수집함: 명료화가 필요한 목표 목록';


-- ============================================================================
-- 4. 성능 최적화를 위한 Index 생성
-- ============================================================================

-- CONCURRENTLY refresh를 위한 UNIQUE INDEX (필수)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_todos_id
ON inbox_todos(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_projects_id
ON inbox_projects(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inbox_goals_id
ON inbox_goals(id);

-- 일반 인덱스
-- 할일 수집함 인덱스
CREATE INDEX IF NOT EXISTS idx_inbox_todos_user_id
ON inbox_todos(user_id);

CREATE INDEX IF NOT EXISTS idx_inbox_todos_created_at
ON inbox_todos(created_at DESC);

-- 프로젝트 수집함 인덱스
CREATE INDEX IF NOT EXISTS idx_inbox_projects_user_id
ON inbox_projects(user_id);

CREATE INDEX IF NOT EXISTS idx_inbox_projects_created_at
ON inbox_projects(created_at DESC);

-- 목표 수집함 인덱스
CREATE INDEX IF NOT EXISTS idx_inbox_goals_user_id
ON inbox_goals(user_id);

CREATE INDEX IF NOT EXISTS idx_inbox_goals_created_at
ON inbox_goals(created_at DESC);


-- ============================================================================
-- 5. 자동 새로고침 함수
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_inbox_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_todos;
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_projects;
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_goals;
END;
$$;

COMMENT ON FUNCTION refresh_inbox_views IS '수집함 View를 동시성 모드로 새로고침';


-- ============================================================================
-- 6. 실시간 업데이트 Trigger
-- ============================================================================

-- todos 테이블 변경 시 inbox_todos 새로고침
CREATE OR REPLACE FUNCTION trg_refresh_inbox_todos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_todos;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_todos_change
AFTER INSERT OR UPDATE OR DELETE ON todos
FOR EACH STATEMENT
EXECUTE FUNCTION trg_refresh_inbox_todos();


-- projects 테이블 변경 시 inbox_projects 새로고침
CREATE OR REPLACE FUNCTION trg_refresh_inbox_projects()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_projects;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_projects_change
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT
EXECUTE FUNCTION trg_refresh_inbox_projects();


-- goals 테이블 변경 시 inbox_goals 새로고침
CREATE OR REPLACE FUNCTION trg_refresh_inbox_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY inbox_goals;
  RETURN NULL;
END;
$$;

CREATE TRIGGER after_goals_change
AFTER INSERT OR UPDATE OR DELETE ON goals
FOR EACH STATEMENT
EXECUTE FUNCTION trg_refresh_inbox_goals();


-- ============================================================================
-- 7. 초기 데이터 로드
-- ============================================================================

-- 생성 직후 한 번 새로고침
SELECT refresh_inbox_views();


-- ============================================================================
-- 8. Rollback Script (주석 처리)
-- ============================================================================

/*
-- Trigger 삭제
DROP TRIGGER IF EXISTS after_todos_change ON todos;
DROP TRIGGER IF EXISTS after_projects_change ON projects;
DROP TRIGGER IF EXISTS after_goals_change ON goals;

-- Function 삭제
DROP FUNCTION IF EXISTS trg_refresh_inbox_todos();
DROP FUNCTION IF EXISTS trg_refresh_inbox_projects();
DROP FUNCTION IF EXISTS trg_refresh_inbox_goals();
DROP FUNCTION IF EXISTS refresh_inbox_views();

-- Index 삭제
DROP INDEX IF EXISTS idx_inbox_todos_id;
DROP INDEX IF EXISTS idx_inbox_projects_id;
DROP INDEX IF EXISTS idx_inbox_goals_id;
DROP INDEX IF EXISTS idx_inbox_todos_user_id;
DROP INDEX IF EXISTS idx_inbox_todos_created_at;
DROP INDEX IF EXISTS idx_inbox_projects_user_id;
DROP INDEX IF EXISTS idx_inbox_projects_created_at;
DROP INDEX IF EXISTS idx_inbox_goals_user_id;
DROP INDEX IF EXISTS idx_inbox_goals_created_at;

-- Materialized View 삭제
DROP MATERIALIZED VIEW IF EXISTS inbox_todos;
DROP MATERIALIZED VIEW IF EXISTS inbox_projects;
DROP MATERIALIZED VIEW IF EXISTS inbox_goals;
*/
