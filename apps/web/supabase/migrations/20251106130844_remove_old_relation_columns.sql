-- ================================================
-- Migration: Remove Old Relation Columns
-- ================================================
-- 목적: todos.project_id, notes.related_task_id 컬럼 제거
-- 배경: N:N 관계로 전환 완료 (todo_projects, todo_notes junction tables)
-- 생성일: 2025-01-06
-- ================================================

-- 1. todos 테이블에서 project_id 컬럼 제거
-- 이제 todos-projects 관계는 todo_projects junction table로 관리됩니다
ALTER TABLE IF EXISTS public.todos
DROP COLUMN IF EXISTS project_id;

-- 2. notes 테이블에서 related_task_id 컬럼 제거
-- 이제 todos-notes 관계는 todo_notes junction table로 관리됩니다
ALTER TABLE IF EXISTS public.notes
DROP COLUMN IF EXISTS related_task_id;

-- ================================================
-- 마이그레이션 완료
-- ================================================
-- 확인 사항:
-- - todo_projects junction table이 존재하고 RLS 정책이 활성화되어 있어야 합니다
-- - todo_notes junction table이 존재하고 RLS 정책이 활성화되어 있어야 합니다
-- - 기존 데이터가 junction table로 이관되어 있어야 합니다
--
-- 롤백 방법:
-- ALTER TABLE public.todos ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
-- ALTER TABLE public.notes ADD COLUMN related_task_id uuid REFERENCES todos(id) ON DELETE SET NULL;
-- ================================================
