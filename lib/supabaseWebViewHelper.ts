/**
 * Supabase WebView Helper - JWT 토큰 방식 RLS 테이블 접근 헬퍼
 * Capacitor WebView 환경에서는 수퍼베이스 클라이언트의 JWT 토큰 자동/수동 갱신이 안되는 문제가 있음.
 * Capacitor WebView 환경에서 RLS 정책이 있는 테이블에 접근하기 위해
 * Capacitor 저장소의 JWT 토큰을 사용하여 직접 Supabase REST API를 호출합니다.
 * 
 * @see https://supabase.com/docs/guides/api/rest/introduction
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import type { Todo } from '@/types';
import type { MotivationMessage, MotivationTemplate, MotivationTag, TodoMotivation } from '@/types/motivation';
import type { MemoTag, MemoTagLink, MemoTagInsert, MemoTagUpdate, MemoTagLinkInsert, NoteTagTemplate, CreateTagFromTemplateInput } from '@/types';

/**
 * Capacitor 환경 감지 유틸리티
 */
export const isCapacitorEnvironment = () => Capacitor.isNativePlatform();

/**
 * Capacitor 환경 특화 에러 클래스
 */
export class CapacitorAuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CapacitorAuthError';
  }
}

/**
 * 플랫폼별 에러 처리
 */
export const handlePlatformError = (error: any) => {
  if (isCapacitorEnvironment() && error.code === '42501') {
    return new CapacitorAuthError('RLS policy violation in Capacitor', 'RLS_ERROR');
  }
  return error;
};

/**
 * JWT 토큰을 사용하여 Supabase REST API에 직접 요청 (타임아웃 및 재시도 포함)
 * 
 * @param path - API 경로 (예: '/users?id=eq.123')
 * @param options - fetch 옵션
 * @param maxRetries - 최대 재시도 횟수 (기본값: 2)
 * @param timeout - 타임아웃 시간 ms (기본값: 8000)
 * @returns Promise<any> - API 응답 데이터
 */
