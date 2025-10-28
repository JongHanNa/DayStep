/**
 * Supabase WebView Helper - 기존 호환성 유지용 재export 파일
 *
 * ⚠️ DEPRECATED: 이 파일은 기존 import 경로 호환성 유지를 위해서만 존재합니다.
 *
 * 새 코드 작성 시 개별 모듈에서 직접 import하는 것을 권장합니다:
 * - import { fetchTodosWithJWT } from '@/lib/supabase/todos';
 * - import { createMemoTagWithJWT } from '@/lib/supabase/memo-tags';
 * - import { fetchGoalsWithJWT } from '@/lib/supabase/goals';
 * - import { isCapacitorEnvironment } from '@/lib/supabase/core';
 *
 * 기존 코드:
 * - import { fetchTodosWithJWT } from '@/lib/supabaseWebViewHelper'; (계속 작동)
 *
 * 마이그레이션 가이드:
 * 1. 점진적으로 개별 모듈 import로 전환
 * 2. 이 파일은 모든 import가 마이그레이션될 때까지 유지
 * 3. IDE의 "Find Usages"로 사용처를 추적하여 전환
 *
 * @see lib/supabase/ - 새로운 모듈화된 구조
 */

// 모든 모듈 재export
export * from './supabase/index';

// webpack 빌드 타임 명시적 export (core 함수들)
export { isCapacitorEnvironment } from './supabase/core';
