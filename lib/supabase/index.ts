/**
 * Supabase API 통합 인덱스
 * 모든 모듈의 함수를 재export하여 기존 import 경로 호환성 유지
 *
 * 사용 예시:
 * - 기존: import { fetchTodosWithJWT } from '@/lib/supabaseWebViewHelper';
 * - 새 방식 (권장): import { fetchTodosWithJWT } from '@/lib/supabase/todos';
 * - 호환: import { fetchTodosWithJWT } from '@/lib/supabase';
 */

// ================================
// 핵심 인프라
// ================================
export * from './core';

// 명시적 export (webpack 빌드 타임 인식을 위해 필요)
export {
  // Core
  isCapacitorEnvironment,
  handlePlatformError,
  CapacitorAuthError,
  fetchWithJWT,
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
  getMaxOrderIndexWithJWT,
  type QueryCondition,
  type QueryOptions
} from './core';

// ================================
// 사용자 및 세션
// ================================
export * from './users';

export {
  fetchUserWithJWT,
  fetchUser,
  fetchPomodoroSessions
} from './users';

// ================================
// Todo 관리
// ================================
export * from './todos';
export * from './todo-exclusions';
export * from './time-overrides';

export {
  // Todos
  fetchTodosForDateRange,
  createTodoWithJWT,
  updateTodoWithJWT,
  deleteTodoWithJWT,
  fetchAllTodosWithJWT
} from './todos';

export {
  // Todo Exclusions
  queryTodoExclusionsWithJWT,
  queryTodoExclusionsDetailWithJWT,
  querySkippedDatesWithJWT,
  createTodoExclusionWithJWT,
  deleteTodoExclusionWithJWT,
  deleteAllTodoExclusionsWithJWT,
  type ExclusionReason,
  type TodoExclusionInfo
} from './todo-exclusions';

export {
  queryTimeOverridesWithJWT,
  createTimeOverrideWithJWT,
  updateTimeOverrideWithJWT,
  deleteTimeOverrideWithJWT,
  deleteTimeOverridesFromDateWithJWT,
  deleteAllTimeOverridesWithJWT
} from './time-overrides';

// ================================
// 사용자 설정
// ================================
export * from './preferences';

// ================================
// 메모 시스템
// ================================
export * from './memo-instances';

export {
  // Memo Instances
  fetchMemoInstanceByDateWithJWT,
  createMemoInstanceWithJWT,
  updateMemoInstanceWithJWT,
  deleteMemoInstanceWithJWT,
  fetchMemoInstancesByMemoIdWithJWT,
  fetchMemoInstancesByDateWithJWT,
  fetchMemoInstancesByTaskIdWithJWT,
  createMultipleMemoInstancesWithJWT
} from './memo-instances';

// ================================
// Second Brain System
// ================================
export * from './statistics';
