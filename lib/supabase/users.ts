/**
 * Supabase Users - 사용자 및 포모도로 세션 관리
 */

import { fetchWithJWT, queryRLSTableWithJWT, QueryOptions, createWithJWT } from './core';

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
 * JWT 방식으로 사용자 정보 조회 또는 생성 (Defensive Programming)
 *
 * auth.users는 존재하지만 public.users에 없는 경우 자동 생성
 *
 * @param userId - auth.users의 사용자 ID
 * @param email - 사용자 이메일 (없으면 fallback)
 * @param name - 사용자 이름 (없으면 이메일 앞부분 사용)
 * @returns Promise<any | null> - 사용자 정보 또는 null (에러 시)
 */
export async function ensureUserExists(
  userId: string,
  email: string | null | undefined,
  name?: string | null
): Promise<any | null> {
  console.log('🔍 사용자 존재 확인 및 생성:', { userId, email, name });

  try {
    // 1. 기존 사용자 조회 시도
    const existingUser = await fetchUserWithJWT(userId);

    if (existingUser) {
      console.log('✅ 기존 사용자 발견:', existingUser.id);
      return existingUser;
    }

    // 2. public.users 없음 → 자동 생성 (Defensive Programming)
    console.log('⚠️ public.users 레코드 없음 - 자동 생성 시작');

    const fallbackEmail = email || `user_${userId}@daystep.app`;
    const fallbackName = name || email?.split('@')[0] || 'User';

    const newUserData = {
      id: userId,
      email: fallbackEmail,
      name: fallbackName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const createdUser = await createWithJWT('users', newUserData);
    console.log('✅ public.users 생성 완료:', createdUser.id);

    return createdUser;

  } catch (error: any) {
    // 중복 키 에러 감지 (동시성 이슈)
    const isDuplicateKeyError =
      error?.message?.includes('duplicate key') ||
      error?.message?.includes('23505') ||
      error?.message?.includes('unique constraint');

    if (isDuplicateKeyError) {
      console.log('⚠️ 중복 키 감지 (동시 생성) - 재조회 시도');
      try {
        const existingUser = await fetchUserWithJWT(userId);
        if (existingUser) {
          console.log('✅ 재조회 성공:', existingUser.id);
          return existingUser;
        }
      } catch (retryError) {
        console.error('❌ 재조회 실패:', retryError);
      }
    }

    console.error('❌ 사용자 존재 확인/생성 실패:', {
      errorName: error?.name,
      errorMessage: error?.message,
      userId,
      isDuplicateKeyError
    });

    // 에러 시 null 반환 (상위 레이어에서 fallback 처리)
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
