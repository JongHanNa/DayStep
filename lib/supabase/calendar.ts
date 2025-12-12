/**
 * 달력 전용 Supabase API
 */

import { fetchWithJWT } from './core';
import type { Todo } from '@/types';

/**
 * 날짜가 설정된 모든 할일 조회 (달력 표시용)
 *
 * - start_time이 있는 모든 할일
 * - 완료 여부 무관 (완료된 할일도 표시)
 */
export async function fetchScheduledTodos(userId: string): Promise<Todo[]> {
  console.log('📅 달력 할일 조회:', { userId });

  try {
    // start_time이 null이 아닌 모든 할일 조회
    const path = `/todos?user_id=eq.${userId}&start_time=not.is.null&select=*&order=start_time.asc`;
    const todos = await fetchWithJWT(path);

    console.log('✅ 달력 할일 조회 성공:', { count: todos?.length || 0 });
    return todos || [];
  } catch (error) {
    console.error('❌ 달력 할일 조회 실패:', error);
    return [];
  }
}