export async function fetchWithJWT(
  path: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeout: number = 8000
): Promise<any> {
  const attemptFetch = async (attempt: number): Promise<any> => {
    // JWT API request attempt

    let accessToken: string | null = null;
    
    // 🔥 중요: TOKEN_REFRESHED 이벤트 후 토큰 동기화 최적화
    // 1순위: Supabase 클라이언트의 최신 세션 사용 (토큰 자동 갱신 반영)
    try {
      // TOKEN_REFRESHED 이벤트 직후라면 getSession이 새 토큰을 반환해야 함
      const sessionResult = await supabase.auth.getSession();
      accessToken = sessionResult.data.session?.access_token || null;
      // Token acquired from Supabase client
      
      // 🧪 토큰 만료 시간 체크 (디버깅)
      if (accessToken && sessionResult.data.session?.expires_at) {
        const expiresAt = sessionResult.data.session.expires_at * 1000; // 초를 밀리초로 변환
        const now = Date.now();
        const isExpired = now >= expiresAt;
        const minutesUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60));
        
        // Token expiry check
        
        if (isExpired) {
          // Token already expired
          accessToken = null; // 만료된 토큰은 사용하지 않음
        }
      }
    } catch (supabaseError) {
      // Supabase client token acquisition failed
    }
    
    // 2순위: Capacitor 저장소 백업 (Supabase 클라이언트 실패 시)
    if (!accessToken && isCapacitorEnvironment()) {
      // Checking Capacitor storage for token
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: 'supabase_auth_session' });
        if (value) {
          const sessionData = JSON.parse(value);
          const capacitorToken = sessionData.access_token;
          
          // Capacitor 저장소 토큰도 만료 체크
          if (capacitorToken && sessionData.expires_at) {
            const expiresAt = sessionData.expires_at * 1000; // 초를 밀리초로 변환
            const now = Date.now();
            const isExpired = now >= expiresAt;
            
            // Capacitor 저장소 토큰 만료 체크 완료
            
            if (!isExpired) {
              accessToken = capacitorToken;
              // Capacitor 저장소에서 유효한 백업 토큰 획득
            } else {
              console.warn('⚠️ Capacitor 저장소의 토큰도 만료됨');
            }
          } else {
            // expires_at 정보가 없으면 일단 시도
            accessToken = capacitorToken;
            // Capacitor 저장소에서 백업 토큰 획득 (만료시간 정보 없음)
          }
        }
      } catch (capacitorError) {
        console.log('⚠️ Capacitor 백업 토큰 로드 실패:', capacitorError);
      }
    }
    
    if (!accessToken) {
      throw new Error('JWT access token이 없습니다. 로그인이 필요합니다.');
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1${path}`;

    // 타임아웃 제어
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const requestConfig = {
        ...options,
        signal: controller.signal,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
          ...options.headers
        }
      };
      
      const response = await fetch(url, requestConfig);
      

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ JWT API 요청 실패 (시도 ${attempt + 1}):`, {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      // JWT API 요청 성공 (시도 ${attempt + 1}): ${Array.isArray(data) ? data.length : 'not-array'}개 항목

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const isAbortError = error.name === 'AbortError';
      const isTimeoutError = error.message?.includes('timeout');
      const isNetworkError = error.message?.includes('fetch');

      // ✅ AbortError는 React 재렌더링으로 인한 정상적인 요청 취소이므로 조용히 처리
      if (isAbortError) {
        // 컴포넌트 언마운트나 재렌더링으로 인한 정상적인 취소 - 에러 로그 제거
        throw error; // 재시도 없이 바로 종료
      }

      // 더 상세한 에러 로깅 (안전한 처리)
      const errorInfo: any = {
        errorName: error?.name || 'Unknown',
        errorMessage: error?.message || 'No message',
        errorConstructor: error?.constructor?.name || 'Unknown',
        isAbortError,
        isTimeoutError,
        isNetworkError,
        errorType: typeof error,
        path: path,
        method: options?.method || 'GET'
      };

      // error 객체가 존재할 때만 추가 정보 포함
      if (error && typeof error === 'object') {
        try {
          errorInfo.errorKeys = Object.keys(error);
        } catch {
          errorInfo.errorKeys = ['unable_to_get_keys'];
        }
      }

      console.error(`❌ JWT API 요청 오류 (시도 ${attempt + 1}):`, errorInfo);

      // 에러 상세 정보
      console.error('🔍 에러 상세 분석:', error);

      // 네트워크 관련 추가 정보
      if (isNetworkError) {
        console.error('🌐 네트워크 에러 세부사항:', {
          cause: error.cause,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall
        });
      }

      // JWT 토큰 만료 에러 감지
      const isTokenExpiredError = error.message?.includes('JWT expired') || 
                                 error.message?.includes('401') || 
                                 error.message?.includes('invalid_token');
      
      // 재시도 가능한 에러인지 확인
      const shouldRetry = (isAbortError || isTimeoutError || isNetworkError || isTokenExpiredError) && attempt < maxRetries;
      
      if (shouldRetry) {
        // JWT 토큰 만료로 인한 재시도인 경우 강제 세션 갱신
        if (isTokenExpiredError) {
          console.log('🔄 JWT 토큰 만료로 인한 재시도 - 세션 새로고침 시도');
          try {
            // 🔥 중요: refreshSession으로 새 토큰 강제 획득
            console.log('🔑 토큰 만료 감지 - 자동 갱신 시작');
            const refreshResult = await supabase.auth.refreshSession();
            
            if (refreshResult.data.session && refreshResult.data.session.access_token) {
              console.log('✅ 세션 새로고침 성공 - 새 토큰 획득:', {
                userId: refreshResult.data.session.user?.id,
                newTokenExpiry: refreshResult.data.session.expires_at,
                hasNewToken: !!refreshResult.data.session.access_token
              });
              
              // 🔑 새로운 토큰을 Capacitor 저장소에도 즉시 업데이트
              if (isCapacitorEnvironment()) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  await Preferences.set({
                    key: 'supabase_auth_session',
                    value: JSON.stringify({
                      access_token: refreshResult.data.session.access_token,
                      refresh_token: refreshResult.data.session.refresh_token,
                      expires_at: refreshResult.data.session.expires_at,
                      token_type: refreshResult.data.session.token_type,
                      user: refreshResult.data.session.user
                    })
                  });
                  console.log('✅ 새로운 세션이 Capacitor 저장소에 업데이트됨');
                } catch (capacitorUpdateError) {
                  console.warn('⚠️ Capacitor 저장소 업데이트 실패 (계속 진행):', capacitorUpdateError);
                }
              }
            } else {
              console.warn('⚠️ 세션 새로고침 성공했지만 새 토큰이 없음');
            }
          } catch (refreshError) {
            console.error('❌ 세션 새로고침 실패:', refreshError);
            // 새로고침 실패해도 재시도는 계속 진행 (다른 원인일 수 있음)
          }
        }
        
        const retryDelay = Math.pow(2, attempt) * 1000; // 지수적 백오프 (1s, 2s, 4s...)
        console.log(`🔄 ${retryDelay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch(attempt + 1);
      } else {
        // 재시도 불가능하거나 최대 재시도 횟수 초과
        throw error;
      }
    }
  };

  return attemptFetch(0);
}

/**
 * 쿼리 조건 인터페이스
 */
interface QueryCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in';
  value: string | number | boolean | string[] | number[];
}

/**
 * 쿼리 옵션 인터페이스
 */
interface QueryOptions {
  select?: string;
  order?: string;
  limit?: number;
  single?: boolean;
}

// ================================
// 🔥 JWT 토큰 방식 핵심 함수들
// ================================

/**
 * JWT 방식으로 RLS 테이블 데이터 조회
 * Capacitor WebView 환경에서 권장
 */
export async function queryRLSTableWithJWT(
  tableName: string,
  conditions: QueryCondition | QueryCondition[] = [],
  options: QueryOptions = {}
): Promise<any> {

  const { select = '*', order, limit, single = false } = options;
  const conditionArray = Array.isArray(conditions) ? conditions : [conditions].filter(Boolean);

  let path = `/${tableName}`;
  const queryParams: string[] = [];
  
  // 쿼리 조건 추가
  conditionArray.forEach(condition => {
    if (condition.operator === 'in' && Array.isArray(condition.value)) {
      queryParams.push(`${condition.column}=in.(${condition.value.join(',')})`);
    } else {
      queryParams.push(`${condition.column}=${condition.operator}.${condition.value}`);
    }
  });

  // select 추가
  if (select !== '*') {
    queryParams.push(`select=${select}`);
  }

  // order 추가
  if (order) {
    queryParams.push(`order=${order}`);
  }

  // limit 추가
  if (limit) {
    queryParams.push(`limit=${limit}`);
  }

  if (queryParams.length > 0) {
    path += '?' + queryParams.join('&');
  }

  const data = await fetchWithJWT(path);
  return single ? data[0] : data;
}

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

// ================================
// 📋 편의 함수들 (JWT 방식 통합)
// ================================

/**
 * 사용자 정보 조회 (기존 호환성)
 */
export async function fetchUser(userId: string): Promise<any | null> {
  return await fetchUserWithJWT(userId);
}


/**
 * 특정 날짜 범위의 할일 목록 조회 (성능 최적화)
 */
export async function fetchTodosForDateRange(
  userId: string, 
  utcStart: Date, 
  utcEnd: Date, 
  options: QueryOptions = {},
  isRetry: boolean = false
): Promise<any[]> {
  console.log('📅 날짜별 할일 목록 조회:', { 
    userId, 
    utcStart: utcStart.toISOString(), 
    utcEnd: utcEnd.toISOString(),
    options,
    isRetry 
  });

  try {
    // 🚨 중요: 조회 대상 날짜를 YYYY-MM-DD 형식으로 변환 (반복 종료일 비교용)
    const currentDateString = utcStart.toISOString().split('T')[0]; // 조회 날짜 사용 (YYYY-MM-DD 형식)
    
    // 조회 대상 날짜의 요일 계산 (KST 기준, 0=일요일, 1=월요일, ..., 6=토요일)
    // utcStart를 KST로 변환하여 해당 날짜의 요일 구하기
    const targetDayOfWeek = new Date(utcStart.getTime() + (9 * 60 * 60 * 1000)).getDay();
    
    // 날짜 범위 필터링을 위한 쿼리 파라미터 구성
    const orConditions = [
      // 시간 지정 할일: start_time이 범위 내에 있고 반복이 아닌 경우만
      `and(schedule_type.eq.timed,start_time.gte.${utcStart.toISOString()},start_time.lte.${utcEnd.toISOString()},recurrence_pattern.eq.none)`,
      // 언제든지 할일: created_at이 범위 내에 있는 경우
      `and(schedule_type.eq.anytime,created_at.gte.${utcStart.toISOString()},created_at.lte.${utcEnd.toISOString()})`,
      // 하루종일 할일: created_at이 범위 내에 있는 경우
      `and(schedule_type.eq.all_day,created_at.gte.${utcStart.toISOString()},created_at.lte.${utcEnd.toISOString()})`,
      // 🔄 매일 반복 할일: 종료일 체크만 (종료일 포함하여 그 다음날부터 제외)
      `and(recurrence_pattern.eq.daily,or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}))`,
      // 🔄 주간 반복 할일: 종료일 체크 + 조회 날짜의 요일에 해당하는 것만 (성능 최적화)  
      `and(recurrence_pattern.eq.weekly,or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}),recurrence_days_of_week.cs.[${targetDayOfWeek}])`,
      // 🔄 기타 반복 할일: 종료일 체크만 (monthly 등)
      `and(recurrence_pattern.not.in.(none,daily,weekly),or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}))`
    ];
    
    const queryParams = [
      `user_id=eq.${userId}`,
      `or=(${orConditions.join(',')})`,
      `select=*` // 반복 할일 필드 포함한 모든 필드 조회
    ];

    // order 파라미터 추가
    if (options.order) {
      queryParams.push(`order=${options.order}`);
    }

    const path = `/todos?${queryParams.join('&')}`;

    const rawTodos = await fetchWithJWT(path);

    // 🔥 중요: raw JSON 데이터를 Todo 클래스로 변환 (camelCase 변환)
    const { Todo } = await import('../entities/todo/Todo');
    const todos = (rawTodos || []).map((rawTodo: any) => Todo.fromDatabase(rawTodo));

    console.log('✅ 날짜별 할일 목록 조회 성공:', { count: todos?.length || 0, isRetry });
    return todos;
  } catch (error) {
    console.error('❌ 날짜별 할일 목록 조회 실패:', error);
    
    // 이미 재시도 중이라면 무한 재귀 방지를 위해 빈 배열 반환
    if (isRetry) {
      console.warn('🚫 재시도 중 실패 - 빈 배열 반환하여 무한 루프 방지');
      return [];
    }
    
    // 첫 번째 실패 시만 폴백 시도
    try {
      console.log('🔄 폴백: 넓은 범위로 할일 목록 조회');
      const farPast = new Date('2020-01-01');
      const farFuture = new Date('2030-12-31');
      return await fetchTodosForDateRange(userId, farPast, farFuture, options, true);
    } catch (fallbackError) {
      console.error('❌ 폴백 조회도 실패:', fallbackError);
      return [];
    }
  }
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

// ================================
// 🔥 JWT 토큰 방식 생성/수정/삭제 함수들
// ================================

/**
 * JWT 방식으로 데이터 생성 (INSERT)
 */
export async function createWithJWT(
  tableName: string,
  data: Record<string, any>
): Promise<any> {
  console.log(`🔥 JWT 방식으로 데이터 생성: ${tableName}`, { data });

  try {
    const result = await fetchWithJWT(`/${tableName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    console.log(`✅ JWT 데이터 생성 성공: ${tableName}`, { result });
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error(`❌ JWT 데이터 생성 실패: ${tableName}`, error);
    throw error;
  }
}

/**
 * JWT 방식으로 데이터 업데이트 (UPDATE)
 */
