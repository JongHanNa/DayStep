/**
 * Supabase Users - 사용자 및 포모도로 세션 관리
 */

import { fetchWithJWT, queryRLSTableWithJWT, QueryOptions } from './core';

/**
 * JWT 방식으로 사용자 정보 조회 (타임아웃 및 재시도 최적화)
 */
export async function fetchUserWithJWT(userId: string): Promise<any | null> {
  console.log('👤 JWT 방식으로 사용자 정보 조회:', { userId });

  try {
    // 사용자 정보는 빠른 응답이 중요하므로 타임아웃을 6초로 단축
    const path = `/users?id=eq.${userId}`;
    const data = await fetchWithJWT(path, {}, 2, 6000); // 2회 재시도, 6초 타임아웃
    const user = Array.isArray(data) ? data[0] : data;

    console.log('✅ JWT 사용자 정보 조회 성공:', { hasUser: !!user });
    return user || null;
  } catch (error: any) {
    console.error('❌ JWT 사용자 정보 조회 실패:', {
      errorName: error?.name || 'Unknown',
      errorMessage: error?.message || 'Unknown error',
      errorConstructor: error?.constructor?.name || 'Unknown',
      errorStack: error?.stack,
      fullError: error
    });
    return null;
  }
}

/**
 * 사용자 정보 조회 (기존 호환성)
 */
export async function fetchUser(userId: string): Promise<any | null> {
  return await fetchUserWithJWT(userId);
}

/**
 * 포모도로 세션 조회
 */
export async function fetchPomodoroSessions(userId: string, options: QueryOptions = {}): Promise<any[]> {
  console.log('🍅 포모도로 세션 조회:', { userId, options });

  try {
    const sessions = await queryRLSTableWithJWT('pomodoro_sessions', {
      column: 'user_id',
      operator: 'eq',
      value: userId
    }, {
      order: 'created_at.desc',
      ...options
    });

    console.log('✅ 포모도로 세션 조회 성공:', { count: sessions?.length || 0 });
    return sessions || [];
  } catch (error) {
    console.error('❌ 포모도로 세션 조회 실패:', error);
    return [];
  }
}
