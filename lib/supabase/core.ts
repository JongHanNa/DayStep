/**
 * Supabase Core - JWT 토큰 방식 핵심 인프라
 * Capacitor WebView 환경에서 RLS 테이블 접근을 위한 기반 기능
 *
 * @see https://supabase.com/docs/guides/api/rest/introduction
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

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
    let accessToken: string | null = null;

    // 🔥 중요: TOKEN_REFRESHED 이벤트 후 토큰 동기화 최적화
    // 1순위: Supabase 클라이언트의 최신 세션 사용 (토큰 자동 갱신 반영)
    try {
      const sessionResult = await supabase.auth.getSession();
      accessToken = sessionResult.data.session?.access_token || null;

      // 🧪 토큰 만료 시간 체크
      if (accessToken && sessionResult.data.session?.expires_at) {
        const expiresAt = sessionResult.data.session.expires_at * 1000;
        const now = Date.now();
        const isExpired = now >= expiresAt;

        if (isExpired) {
          accessToken = null;
        }
      }
    } catch (supabaseError) {
      // Supabase client token acquisition failed
    }

    // 2순위: Electron 저장소 백업 (Supabase 클라이언트 실패 시)
    if (!accessToken && typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const { ElectronPreferences } = await import('@/lib/electron/electronPreferences');
        const { value } = await ElectronPreferences.get({ key: 'supabase_auth_session' });
        if (value) {
          const sessionData = JSON.parse(value);
          const electronToken = sessionData.access_token;
          if (electronToken && sessionData.expires_at) {
            const expiresAt = sessionData.expires_at * 1000;
            const now = Date.now();
            if (now < expiresAt) {
              accessToken = electronToken;
            }
          } else {
            accessToken = electronToken;
          }
        }
      } catch (electronError) {
        console.log('⚠️ Electron 백업 토큰 로드 실패:', electronError);
      }
    }

    // 3순위: Capacitor 저장소 백업 (Supabase 클라이언트 실패 시)
    if (!accessToken && isCapacitorEnvironment()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: 'supabase_auth_session' });
        if (value) {
          const sessionData = JSON.parse(value);
          const capacitorToken = sessionData.access_token;

          // Capacitor 저장소 토큰도 만료 체크
          if (capacitorToken && sessionData.expires_at) {
            const expiresAt = sessionData.expires_at * 1000;
            const now = Date.now();
            const isExpired = now >= expiresAt;

            if (!isExpired) {
              accessToken = capacitorToken;
            } else {
              console.warn('⚠️ Capacitor 저장소의 토큰도 만료됨');
            }
          } else {
            accessToken = capacitorToken;
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
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      const isAbortError = error.name === 'AbortError';
      const isTimeoutError = error.message?.includes('timeout');
      const isNetworkError = error.message?.includes('fetch');

      // ✅ AbortError는 React 재렌더링으로 인한 정상적인 요청 취소이므로 조용히 처리
      if (isAbortError) {
        throw error;
      }

      // 더 상세한 에러 로깅
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

      if (error && typeof error === 'object') {
        try {
          errorInfo.errorKeys = Object.keys(error);
        } catch {
          errorInfo.errorKeys = ['unable_to_get_keys'];
        }
      }

      console.error(`❌ JWT API 요청 오류 (시도 ${attempt + 1}):`, errorInfo);
      console.error('🔍 에러 상세 분석:', error);

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
            console.log('🔑 토큰 만료 감지 - 자동 갱신 시작');
            const refreshResult = await supabase.auth.refreshSession();

            if (refreshResult.data.session && refreshResult.data.session.access_token) {
              console.log('✅ 세션 새로고침 성공 - 새 토큰 획득:', {
                userId: refreshResult.data.session.user?.id,
                newTokenExpiry: refreshResult.data.session.expires_at,
                hasNewToken: !!refreshResult.data.session.access_token
              });

              // 🔑 새로운 토큰을 Electron/Capacitor 저장소에도 즉시 업데이트
              if (typeof window !== 'undefined' && (window as any).electronAPI) {
                try {
                  const { ElectronPreferences } = await import('@/lib/electron/electronPreferences');
                  await ElectronPreferences.set({
                    key: 'supabase_auth_session',
                    value: JSON.stringify({
                      access_token: refreshResult.data.session.access_token,
                      refresh_token: refreshResult.data.session.refresh_token,
                      expires_at: refreshResult.data.session.expires_at,
                      token_type: refreshResult.data.session.token_type,
                      user: refreshResult.data.session.user
                    })
                  });
                  console.log('✅ 새로운 세션이 Electron 저장소에 업데이트됨');
                } catch (electronUpdateError) {
                  console.warn('⚠️ Electron 저장소 업데이트 실패:', electronUpdateError);
                }
              }
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
          }
        }

        const retryDelay = Math.pow(2, attempt) * 1000;
        console.log(`🔄 ${retryDelay}ms 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptFetch(attempt + 1);
      } else {
        throw error;
      }
    }
  };

  return attemptFetch(0);
}

/**
 * 쿼리 조건 인터페이스
 */