export async function updateWithJWT(
  tableName: string,
  conditions: QueryCondition | QueryCondition[],
  data: Record<string, any>
): Promise<any> {
  console.log(`🔄 JWT 방식으로 데이터 업데이트: ${tableName}`, { conditions, data });

  const conditionArray = Array.isArray(conditions) ? conditions : [conditions];
  const queryParams: string[] = [];
  
  conditionArray.forEach(condition => {
    if (condition.operator === 'in' && Array.isArray(condition.value)) {
      queryParams.push(`${condition.column}=in.(${condition.value.join(',')})`);
    } else {
      queryParams.push(`${condition.column}=${condition.operator}.${condition.value}`);
    }
  });

  const path = `/${tableName}?${queryParams.join('&')}`;

  try {
    const result = await fetchWithJWT(path, {
      method: 'PATCH',
      headers: {
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data),
    });

    console.log(`✅ JWT 데이터 업데이트 성공: ${tableName}`, { result });
    return result;
  } catch (error) {
    console.error(`❌ JWT 데이터 업데이트 실패: ${tableName}`, error);
    throw error;
  }
}

/**
 * JWT 방식으로 데이터 삭제 (DELETE)
 */
export async function deleteWithJWT(
  tableName: string,
  conditions: QueryCondition | QueryCondition[]
): Promise<any> {
  console.log(`🗑️ JWT 방식으로 데이터 삭제: ${tableName}`, { conditions });

  const conditionArray = Array.isArray(conditions) ? conditions : [conditions];
  const queryParams: string[] = [];
  
  conditionArray.forEach(condition => {
    if (condition.operator === 'in' && Array.isArray(condition.value)) {
      queryParams.push(`${condition.column}=in.(${condition.value.join(',')})`);
    } else {
      queryParams.push(`${condition.column}=${condition.operator}.${condition.value}`);
    }
  });

  const path = `/${tableName}?${queryParams.join('&')}`;

  try {
    const result = await fetchWithJWT(path, {
      method: 'DELETE',
    });

    console.log(`✅ JWT 데이터 삭제 성공: ${tableName}`, { result });
    return result;
  } catch (error) {
    console.error(`❌ JWT 데이터 삭제 실패: ${tableName}`, error);
    throw error;
  }
}

// ================================
// 🔄 반복 일정 제외 날짜 관리 함수들 (todo_exclusions)
// ================================

/**
 * JWT 방식으로 반복 일정 제외 날짜 생성
 */
export async function createTodoExclusionWithJWT(exclusionData: {
  parent_todo_id: string;
  excluded_date: string; // YYYY-MM-DD 형식
  user_id: string;
}): Promise<any> {
  console.log('🚫 JWT 방식으로 반복 일정 제외 날짜 생성:', { exclusionData });

  try {
    const result = await createWithJWT('todo_exclusions', exclusionData);
    console.log('✅ JWT 반복 일정 제외 날짜 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 제외 날짜들 조회
 */
export async function queryTodoExclusionsWithJWT(
  parentTodoId: string,
  userId: string
): Promise<string[]> {
  console.log('📅 JWT 방식으로 반복 일정 제외 날짜 조회:', { parentTodoId, userId });

  try {
    const exclusions = await queryRLSTableWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: 'excluded_date',
      order: 'excluded_date.asc'
    });

    const excludedDates = exclusions.map((e: any) => e.excluded_date);
    console.log('✅ JWT 반복 일정 제외 날짜 조회 성공:', { 
      count: excludedDates.length, 
      dates: excludedDates 
    });
    return excludedDates;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 조회 실패:', error);
    return []; // 실패 시 빈 배열 반환
  }
}

/**
 * JWT 방식으로 특정 제외 날짜 삭제 (취소 기능용)
 */
export async function deleteTodoExclusionWithJWT(
  parentTodoId: string,
  excludedDate: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 일정 제외 날짜 삭제:', { 
    parentTodoId, 
    excludedDate, 
    userId 
  });

  try {
    const result = await deleteWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'excluded_date',
        operator: 'eq',
        value: excludedDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);
    
    console.log('✅ JWT 반복 일정 제외 날짜 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 제외 날짜 삭제 (할일 삭제 시 사용)
 */
export async function deleteAllTodoExclusionsWithJWT(
  parentTodoId: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 할일의 모든 제외 날짜 삭제:', { 
    parentTodoId, 
    userId 
  });

  try {
    const result = await deleteWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);
    
    console.log('✅ JWT 반복 할일의 모든 제외 날짜 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 할일의 모든 제외 날짜 삭제 실패:', error);
    throw error;
  }
}

// ================================
// 📋 특화 생성/수정/삭제 함수들
// ================================

/**
 * JWT 방식으로 할일 생성
 */
