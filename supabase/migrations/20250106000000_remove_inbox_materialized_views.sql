-- Materialized View와 트리거 완전 제거 마이그레이션
-- 이유: CLAUDE.md "Materialized View 사용 금지" 규칙 준수
-- 문제: todos INSERT 시 트리거가 존재하지 않는 inbox_todos를 새로고침하려다 실패

-- 1. 트리거 제거
DROP TRIGGER IF EXISTS after_todos_change ON todos;
DROP TRIGGER IF EXISTS after_projects_change ON projects;
DROP TRIGGER IF EXISTS after_goals_change ON goals;

-- 2. 트리거 함수 제거
DROP FUNCTION IF EXISTS trg_refresh_inbox_todos();
DROP FUNCTION IF EXISTS trg_refresh_inbox_projects();
DROP FUNCTION IF EXISTS trg_refresh_inbox_goals();
DROP FUNCTION IF EXISTS refresh_inbox_views();

-- 3. Materialized View 제거
DROP MATERIALIZED VIEW IF EXISTS inbox_todos;
DROP MATERIALIZED VIEW IF EXISTS inbox_projects;
DROP MATERIALIZED VIEW IF EXISTS inbox_goals;

-- 4. 인덱스 제거 (Materialized View와 함께 삭제되지만 명시적으로)
DROP INDEX IF EXISTS idx_inbox_todos_user_id;
DROP INDEX IF EXISTS idx_inbox_todos_clarification;
DROP INDEX IF EXISTS idx_inbox_projects_user_id;
DROP INDEX IF EXISTS idx_inbox_projects_clarification;
DROP INDEX IF EXISTS idx_inbox_goals_user_id;
DROP INDEX IF EXISTS idx_inbox_goals_clarification;

-- 결과: todos, projects, goals 테이블 직접 쿼리 + 클라이언트 필터링 사용
