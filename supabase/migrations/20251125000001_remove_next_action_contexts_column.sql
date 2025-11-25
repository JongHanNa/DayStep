-- =============================================================================
-- Migration: next_action_contexts 컬럼 및 enum 타입 제거
-- 목적: 레거시 컬럼 정리, next_action_context_ids 컬럼으로 완전 전환
-- =============================================================================

-- 1. todos 테이블에서 next_action_contexts 컬럼 제거
ALTER TABLE IF EXISTS public.todos
DROP COLUMN IF EXISTS next_action_contexts;

-- 2. 사용하지 않는 enum 타입 제거
DROP TYPE IF EXISTS next_action_context_enum CASCADE;