export interface QueryCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not.is';
  value: string | number | boolean | string[] | number[] | null;
}

/**
 * 쿼리 옵션 인터페이스
 */
export interface QueryOptions {
  select?: string;
  order?: string;
  limit?: number;
  single?: boolean;
}

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
    } else if (condition.operator === 'like' || condition.operator === 'ilike') {
      // like/ilike 연산자는 % 문자를 URL 인코딩해야 함
      const encodedValue = encodeURIComponent(String(condition.value));
      queryParams.push(`${condition.column}=${condition.operator}.${encodedValue}`);
    } else {
      queryParams.push(`${condition.column}=${condition.operator}.${condition.value}`);
    }
  });

  // select 추가 (항상 추가, URL 인코딩 포함)
  queryParams.push(`select=${encodeURIComponent(select)}`);

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

  // 🔍 디버깅: 실제 API 경로 확인
  console.log('🔍 [JWT API] 생성된 경로:', path);
  console.log('🔍 [JWT API] select 파라미터:', select);
  console.log('🔍 [JWT API] queryParams:', queryParams);

  const data = await fetchWithJWT(path);
  return single ? data[0] : data;
}

/**
 * JWT 방식으로 데이터 생성
 */
export async function createWithJWT(
  tableName: string,
  data: Record<string, any>
): Promise<any> {
  console.log(`📝 JWT 방식으로 ${tableName} 생성:`, data);

  try {
    const path = `/${tableName}`;
    const result = await fetchWithJWT(path, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    console.log(`✅ JWT ${tableName} 생성 성공:`, result);
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error(`❌ JWT ${tableName} 생성 실패:`, error);
    throw error;
  }
}

/**
 * JWT 방식으로 데이터 업데이트
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
    } else if (condition.operator === 'like' || condition.operator === 'ilike') {
      const encodedValue = encodeURIComponent(String(condition.value));
      queryParams.push(`${condition.column}=${condition.operator}.${encodedValue}`);
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
  } catch (error: any) {
    // AbortError는 타임아웃으로 인한 정상적인 취소이므로 로그 출력 안 함
    if (error?.name !== 'AbortError') {
      console.error(`❌ JWT 데이터 업데이트 실패: ${tableName}`, error);
    }
    throw error;
  }
}

/**
 * JWT 방식으로 데이터 삭제
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
    } else if (condition.operator === 'like' || condition.operator === 'ilike') {
      const encodedValue = encodeURIComponent(String(condition.value));
      queryParams.push(`${condition.column}=${condition.operator}.${encodedValue}`);
    } else {
      queryParams.push(`${condition.column}=${condition.operator}.${condition.value}`);
    }
  });

  const path = `/${tableName}?${queryParams.join('&')}`;

  try {
    const result = await fetchWithJWT(path, {
      method: 'DELETE',
    });

    console.log(`✅ JWT 데이터 삭제 성공: ${tableName}`);
    return result;
  } catch (error) {
    console.error(`❌ JWT 데이터 삭제 실패: ${tableName}`, error);
    throw error;
  }
}

/**
 * JWT 방식으로 최대 order_index 조회
 */
export async function getMaxOrderIndexWithJWT(tableName: string, userId: string): Promise<number> {
  console.log(`🔢 JWT 방식으로 ${tableName} 최대 order_index 조회:`, { userId });

  try {
    const path = `/${tableName}?user_id=eq.${userId}&select=order_index&order=order_index.desc&limit=1`;
    const data = await fetchWithJWT(path);
    const maxOrderIndex = Array.isArray(data) && data.length > 0 ? data[0].order_index : 0;

    console.log(`✅ JWT ${tableName} 최대 order_index:`, maxOrderIndex);
    return maxOrderIndex;
  } catch (error) {
    console.error(`❌ JWT ${tableName} 최대 order_index 조회 실패:`, error);
    return 0;
  }
}