export async function createTodoWithJWT(todoData: Record<string, any>): Promise<any> {
  console.log('📋 JWT 방식으로 할일 생성:', { todoData });

  try {
    const result = await createWithJWT('todos', todoData);
    console.log('✅ JWT 할일 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 할일 업데이트
 */
export async function updateTodoWithJWT(todoId: string, todoData: Record<string, any>): Promise<any> {
  console.log('📋 JWT 방식으로 할일 업데이트:', { todoId, todoData });

  try {
    const result = await updateWithJWT('todos', {
      column: 'id',
      operator: 'eq',
      value: todoId
    }, todoData);
    
    console.log('✅ JWT 할일 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 할일 삭제
 */
export async function deleteTodoWithJWT(todoId: string): Promise<any> {
  console.log('📋 JWT 방식으로 할일 삭제:', { todoId });

  try {
    const result = await deleteWithJWT('todos', {
      column: 'id',
      operator: 'eq',
      value: todoId
    });
    
    console.log('✅ JWT 할일 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 최대 order_index 조회
 */
export async function getMaxOrderIndexWithJWT(tableName: string, userId: string): Promise<number> {
  console.log(`📊 JWT 방식으로 최대 order_index 조회: ${tableName}`, { userId });

  try {
    const result = await queryRLSTableWithJWT(tableName, {
      column: 'user_id',
      operator: 'eq',
      value: userId
    }, {
      select: 'order_index',
      order: 'order_index.desc',
      limit: 1
    });

    const maxOrder = result && result.length > 0 ? (result[0].order_index || 0) : 0;
    console.log(`✅ JWT 최대 order_index 조회 성공: ${tableName}`, { maxOrder });
    return maxOrder;
  } catch (error) {
    console.error(`❌ JWT 최대 order_index 조회 실패: ${tableName}`, error);
    return 0; // 실패 시 기본값 0 반환
  }
}

// ================================
// 🎛️ 사용자 설정 관리 함수들
// ================================

/**
 * JWT 방식으로 사용자 설정 로드
 */
export async function loadUserPreferencesWithJWT(
  userId: string,
  preferenceKey: string
): Promise<any | null> {
  console.log('⚙️ JWT 방식으로 사용자 설정 로드:', { userId, preferenceKey });

  try {
    const result = await queryRLSTableWithJWT('user_preferences', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'preference_key',
        operator: 'eq',
        value: preferenceKey
      }
    ], {
      select: 'preference_value',
      single: true
    });

    if (result?.preference_value) {
      console.log('✅ JWT 사용자 설정 로드 성공:', { 
        preferenceKey, 
        hasData: !!result.preference_value 
      });
      return result.preference_value;
    } else {
      console.log('🔧 JWT 사용자 설정 없음, 기본값 사용:', { preferenceKey });
      return null;
    }
  } catch (error: any) {
    if (error.message?.includes('PGRST116') || error.message?.includes('No rows found')) {
      console.log('🔧 JWT 사용자 설정 없음, 기본값 사용:', { preferenceKey });
      return null;
    }
    console.error('❌ JWT 사용자 설정 로드 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 설정 저장 (upsert)
 */
export async function saveUserPreferencesWithJWT(
  userId: string,
  preferenceKey: string,
  preferenceValue: any
): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  const isNativeEnvironment = Capacitor.isNativePlatform();
  
  console.log('💾 사용자 설정 저장:', { 
    userId, 
    preferenceKey, 
    hasValue: !!preferenceValue,
    method: isNativeEnvironment ? 'JWT' : 'Supabase-Client' 
  });

  try {
    const settingsData = {
      user_id: userId,
      preference_key: preferenceKey,
      preference_value: preferenceValue,
      updated_at: new Date().toISOString()
    };

    if (isNativeEnvironment) {
      // Capacitor 환경: JWT 방식 사용 (409 에러 방지를 위해 바로 UPDATE)
      console.log('🔧 Capacitor 환경에서 바로 PATCH 방식 사용 (409 에러 방지)');
      
      const updateResult = await fetchWithJWT(`/user_preferences?user_id=eq.${userId}&preference_key=eq.${preferenceKey}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          preference_value: preferenceValue,
          updated_at: new Date().toISOString()
        })
      });
      
      console.log('✅ JWT 사용자 설정 저장 성공 (UPDATE):', { 
        preferenceKey, 
        result: !!updateResult 
      });
      return true;
    } else {
      // 웹 환경: Supabase 클라이언트의 upsert() 메소드 사용
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(settingsData, { 
          onConflict: 'user_id,preference_key',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Supabase 클라이언트 UPSERT 실패:', error);
        return false;
      }

      console.log('✅ Supabase 클라이언트 UPSERT 성공:', { 
        preferenceKey, 
        result: !!data 
      });
      return true;
    }
  } catch (error) {
    console.error('❌ 사용자 설정 저장 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 타임라인 표시 설정 로드
 */
export async function loadTimelineDisplayPreferencesWithJWT(userId: string): Promise<{
  showDayStartGap: boolean;
  showPastGaps: boolean;
} | null> {
  console.log('📅 JWT 방식으로 타임라인 표시 설정 로드:', { userId });

  try {
    const preferences = await loadUserPreferencesWithJWT(userId, 'timeline_display_settings');
    
    if (preferences) {
      return {
        showDayStartGap: preferences.showDayStartGap ?? true,
        showPastGaps: preferences.showPastGaps ?? false
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ JWT 타임라인 표시 설정 로드 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 타임라인 표시 설정 저장
 */
export async function saveTimelineDisplayPreferencesWithJWT(
  userId: string,
  showDayStartGap: boolean,
  showPastGaps: boolean
): Promise<boolean> {
  console.log('💾 JWT 방식으로 타임라인 표시 설정 저장:', { 
    userId, 
    showDayStartGap, 
    showPastGaps 
  });

  try {
    const settingsData = {
      showDayStartGap,
      showPastGaps,
      updatedAt: new Date().toISOString()
    };

    return await saveUserPreferencesWithJWT(userId, 'timeline_display_settings', settingsData);
  } catch (error) {
    console.error('❌ JWT 타임라인 표시 설정 저장 실패:', error);
    return false;
  }
}

// ================================
// ⏰ 반복 할일 시간 변경 관리 함수들 (todo_time_overrides)
// ================================

/**
 * JWT 방식으로 반복 할일 시간 override 생성
 */
export async function createTimeOverrideWithJWT(overrideData: {
  parent_todo_id: string;
  user_id: string;
  override_date: string; // YYYY-MM-DD 형식
  start_time: string; // ISO string
  end_time?: string; // ISO string
}): Promise<any> {
  console.log('⏰ JWT 방식으로 시간 override 생성:', { overrideData });

  try {
    const result = await createWithJWT('todo_time_overrides', {
      ...overrideData,
      updated_at: new Date().toISOString()
    });
    console.log('✅ JWT 시간 override 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간 override 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 반복 할일 시간 override 업데이트
 */
export async function updateTimeOverrideWithJWT(
  parentTodoId: string,
  overrideDate: string,
  updateData: {
    start_time?: string;
    end_time?: string;
  }
): Promise<any> {
  console.log('⏰ JWT 방식으로 시간 override 업데이트:', { 
    parentTodoId, 
    overrideDate, 
    updateData 
  });

  try {
    const result = await updateWithJWT('todo_time_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'eq',
        value: overrideDate
      }
    ], {
      ...updateData,
      updated_at: new Date().toISOString()
    });
    
    console.log('✅ JWT 시간 override 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간 override 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 시간 override 조회
 */
export async function queryTimeOverridesWithJWT(
  parentTodoId: string,
  userId: string,
  dateRange?: { start: string; end: string } // YYYY-MM-DD 형식
): Promise<any[]> {
  console.log('🔍 JWT 방식으로 시간 override 조회:', { 
    parentTodoId, 
    userId, 
    dateRange 
  });

  try {
    const conditions: QueryCondition[] = [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ];

    // 날짜 범위 필터 추가
    if (dateRange) {
      conditions.push(
        {
          column: 'override_date',
          operator: 'gte',
          value: dateRange.start
        },
        {
          column: 'override_date',
          operator: 'lte',
          value: dateRange.end
        }
      );
    }

    const overrides = await queryRLSTableWithJWT('todo_time_overrides', conditions, {
      select: '*',
      order: 'override_date.asc'
    });

    console.log('✅ JWT 시간 override 조회 성공:', { 
      count: overrides.length,
      parentTodoId 
    });
    return overrides;
  } catch (error) {
    console.error('❌ JWT 시간 override 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 날짜의 시간 override 삭제
 */
export async function deleteTimeOverrideWithJWT(
  parentTodoId: string,
  overrideDate: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 시간 override 삭제:', { 
    parentTodoId, 
    overrideDate, 
    userId 
  });

  try {
    const result = await deleteWithJWT('todo_time_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'eq',
        value: overrideDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);
    
    console.log('✅ JWT 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간 override 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 날짜 이후의 모든 시간 override 삭제 ("이후 모든 일정 업데이트" 기능용)
 */
export async function deleteTimeOverridesFromDateWithJWT(
  parentTodoId: string,
  fromDate: string, // YYYY-MM-DD 형식
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 특정 날짜 이후 시간 override 삭제:', { 
    parentTodoId, 
    fromDate, 
    userId 
  });

  try {
    const result = await deleteWithJWT('todo_time_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'gte',
        value: fromDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);
    
    console.log('✅ JWT 특정 날짜 이후 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 특정 날짜 이후 시간 override 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 시간 override 삭제 ("모든 일정 업데이트" 기능용)
 */
export async function deleteAllTimeOverridesWithJWT(
  parentTodoId: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 할일의 모든 시간 override 삭제:', { 
    parentTodoId, 
    userId 
  });

  try {
    const result = await deleteWithJWT('todo_time_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);
    
    console.log('✅ JWT 반복 할일의 모든 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 할일의 모든 시간 override 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 모든 할일 조회 (할일 연결 모달용)
 * 날짜 필터링 없이 모든 할일을 내림차순으로 조회
 */
export async function fetchAllTodosWithJWT(
  userId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📋 JWT 방식으로 모든 할일 조회:', { userId, options });

  try {
    const todos = await queryRLSTableWithJWT('todos', {
      column: 'user_id',
      operator: 'eq',
      value: userId
    }, {
      select: '*',
      order: 'created_at.desc', // 내림차순 정렬
      ...options
    });

    console.log('✅ JWT 모든 할일 조회 성공:', { todosCount: todos.length });
    return todos || [];
  } catch (error) {
    console.error('❌ JWT 모든 할일 조회 실패:', error);
    return [];
  }
}

// =================================================================
// 노트 인스턴스 관리 함수들
// =================================================================

/**
 * JWT 방식으로 노트 인스턴스 생성
 */
export async function createMemoInstanceWithJWT(instanceData: Record<string, any>): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 생성:', { instanceData });

  try {
    const result = await createWithJWT('note_instances', instanceData);
    console.log('✅ JWT 노트 인스턴스 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 인스턴스 업데이트
 */
export async function updateMemoInstanceWithJWT(instanceId: string, instanceData: Record<string, any>): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 업데이트:', { instanceId, instanceData });

  try {
    const result = await updateWithJWT('note_instances', {
      column: 'id',
      operator: 'eq',
      value: instanceId
    }, instanceData);

    console.log('✅ JWT 노트 인스턴스 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 인스턴스 삭제
 */
export async function deleteMemoInstanceWithJWT(instanceId: string): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 삭제:', { instanceId });

  try {
    const result = await deleteWithJWT('note_instances', {
      column: 'id',
      operator: 'eq',
      value: instanceId
    });

    console.log('✅ JWT 노트 인스턴스 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 노트의 인스턴스들 조회
 */
export async function fetchMemoInstancesByMemoIdWithJWT(
  userId: string,
  originalMemoId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 노트 인스턴스들 조회:', { userId, originalMemoId, options });

  try {
    const instances = await queryRLSTableWithJWT('note_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'original_memo_id',
        operator: 'eq',
        value: originalMemoId
      }
    ], {
      select: '*',
      order: 'instance_date.asc',
      ...options
    });

    console.log('✅ JWT 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 날짜의 노트 인스턴스들 조회
 */
export async function fetchMemoInstancesByDateWithJWT(
  userId: string,
  instanceDate: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 특정 날짜 노트 인스턴스들 조회:', { userId, instanceDate, options });

  try {
    const instances = await queryRLSTableWithJWT('note_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'instance_date',
        operator: 'eq',
        value: instanceDate
      }
    ], {
      select: '*',
      order: 'created_at.desc',
      ...options
    });

    console.log('✅ JWT 특정 날짜 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 특정 날짜 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 노트의 특정 날짜 인스턴스 조회
 */
export async function fetchMemoInstanceByDateWithJWT(
  userId: string,
  originalMemoId: string,
  instanceDate: string
): Promise<any | null> {
  console.log('📝 JWT 방식으로 특정 노트의 특정 날짜 인스턴스 조회:', { userId, originalMemoId, instanceDate });

  try {
    const instances = await queryRLSTableWithJWT('note_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'original_memo_id',
        operator: 'eq',
        value: originalMemoId
      },
      {
        column: 'instance_date',
        operator: 'eq',
        value: instanceDate
      }
    ], {
      select: '*',
      limit: 1
    });

    const instance = instances?.[0] || null;
    console.log('✅ JWT 특정 노트의 특정 날짜 인스턴스 조회 성공:', { instance });
    return instance;
  } catch (error) {
    console.error('❌ JWT 특정 노트의 특정 날짜 인스턴스 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 특정 할일과 연결된 노트 인스턴스들 조회
 */
export async function fetchMemoInstancesByTaskIdWithJWT(
  userId: string,
  taskId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 특정 할일의 노트 인스턴스들 조회:', { userId, taskId, options });

  try {
    const instances = await queryRLSTableWithJWT('note_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'related_task_id',
        operator: 'eq',
        value: taskId
      }
    ], {
      select: '*',
      order: 'instance_date.asc',
      ...options
    });

    console.log('✅ JWT 특정 할일의 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 특정 할일의 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트 인스턴스 일괄 생성 (반복 노트 설정용)
 */
export async function createMultipleMemoInstancesWithJWT(
  userId: string,
  originalMemoId: string,
  content: string,
  dates: string[],
  relatedTaskId?: string | null
): Promise<any[]> {
  console.log('📝 JWT 방식으로 노트 인스턴스 일괄 생성:', {
    userId,
    originalMemoId,
    content,
    dates,
    relatedTaskId
  });

  try {
    const instances = [];

    for (const date of dates) {
      const instanceData = {
        original_memo_id: originalMemoId,
        user_id: userId,
        instance_date: date,
        content: content,
        is_modified: false,
        related_task_id: relatedTaskId || null
      };

      const result = await createMemoInstanceWithJWT(instanceData);
      instances.push(result);
    }

    console.log('✅ JWT 노트 인스턴스 일괄 생성 성공:', { instancesCount: instances.length });
    return instances;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 일괄 생성 실패:', error);
    throw error;
  }
}

// ============================================================================
// 동기부여 메시지 시스템 API Functions
// ============================================================================

/**
 * JWT 방식으로 모든 동기부여 템플릿 조회 (기본 제공 메시지)
 */
export async function fetchMotivationTemplatesWithJWT(): Promise<MotivationTemplate[]> {
  console.log('💪 JWT 방식으로 동기부여 템플릿 조회 시작');

  try {
    // 기본 템플릿은 RLS 없이 모든 사용자가 읽을 수 있음
    const templates = await fetchWithJWT('/motivation_templates', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 동기부여 템플릿 조회 성공:', { templatesCount: templates?.length || 0 });
    return templates || [];
  } catch (error) {
    console.error('❌ JWT 동기부여 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 모든 동기부여 태그 조회
 */
export async function fetchMotivationTagsWithJWT(userId?: string): Promise<MotivationTag[]> {
  console.log('🏷️ JWT 방식으로 동기부여 태그 조회 시작:', { userId });

  try {
    let path = '/motivation_tags?';

    if (userId) {
      // 기본 태그 + 사용자 커스텀 태그 조회
      path += `or=(is_default.eq.true,and(is_default.eq.false,user_id.eq.${userId}))`;
    } else {
      // 기본 태그만 조회
      path += 'is_default=eq.true';
    }

    const tags = await fetchWithJWT(path, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 동기부여 태그 조회 성공:', { tagsCount: tags?.length || 0 });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 동기부여 태그 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 조회
 */
export async function fetchUserMotivationMessagesWithJWT(userId: string): Promise<MotivationMessage[]> {
  console.log('📝 JWT 방식으로 사용자 커스텀 동기부여 메시지 조회:', { userId });

  try {
    const messages = await queryRLSTableWithJWT('user_motivation_messages', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'created_at.desc'
    });

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 조회 성공:', { messagesCount: messages.length });
    return messages || [];
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 생성
 */
export async function createUserMotivationMessageWithJWT(
  data: Omit<MotivationMessage, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>
): Promise<MotivationMessage | null> {
  console.log('✏️ JWT 방식으로 사용자 커스텀 동기부여 메시지 생성:', data);

  try {
    const messageData = {
      user_id: data.userId,
      content: data.content,
      tags: JSON.stringify(data.tags),
      icon: data.icon,
      color: data.color,
      image_url: data.imageUrl
    };

    const result = await createWithJWT('user_motivation_messages', messageData);
    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 수정
 */
export async function updateUserMotivationMessageWithJWT(
  id: string,
  userId: string,
  updates: Partial<MotivationMessage>
): Promise<MotivationMessage | null> {
  console.log('🔄 JWT 방식으로 사용자 커스텀 동기부여 메시지 수정:', { id, userId, updates });

  try {
    const updateData: any = {};

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

    const result = await updateWithJWT('user_motivation_messages', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], updateData);

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 수정 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 수정 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 삭제
 */
export async function deleteUserMotivationMessageWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 사용자 커스텀 동기부여 메시지 삭제:', { id, userId });

  try {
    await deleteWithJWT('user_motivation_messages', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 삭제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일에 동기부여 메시지 연결
 */
export async function linkMotivationToTodoWithJWT(
  userId: string,
  todoId: string,
  motivationType: 'template' | 'custom',
  motivationId: string
): Promise<TodoMotivation | null> {
  console.log('🔗 JWT 방식으로 할일에 동기부여 메시지 연결:', {
    userId,
    todoId,
    motivationType,
    motivationId
  });

  try {
    // 이미 같은 메시지가 연결되어 있는지 확인
    const existingLinks = await queryRLSTableWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'motivation_id', operator: 'eq', value: motivationId },
      { column: 'motivation_type', operator: 'eq', value: motivationType },
      { column: 'is_active', operator: 'eq', value: true }
    ], { select: '*', limit: 1 });

    // 이미 연결되어 있으면 기존 연결 반환
    if (existingLinks && existingLinks.length > 0) {
      const existingLink = existingLinks[0];
      console.log('ℹ️ 이미 연결된 동기부여 메시지:', { todoId, motivationId });
      return {
        todoId,
        motivationMessageId: motivationId,
        assignedAt: existingLink.assigned_at || new Date().toISOString(),
        isActive: true
      };
    }

    // 새로운 연결 생성
    const linkData = {
      todo_id: todoId,
      user_id: userId,
      motivation_type: motivationType,
      motivation_id: motivationId,
      is_active: true
    };

    const result = await createWithJWT('todo_motivation_links', linkData);
    console.log('✅ JWT 할일에 동기부여 메시지 연결 성공:', { id: result?.id });

    return {
      todoId,
      motivationMessageId: motivationId,
      assignedAt: result?.assigned_at || new Date().toISOString(),
      isActive: true
    };
  } catch (error) {
    console.error('❌ JWT 할일에 동기부여 메시지 연결 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 특정 동기부여 메시지의 할일 연결 해제
 */
export async function unlinkMotivationFromTodoWithJWT(
  userId: string,
  todoId: string,
  motivationId: string,
  motivationType: 'template' | 'custom'
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 특정 동기부여 메시지의 할일 연결 해제:', {
    userId,
    todoId,
    motivationId,
    motivationType
  });

  try {
    await updateWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'motivation_id', operator: 'eq', value: motivationId },
      { column: 'motivation_type', operator: 'eq', value: motivationType }
    ], { is_active: false });

    console.log('✅ JWT 특정 동기부여 메시지의 할일 연결 해제 성공:', { todoId, motivationId });
    return true;
  } catch (error) {
    console.error('❌ JWT 특정 동기부여 메시지의 할일 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일의 모든 동기부여 메시지 연결 해제
 */
export async function unlinkAllMotivationsFromTodoWithJWT(
  userId: string,
  todoId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 할일의 모든 동기부여 메시지 연결 해제:', { userId, todoId });

  try {
    await updateWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], { is_active: false });

    console.log('✅ JWT 할일의 모든 동기부여 메시지 연결 해제 성공:', { todoId });
    return true;
  } catch (error) {
    console.error('❌ JWT 할일의 모든 동기부여 메시지 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일에 연결된 모든 동기부여 메시지 조회
 */
export async function fetchTodoMotivationsWithJWT(
  userId: string,
  todoId: string
): Promise<MotivationMessage[]> {
  console.log('🔍 JWT 방식으로 할일에 연결된 모든 동기부여 메시지 조회:', { userId, todoId });

  try {
    // 먼저 모든 연결 정보 조회
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      {
        column: 'todo_id',
        operator: 'eq',
        value: todoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'is_active',
        operator: 'eq',
        value: true
      }
    ], {
      select: '*'
    });

    if (!links || links.length === 0) {
      console.log('ℹ️ 할일에 연결된 활성 동기부여 메시지 없음:', { todoId });
      return [];
    }

    const messages: MotivationMessage[] = [];

    // 각 링크에 대해 메시지 조회
    for (const link of links) {
      let message: MotivationMessage | null = null;

      if (link.motivation_type === 'template') {
        // 템플릿 메시지 조회
        const templates = await fetchWithJWT(`/motivation_templates?id=eq.${link.motivation_id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        const template = templates?.[0];
        if (template) {
          message = {
            id: template.id,
            content: template.content,
            tags: Array.isArray(template.tags) ? template.tags : JSON.parse(template.tags || '[]'),
            icon: template.icon,
            imageUrl: template.image_url,
            isDefault: true,
            createdAt: template.created_at,
            updatedAt: template.updated_at
          };
        }
      } else if (link.motivation_type === 'custom') {
        // 커스텀 메시지 조회
        const customMessages = await queryRLSTableWithJWT('user_motivation_messages', [
          {
            column: 'id',
            operator: 'eq',
            value: link.motivation_id
          },
          {
            column: 'user_id',
            operator: 'eq',
            value: userId
          }
        ], {
          select: '*',
          limit: 1
        });

        const customMessage = customMessages?.[0];
        if (customMessage) {
          message = {
            id: customMessage.id,
            content: customMessage.content,
            tags: Array.isArray(customMessage.tags) ? customMessage.tags : JSON.parse(customMessage.tags || '[]'),
            icon: customMessage.icon,
            color: customMessage.color,
            imageUrl: customMessage.image_url,
            isDefault: false,
            userId: customMessage.user_id,
            createdAt: customMessage.created_at,
            updatedAt: customMessage.updated_at
          };
        }
      }

      if (message) {
        messages.push(message);
      }
    }

    console.log('✅ JWT 할일에 연결된 모든 동기부여 메시지 조회 성공:', { todoId, count: messages.length });
    return messages;
  } catch (error) {
    console.error('❌ JWT 할일에 연결된 모든 동기부여 메시지 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 동기부여 메시지에 연결된 모든 할일 조회
 */
export async function fetchMotivationTodosWithJWT(
  userId: string,
  motivationId: string,
  motivationType: 'template' | 'custom'
): Promise<string[]> {
  console.log('🔍 JWT 방식으로 동기부여 메시지에 연결된 모든 할일 조회:', {
    userId,
    motivationId,
    motivationType
  });

  try {
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'motivation_id',
        operator: 'eq',
        value: motivationId
      },
      {
        column: 'motivation_type',
        operator: 'eq',
        value: motivationType
      },
      {
        column: 'is_active',
        operator: 'eq',
        value: true
      }
    ], {
      select: 'todo_id'
    });

    const todoIds = links?.map((link: any) => link.todo_id) || [];
    console.log('✅ JWT 동기부여 메시지에 연결된 모든 할일 조회 성공:', {
      motivationId,
      count: todoIds.length
    });

    return todoIds;
  } catch (error) {
    console.error('❌ JWT 동기부여 메시지에 연결된 모든 할일 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 할일에 연결된 첫 번째 동기부여 메시지 조회 (하위 호환성)
 */
export async function fetchTodoMotivationWithJWT(
  userId: string,
  todoId: string
): Promise<MotivationMessage | null> {
  console.log('🔍 JWT 방식으로 할일에 연결된 첫 번째 동기부여 메시지 조회 (하위 호환성):', { userId, todoId });

  const motivations = await fetchTodoMotivationsWithJWT(userId, todoId);
  return motivations.length > 0 ? motivations[0] : null;
}

/**
 * JWT 방식으로 사용자의 모든 할일-동기부여 연결 데이터 조회
 */
export async function fetchAllTodoMotivationLinksWithJWT(
  userId: string
): Promise<Array<{ todoId: string; motivationId: string; assignedAt: string }>> {
  console.log('🔍 JWT 방식으로 사용자의 모든 할일-동기부여 연결 데이터 조회:', { userId });

  try {
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'is_active', operator: 'eq', value: true }
    ]);

    if (!links) {
      console.log('ℹ️ 연결된 할일-동기부여 데이터가 없습니다.');
      return [];
    }

    const results = links.map((link: any) => ({
      todoId: link.todo_id,
      motivationId: link.motivation_id,
      assignedAt: link.assigned_at
    }));

    console.log('✅ 사용자의 모든 할일-동기부여 연결 데이터 조회 성공:', { count: results.length });
    return results;
  } catch (error) {
    console.error('❌ 사용자의 모든 할일-동기부여 연결 데이터 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 태그 생성
 */
export async function createCustomMotivationTagWithJWT(
  data: Omit<MotivationTag, 'id' | 'isDefault' | 'createdAt'>
): Promise<MotivationTag | null> {
  console.log('🏷️ JWT 방식으로 사용자 커스텀 태그 생성:', data);

  try {
    const tagData = {
      name: data.name,
      color: data.color,
      icon: data.icon,
      is_default: false,
      user_id: data.userId
    };

    const result = await createWithJWT('motivation_tags', tagData);
    console.log('✅ JWT 사용자 커스텀 태그 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 태그 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 태그 삭제
 */
export async function deleteCustomMotivationTagWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 사용자 커스텀 태그 삭제:', { id, userId });

  try {
    await deleteWithJWT('motivation_tags', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'is_default', operator: 'eq', value: false }
    ]);

    console.log('✅ JWT 사용자 커스텀 태그 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 태그 삭제 실패:', error);
    return false;
  }
}

// ============================================================================
// 노트 태그 시스템 API Functions
// ============================================================================

/**
 * JWT 방식으로 사용자의 모든 노트 태그 조회
 */
export async function fetchAllMemoTagsWithJWT(userId: string): Promise<MemoTag[]> {
  console.log('🏷️ JWT 방식으로 노트 태그 조회:', { userId });

  try {
    const tags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'name.asc'
    });

    console.log('✅ JWT 노트 태그 조회 성공:', { tagsCount: tags.length });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 노트 태그 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트 태그 생성
 */
export async function createMemoTagWithJWT(
  data: Omit<MemoTagInsert, 'user_id'>,
  userId: string
): Promise<MemoTag | null> {
  console.log('✏️ JWT 방식으로 노트 태그 생성:', { data, userId });

  try {
    // 태그 이름 중복 검사
    const existingTags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'name',
        operator: 'eq',
        value: data.name
      }
    ], {
      select: 'id',
      limit: 1
    });

    if (existingTags && existingTags.length > 0) {
      throw new Error(`태그 이름 "${data.name}"이 이미 존재합니다.`);
    }

    const tagData = {
      user_id: userId,
      name: data.name,
      color: data.color || '#6B7280',
      description: data.description || null,
      is_active: data.is_active !== false, // 기본값은 true
      position: data.position || 0
    };

    const result = await createWithJWT('note_tags', tagData);
    console.log('✅ JWT 노트 태그 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 태그 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그 업데이트
 */
export async function updateMemoTagWithJWT(
  tagId: string,
  userId: string,
  updates: Partial<MemoTagInsert>
): Promise<MemoTag | null> {
  console.log('🔄 JWT 방식으로 노트 태그 업데이트:', { tagId, userId, updates });

  try {
    // 미리 정의된 태그는 수정 불가
    const existingTag = await queryRLSTableWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'is_predefined',
      limit: 1
    });

    if (!existingTag || existingTag.length === 0) {
      throw new Error('태그를 찾을 수 없습니다.');
    }

    if (existingTag[0].is_predefined) {
      throw new Error('미리 정의된 태그는 수정할 수 없습니다.');
    }

    // 이름 변경 시 중복 검사
    if (updates.name) {
      const duplicateTags = await queryRLSTableWithJWT('note_tags', [
        {
          column: 'user_id',
          operator: 'eq',
          value: userId
        },
        {
          column: 'name',
          operator: 'eq',
          value: updates.name
        }
      ], {
        select: 'id',
        limit: 1
      });

      if (duplicateTags && duplicateTags.length > 0 && duplicateTags[0].id !== tagId) {
        throw new Error(`태그 이름 "${updates.name}"이 이미 존재합니다.`);
      }
    }

    const result = await updateWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], updates);

    console.log('✅ JWT 노트 태그 업데이트 성공:', { tagId });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 노트 태그 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그 삭제
 */
export async function deleteMemoTagWithJWT(
  tagId: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 노트 태그 삭제:', { tagId, userId });

  try {
    // 미리 정의된 태그는 삭제 불가
    const existingTag = await queryRLSTableWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'is_predefined',
      limit: 1
    });

    if (!existingTag || existingTag.length === 0) {
      throw new Error('태그를 찾을 수 없습니다.');
    }

    if (existingTag[0].is_predefined) {
      throw new Error('미리 정의된 태그는 삭제할 수 없습니다.');
    }

    // 연결된 메모-태그 링크가 있는지 확인
    const linkedMemos = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'id',
      limit: 1
    });

    // 연결된 메모가 있으면 경고 (선택사항: 강제 삭제할지 사용자에게 확인)
    if (linkedMemos && linkedMemos.length > 0) {
      console.warn(`⚠️ 태그 ${tagId}에 연결된 메모가 있습니다. 링크도 함께 삭제됩니다.`);

      // 먼저 모든 링크 삭제
      await deleteWithJWT('note_tag_links', [
        { column: 'tag_id', operator: 'eq', value: tagId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);
    }

    // 태그 삭제
    await deleteWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 노트 태그 삭제 성공:', { tagId });
    return true;
  } catch (error) {
    console.error('❌ JWT 노트 태그 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 메모에 태그 연결
 */
export async function linkMemoToTagWithJWT(
  memoId: string,
  tagId: string,
  userId: string
): Promise<MemoTagLink | null> {
  console.log('🔗 JWT 방식으로 메모에 태그 연결:', { memoId, tagId, userId });

  try {
    // 이미 연결되어 있는지 확인
    const existingLinks = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'memo_id', operator: 'eq', value: memoId },
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: '*',
      limit: 1
    });

    if (existingLinks && existingLinks.length > 0) {
      console.log('ℹ️ 이미 연결된 메모-태그:', { memoId, tagId });
      return existingLinks[0];
    }

    // 메모당 태그 개수 제한 확인 (선택사항: 10개 제한)
    const currentTags = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'memo_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'id'
    });

    if (currentTags && currentTags.length >= 10) {
      throw new Error('메모당 최대 10개의 태그만 연결할 수 있습니다.');
    }

    // 새 링크 생성
    const linkData = {
      memo_id: memoId,
      tag_id: tagId,
      user_id: userId
    };

    const result = await createWithJWT('note_tag_links', linkData);
    console.log('✅ JWT 메모-태그 연결 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 메모-태그 연결 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 메모에서 태그 연결 해제
 */
export async function unlinkMemoFromTagWithJWT(
  memoId: string,
  tagId: string,
  userId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 메모-태그 연결 해제:', { memoId, tagId, userId });

  try {
    await deleteWithJWT('note_tag_links', [
      { column: 'memo_id', operator: 'eq', value: memoId },
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 메모-태그 연결 해제 성공:', { memoId, tagId });
    return true;
  } catch (error) {
    console.error('❌ JWT 메모-태그 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 메모의 모든 태그 연결 해제
 */
export async function unlinkAllTagsFromMemoWithJWT(
  memoId: string,
  userId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 메모의 모든 태그 연결 해제:', { memoId, userId });

  try {
    await deleteWithJWT('note_tag_links', [
      { column: 'memo_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 메모의 모든 태그 연결 해제 성공:', { memoId });
    return true;
  } catch (error) {
    console.error('❌ JWT 메모의 모든 태그 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 특정 메모에 연결된 모든 태그 조회
 */
export async function fetchTagsForMemoWithJWT(
  memoId: string,
  userId: string
): Promise<MemoTag[]> {
  console.log('🔍 JWT 방식으로 메모에 연결된 태그들 조회:', { memoId, userId });

  try {
    // 메모-태그 링크를 통해 태그 정보 조회 (JOIN 쿼리)
    const query = `
      select note_tags.*
      from note_tags
      inner join note_tag_links on note_tags.id = note_tag_links.tag_id
      where note_tag_links.memo_id = '${memoId}'
        and note_tag_links.user_id = '${userId}'
        and note_tags.user_id = '${userId}'
      order by note_tags.name asc
    `;

    // 복잡한 JOIN 쿼리는 직접 SQL로 실행
    const tags = await fetchWithJWT(`/rpc/execute_sql`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });

    console.log('✅ JWT 메모에 연결된 태그들 조회 성공:', { memoId, count: tags?.length || 0 });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 메모에 연결된 태그들 조회 실패:', error);

    // 폴백: 링크를 먼저 조회하고 태그를 개별적으로 가져오기
    try {
      const links = await queryRLSTableWithJWT('note_tag_links', [
        { column: 'memo_id', operator: 'eq', value: memoId },
        { column: 'user_id', operator: 'eq', value: userId }
      ], {
        select: 'tag_id'
      });

      if (!links || links.length === 0) {
        return [];
      }

      const tagIds = links.map((link: any) => link.tag_id);
      const tags = await queryRLSTableWithJWT('note_tags', [
        { column: 'id', operator: 'in', value: tagIds },
        { column: 'user_id', operator: 'eq', value: userId }
      ], {
        select: '*',
        order: 'name.asc'
      });

      return tags || [];
    } catch (fallbackError) {
      console.error('❌ JWT 노트 태그 조회 폴백도 실패:', fallbackError);
      return [];
    }
  }
}

/**
 * JWT 방식으로 태그에 연결된 모든 노트 조회
 */
export async function fetchTagMemosWithJWT(
  tagId: string,
  userId: string
): Promise<string[]> {
  console.log('🔍 JWT 방식으로 태그에 연결된 메모들 조회:', { tagId, userId });

  try {
    const links = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'memo_id',
      order: 'created_at.desc'
    });

    const memoIds = links?.map((link: any) => link.memo_id) || [];
    console.log('✅ JWT 태그에 연결된 메모들 조회 성공:', { tagId, count: memoIds.length });
    return memoIds;
  } catch (error) {
    console.error('❌ JWT 태그에 연결된 메모들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 메모에 다중 태그 연결 (배치 처리)
 */
export async function linkMemoToMultipleTagsWithJWT(
  memoId: string,
  tagIds: string[],
  userId: string
): Promise<MemoTagLink[]> {
  console.log('🔗 JWT 방식으로 메모에 다중 태그 연결:', { memoId, tagIds, userId });

  try {
    const results: MemoTagLink[] = [];

    // 각 태그에 대해 개별적으로 연결 (배치 INSERT는 복잡하므로)
    for (const tagId of tagIds) {
      try {
        const link = await linkMemoToTagWithJWT(memoId, tagId, userId);
        if (link) {
          results.push(link);
        }
      } catch (error) {
        console.warn(`⚠️ 태그 ${tagId} 연결 실패:`, error);
        // 개별 실패는 전체 작업을 중단하지 않음
      }
    }

    console.log('✅ JWT 메모에 다중 태그 연결 완료:', { memoId, successCount: results.length });
    return results;
  } catch (error) {
    console.error('❌ JWT 메모에 다중 태그 연결 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그들 일괄 업데이트 (기존 연결 모두 해제 후 새로 연결)
 */
export async function updateMemoTagsWithJWT(
  memoId: string,
  tagIds: string[],
  userId: string
): Promise<MemoTagLink[]> {
  console.log('🔄 JWT 방식으로 노트 태그들 일괄 업데이트:', { memoId, tagIds, userId });

  try {
    // 1. 기존 연결 모두 해제
    await unlinkAllTagsFromMemoWithJWT(memoId, userId);

    // 2. 새로운 태그들 연결
    if (tagIds.length > 0) {
      return await linkMemoToMultipleTagsWithJWT(memoId, tagIds, userId);
    } else {
      return [];
    }
  } catch (error) {
    console.error('❌ JWT 노트 태그들 일괄 업데이트 실패:', error);
    throw error;
  }
}

// ==============================
// Enhanced Memo Tag System - Template Support
// ==============================

/**
 * JWT 방식으로 모든 노트 태그 템플릿 조회 (전역 접근 가능)
 */
export async function fetchNoteTagTemplatesWithJWT(): Promise<NoteTagTemplate[]> {
  console.log('📋 노트 태그 템플릿 조회 시작 (공용 데이터)');

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/note_tag_templates?is_active=eq.true&order=category.asc,sort_order.asc`;
    console.log('🔗 API URL:', url);
    console.log('🔑 API Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 템플릿은 RLS가 없는 공용 데이터이므로 REST API 직접 호출
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 템플릿 조회 응답 오류:', response.status, response.statusText, errorText);
      return [];
    }

    const templates = await response.json();
    console.log('✅ 노트 태그 템플릿 조회 성공:', {
      templatesCount: templates?.length || 0,
      templates: templates?.slice(0, 3) // 처음 3개만 로그
    });
    return templates || [];
  } catch (error) {
    console.error('❌ 노트 태그 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 카테고리별 노트 태그 템플릿 조회
 */
export async function fetchNoteTagTemplatesByCategoryWithJWT(category?: string): Promise<NoteTagTemplate[]> {
  console.log('📋 JWT 방식으로 카테고리별 노트 태그 템플릿 조회:', { category });

  try {
    let path = '/rest/v1/note_tag_templates?is_active=eq.true';
    if (category) {
      path += `&category=eq.${category}`;
    }
    path += '&order=sort_order.asc,name.asc';

    const templates = await fetchWithJWT(path, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 카테고리별 노트 태그 템플릿 조회 성공:', { category, count: templates?.length || 0 });
    return templates || [];
  } catch (error) {
    console.error('❌ JWT 카테고리별 노트 태그 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 템플릿에서 사용자 태그 생성
 */
export async function createTagFromTemplateWithJWT(
  data: CreateTagFromTemplateInput,
  userId: string
): Promise<MemoTag | null> {
  console.log('✨ JWT 방식으로 템플릿에서 태그 생성:', { ...data, userId });

  try {
    // PostgreSQL 함수 호출
    const result = await fetchWithJWT('/rpc/create_tag_from_template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_template_id: data.template_id,
        p_custom_name: data.custom_name || null,
        p_custom_color: data.custom_color || null
      })
    });

    if (result) {
      // 생성된 태그 정보 조회
      const newTag = await queryRLSTableWithJWT('note_tags', [
        {
          column: 'id',
          operator: 'eq',
          value: result
        }
      ], {
        select: '*',
        single: true
      });

      console.log('✅ JWT 템플릿에서 태그 생성 성공:', { tagId: result });
      return newTag;
    }

    return null;
  } catch (error) {
    console.error('❌ JWT 템플릿에서 태그 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자의 기본 태그 세트 생성 (신규 사용자용)
 */
export async function createDefaultTagsForUserWithJWT(userId: string): Promise<number> {
  console.log('🏷️ JWT 방식으로 사용자 기본 태그 세트 생성:', { userId });

  try {
    // PostgreSQL 함수 호출
    const result = await fetchWithJWT('/rpc/create_default_tags_for_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        p_user_id: userId
      })
    });

    console.log('✅ JWT 사용자 기본 태그 세트 생성 성공:', { userId, createdCount: result || 0 });
    return result || 0;
  } catch (error) {
    console.error('❌ JWT 사용자 기본 태그 세트 생성 실패:', error);
    return 0;
  }
}

/**
 * 메모에 태그 및 템플릿 태그 연결 (혼합 지원)
 * - userTagIds: 실제 사용자 태그 ID들
 * - templateTagIds: 템플릿 태그 ID들 (note_tags 생성 없이 직접 연결)
 */
export async function updateMemoTagsWithTemplates(
  memoId: string,
  userTagIds: string[],
  templateTagIds: string[],
  userId: string
): Promise<void> {
  console.log('🔗 메모에 사용자 태그 + 템플릿 태그 연결:', {
    memoId,
    userTagCount: userTagIds.length,
    templateTagCount: templateTagIds.length,
    userId
  });

  try {
    // 1. 기존 연결 모두 삭제
    await deleteWithJWT('note_tag_links', [
      { column: 'memo_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    // 2. 사용자 태그 연결
    for (const tagId of userTagIds) {
      await createWithJWT('note_tag_links', {
        user_id: userId,
        memo_id: memoId,
        tag_id: tagId,
        template_id: null, // 사용자 태그이므로 template_id는 null
        is_active: true
      });
    }

    // 3. 템플릿 태그 직접 연결
    for (const templateId of templateTagIds) {
      await createWithJWT('note_tag_links', {
        user_id: userId,
        memo_id: memoId,
        tag_id: null, // 템플릿 태그이므로 tag_id는 null
        template_id: templateId,
        is_active: true
      });
    }

    console.log('✅ 노트 태그 연결 완료:', {
      memoId,
      userTagsLinked: userTagIds.length,
      templateTagsLinked: templateTagIds.length
    });
  } catch (error) {
    console.error('❌ 노트 태그 연결 실패:', error);
    throw new Error('메모 태그 연결에 실패했습니다.');
  }
}

/**
 * JWT 방식으로 사용자의 노트 태그 링크 조회
 */
export async function fetchMemoTagLinksWithJWT(userId: string): Promise<MemoTagLink[]> {
  console.log('🔗 JWT 방식으로 노트 태그 링크 조회:', { userId });

  try {
    const links = await queryRLSTableWithJWT('note_tag_links', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'is_active',
        operator: 'eq',
        value: true
      }
    ], {
      select: '*',
      order: 'assigned_at.desc'
    });

    console.log('✅ JWT 노트 태그 링크 조회 성공:', { userId, linksCount: links.length });
    return links || [];
  } catch (error) {
    console.error('❌ JWT 노트 태그 링크 조회 실패:', error);
    throw new Error('메모 태그 링크 조회에 실패했습니다.');
  }
}

/**
 * JWT 방식으로 사용자의 전체 태그 (사용자 태그 + 템플릿) 조회
 */
export async function fetchUserTagsWithTemplatesWithJWT(userId: string): Promise<MemoTag[]> {
  console.log('🏷️ JWT 방식으로 사용자 전체 태그 조회 (템플릿 포함):', { userId });

  try {
    // 사용자의 커스텀 태그만 조회 (템플릿 정보는 별도로 제공)
    const userTags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'name.asc'
    });

    console.log('✅ JWT 사용자 전체 태그 조회 성공:', { userId, userTagsCount: userTags.length });
    return userTags || [];
  } catch (error) {
    console.error('❌ JWT 사용자 전체 태그 조회 실패:', error);
    return [];
  }
}