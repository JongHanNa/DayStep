/**
 * Authentication Session Management Utilities
 *
 * AuthContext에서 사용되는 세션 관리 관련 함수들을 분리했습니다.
 * 세션 복구, 사용자 로딩 등의 기능을 포함합니다.
 */

import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fetchUser } from '@/lib/supabase/users';
import { User as AppUser } from '@/entities/user/User';

/**
 * 토큰 만료 상태 확인
 * 
 * @returns Promise<{ hasValidToken: boolean; reason?: string }>
 */
const checkTokenExpiry = async (): Promise<{ hasValidToken: boolean; reason?: string }> => {
  try {
    const currentSession = await supabase.auth.getSession();
    if (currentSession.data.session?.access_token) {
      const tokenExpiry = currentSession.data.session.expires_at;
      const now = Math.floor(Date.now() / 1000);

      if (tokenExpiry && tokenExpiry > now + 60) {
        return { hasValidToken: true };
      }
    }

    return { hasValidToken: false, reason: 'no-token-found' };

  } catch (error) {
    console.error('❌ 토큰 만료 체크 중 오류:', error);
    return { hasValidToken: false, reason: 'check-error' };
  }
};

/**
 * 세션 타임아웃을 적용한 setSession 호출
 * 
 * @param sessionData - 설정할 세션 데이터
 * @param timeoutMs - 타임아웃 시간 (기본값: 10초)
 * @returns Promise<{ data: any; error: any }>
 */
export const setSessionWithTimeout = async (
  sessionData: any, 
  timeoutMs: number = 10000
): Promise<{ data: any; error: any }> => {
  console.log('🔄 setSessionWithTimeout 시작:', {
    hasAccessToken: !!sessionData.access_token,
    hasRefreshToken: !!sessionData.refresh_token,
    userId: sessionData.user?.id,
    refreshTokenLength: sessionData.refresh_token?.length,
    accessTokenLength: sessionData.access_token?.length,
    refreshTokenStartsWith: sessionData.refresh_token?.substring(0, 20) + '...'
  });

  const setSessionPromise = supabase.auth.setSession({
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token
  });
  
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`setSession 타임아웃 (${timeoutMs}ms)`)), timeoutMs)
  );

  try {
    const result = await Promise.race([setSessionPromise, timeoutPromise]);
    console.log('✅ setSession 성공:', { 
      userId: result.data?.session?.user?.id,
      errorConstructor: result.error?.constructor?.name
    });
    return result;
  } catch (error) {
    console.error('❌ setSession 실패:', {
      errorMessage: (error as Error)?.message,
      errorConstructor: (error as Error)?.constructor?.name
    });
    return { data: null, error };
  }
};

/**
 * 세션 타임아웃을 적용한 refreshSession 호출
 * 
 * @param refreshToken - 리프레시 토큰
 * @param timeoutMs - 타임아웃 시간 (기본값: 8초)
 * @returns Promise<{ data: any; error: any }>
 */
export const refreshSessionWithTimeout = async (
  refreshToken: string, 
  timeoutMs: number = 8000
): Promise<{ data: any; error: any }> => {
  const refreshSessionPromise = supabase.auth.refreshSession({ refresh_token: refreshToken });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`refreshSession 타임아웃 (${timeoutMs}ms)`)), timeoutMs)
  );

  try {
    const result = await Promise.race([refreshSessionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * 세션 타임아웃을 적용한 getSession 호출
 * 
 * @param timeoutMs - 타임아웃 시간 (기본값: 5초)
 * @returns Promise<{ data: { session: Session | null }; error: any }>
 */
export const getSessionWithTimeout = async (
  timeoutMs: number = 5000
): Promise<{ data: { session: Session | null }; error: any }> => {
  const getSessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`getSession 타임아웃 (${timeoutMs}ms)`)), timeoutMs)
  );

  try {
    const result = await Promise.race([getSessionPromise, timeoutPromise]);
    return result;
  } catch (error) {
    return { data: { session: null }, error };
  }
};

/**
 * Google idToken을 Supabase 세션으로 변환
 * 
 * @param idToken - Google idToken
 * @returns Promise<{ session: Session | null; user: User | null; converted: boolean }>
 */
export const convertGoogleTokenToSupabaseSession = async (
  idToken: string
): Promise<{
  session: Session | null;
  user: User | null;
  converted: boolean;
}> => {
  console.log('🔑 Google idToken → Supabase 세션 변환 시작');
  
  try {
    const { data: supabaseSession, error: signInError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (signInError || !supabaseSession.session || !supabaseSession.user) {
      console.error('❌ Google idToken → Supabase 세션 변환 실패:', signInError);
      return { session: null, user: null, converted: false };
    }

    console.log('✅ Google idToken → Supabase 세션 변환 성공:', {
      userId: supabaseSession.user.id,
      userEmail: supabaseSession.user.email,
      hasRefreshToken: !!supabaseSession.session.refresh_token
    });

    return {
      session: supabaseSession.session,
      user: supabaseSession.user,
      converted: true
    };
  } catch (idTokenError) {
    console.error('❌ Google idToken 처리 실패:', idTokenError);
    return { session: null, user: null, converted: false };
  }
};

/**
 * 레거시 Google 세션 감지 및 정리
 * 
 * @param sessionData - 체크할 세션 데이터
 * @returns Promise<boolean> - 레거시 세션이었는지 여부
 */
export const cleanupLegacyGoogleSession = async (sessionData: any): Promise<boolean> => {
  const isLegacyGoogleSession = sessionData.user?.provider === 'google' && 
                              sessionData.access_token && 
                              !sessionData.id_token &&
                              sessionData.access_token.startsWith('eyJ'); // JWT 패턴 감지

  if (isLegacyGoogleSession) {
    console.log('🧹 레거시 Google access_token 세션 감지 - 세션 정리 시작');
    console.log('🧹 감지된 토큰 패턴:', {
      hasAccessToken: !!sessionData.access_token,
      hasIdToken: !!sessionData.id_token,
      tokenStart: sessionData.access_token?.substring(0, 20) + '...',
      isGoogleProvider: sessionData.user?.provider === 'google'
    });

    try {
      // 레거시 세션 정리
      localStorage.removeItem('supabase.auth.session');
      localStorage.removeItem('supabase_auth_session');
      console.log('✅ 레거시 Google 세션 정리 완료 - 새 로그인 필요');
      return true;
    } catch (cleanupError) {
      console.error('❌ 레거시 세션 정리 실패:', cleanupError);
      return false;
    }
  }
  
  return false;
};

// 중복 호출 방지를 위한 캐시와 플래그
const userTestCache = new Map<string, { result: any; timestamp: number }>();
const pendingTests = new Set<string>();

/**
 * 사용자 JWT 토큰 유효성 테스트 (중복 호출 방지 및 캐싱)
 * 
 * @param userId - 테스트할 사용자 ID
 * @returns Promise<{ valid: boolean; userData: any | null }>
 */
export const testUserJWTAccess = async (userId: string): Promise<{
  valid: boolean;
  userData: any | null;
}> => {
  // 1. 중복 호출 방지 - 동일한 사용자가 이미 처리 중이면 대기
  if (pendingTests.has(userId)) {
    console.log('⏳ 동일 사용자 JWT 테스트 이미 진행 중 - 대기');
    // 최대 5초 대기
    for (let i = 0; i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!pendingTests.has(userId)) break;
    }
  }
  
  // 2. 캐시 확인 (1분간 유효)
  const cached = userTestCache.get(userId);
  if (cached && (Date.now() - cached.timestamp) < 60000) {
    console.log('🎯 JWT 테스트 결과 캐시 히트 - 재사용');
    return cached.result;
  }
  
  // 3. 새로운 테스트 시작
  pendingTests.add(userId);
  console.log('🧪 JWT 토큰으로 DB 접근 권한 테스트 중...');
  
  try {
    const testData = await fetchUser(userId);
    const testError = testData ? null : new Error('User not found');

    let result;
    if (testError) {
      console.error('❌ JWT DB 접근 테스트 실패:', {
        errorMessage: testError.message,
        userId: userId,
        testData: testData
      });
      result = { valid: false, userData: null };
    } else {
      console.log('✅ JWT DB 접근 테스트 성공 - 인증 상태 정상');
      console.log('🎉 JWT 방식으로 실제 DB 데이터 조회 성공:', {
        id: testData.id,
        email: testData.email,
        name: testData.name
      });
      result = { valid: true, userData: testData };
    }
    
    // 4. 결과 캐싱
    userTestCache.set(userId, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (jwtError: any) {
    console.error('❌ JWT 테스트 중 예외 발생:', {
      errorName: jwtError?.name || 'Unknown',
      errorMessage: jwtError?.message || 'Unknown error',
      errorConstructor: jwtError?.constructor?.name || 'Unknown',
      errorStack: jwtError?.stack,
      userId: userId,
      fullError: jwtError
    });
    
    const errorResult = { valid: false, userData: null };
    userTestCache.set(userId, {
      result: errorResult,
      timestamp: Date.now()
    });
    
    return errorResult;
  } finally {
    // 5. 처리 완료 플래그 제거
    pendingTests.delete(userId);
  }
};

/**
 * 로컬 스토리지에서 사용자 정보 복구 (카카오/테스트 사용자)
 * 
 * @returns Promise<{ user: User | null; appUser: AppUser | null; provider: string | null }>
 */
export const restoreLocalStorageUser = async (): Promise<{
  user: User | null;
  appUser: AppUser | null;
  provider: string | null;
}> => {
  const kakaoUserData = localStorage.getItem('kakao_user');
  const iosTestUserData = localStorage.getItem('ios_test_user');

  // iOS 테스트 사용자는 개발 환경에서만 허용
  const isDevelopmentEnv = (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname === '127.0.0.1'
  ) && process.env.NODE_ENV === 'development';

  if (iosTestUserData && isDevelopmentEnv) {
    try {
      const iosTestUser = JSON.parse(iosTestUserData);
      console.log('localStorage에서 iOS 테스트 사용자 발견:', iosTestUser);

      // 가짜 User 객체 생성
      const fakeUser = {
        id: iosTestUser.id,
        email: iosTestUser.email,
        user_metadata: {
          name: iosTestUser.name,
          avatar_url: iosTestUser.avatar_url,
          provider: 'google'
        }
      } as unknown as User;

      // iOS 테스트 사용자는 데이터베이스 조회하지 않고 직접 AppUser 생성
      try {
        const testAppUser = AppUser.fromDatabase({
          id: fakeUser.id,
          email: fakeUser.email,
          name: fakeUser.user_metadata.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

        return { user: fakeUser, appUser: testAppUser, provider: 'google' };
      } catch (e) {
        console.error('iOS 테스트 사용자 AppUser 생성 실패:', e);
        return { user: fakeUser, appUser: null, provider: 'google' };
      }
    } catch (e) {
      console.error('iOS 테스트 사용자 정보 복구 실패:', e);
    }
  } else if (iosTestUserData && !isDevelopmentEnv) {
    // 프로덕션 환경에서 발견된 테스트 사용자 데이터는 제거
    console.log('프로덕션 환경에서 iOS 테스트 사용자 데이터 제거');
    localStorage.removeItem('ios_test_user');
  }

  if (kakaoUserData) {
    try {
      const kakaoUser = JSON.parse(kakaoUserData);
      console.log('localStorage에서 카카오 사용자 발견:', kakaoUser);

      // 가짜 User 객체 생성
      const fakeUser = {
        id: `kakao_${kakaoUser.id}`,
        email: kakaoUser.email,
        user_metadata: {
          name: kakaoUser.name,
          avatar_url: kakaoUser.avatar_url,
          provider: 'kakao'
        }
      } as unknown as User;

      // 완전한 AppUser 인스턴스 생성을 위해 fromDatabase 사용
      const fakeAppUser = AppUser.fromDatabase({
        id: `kakao_${kakaoUser.id}`,
        email: kakaoUser.email,
        name: kakaoUser.name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);

      // 미들웨어에서 인식할 수 있도록 쿠키 설정
      document.cookie = `kakao_temp_session=${JSON.stringify({
        user_id: `kakao_${kakaoUser.id}`,
        authenticated: true
      })}; path=/; max-age=86400`; // 24시간

      console.log('카카오 임시 세션 생성 완료 - isAuthenticated:', !!fakeUser);
      return { user: fakeUser, appUser: fakeAppUser, provider: 'kakao' };
    } catch (error) {
      console.log('카카오 사용자 정보 파싱 오류:', error);
      localStorage.removeItem('kakao_user');
    }
  }

  return { user: null, appUser: null, provider: null };
};

/**
 * AppUser 로딩 (최대 3회 재시도 포함)
 * 
 * @param authUser - Supabase 인증 사용자
 * @param retryCount - 현재 재시도 횟수
 * @returns Promise<AppUser | null>
 */
// loadAppUser 중복 호출 방지
const loadingUsers = new Set<string>();

export const loadAppUser = async (
  authUser: User, 
  retryCount: number = 0
): Promise<AppUser | null> => {
  const maxRetries = 3;
  
  // 중복 호출 방지
  if (loadingUsers.has(authUser.id)) {
    console.log('⏳ 동일 사용자 로드 이미 진행 중 - 중복 호출 무시');
    return null;
  }
  
  loadingUsers.add(authUser.id);
  
  console.log(`🔄 사용자 정보 로드 시작 (시도 ${retryCount + 1}/${maxRetries + 1}):`, {
    authUserId: authUser.id,
    authUserEmail: authUser.email,
    authUserProvider: authUser.app_metadata?.provider,
    retryCount
  });

  try {
    console.log('🌐 ensureUserExists로 사용자 정보 조회/생성');

    // 🔥 Defensive Programming: ensureUserExists 사용
    const { ensureUserExists } = await import('@/lib/supabase/users');

    const userData = await ensureUserExists(
      authUser.id,
      authUser.email,
      authUser.user_metadata?.name || authUser.user_metadata?.full_name
    );

    if (!userData) {
      console.error('❌ 사용자 정보 조회/생성 실패');

      if (retryCount < maxRetries) {
        console.log(`🔄 재시도 중... (${retryCount + 1}/${maxRetries})`);
        return await loadAppUser(authUser, retryCount + 1);
      } else {
        console.log('❌ 최대 재시도 초과 - 기본 AppUser 생성');
        const fallbackAppUser = AppUser.fromDatabase({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);
        return fallbackAppUser;
      }
    }

    console.log('✅ 💾 데이터베이스에서 사용자 정보 조회 성공!');
    console.log('👤 사용자 정보:', {
      id: userData.id,
      email: userData.email,
      name: userData.name
    });

    const appUser = AppUser.fromDatabase(userData as any);
    console.log('✅ AppUser 인스턴스 생성 완료:', {
      appUserId: appUser.id,
      appUserName: appUser.name,
      appUserEmail: appUser.email
    });

    loadingUsers.delete(authUser.id); // 성공 시 플래그 제거
    return appUser;
  } catch (error) {
    const isAbortError = (error as any)?.name === 'AbortError';
    const isTimeoutError = (error as any)?.message?.includes('timeout');
    const isWebViewTimeout = (error as any)?.message?.includes('WebView query timeout');

    console.error('❌ 사용자 정보 로드 중 오류:', {
      error: error,
      isAbortError,
      isTimeoutError,
      isWebViewTimeout,
      retryCount,
      maxRetries
    });

    if (retryCount < maxRetries && (isAbortError || isTimeoutError || isWebViewTimeout)) {
      console.log(`🔄 오류로 인한 재시도... (${retryCount + 1}/${maxRetries})`);
      // 재시도 시에는 플래그 유지
      return await loadAppUser(authUser, retryCount + 1);
    } else {
      console.log('❌ 재시도 한계 도달 또는 치명적 오류 - 기본 AppUser 생성');
      const fallbackAppUser = AppUser.fromDatabase({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);
      return fallbackAppUser;
    }
  } finally {
    // 처리 완료 또는 최종 실패 시에만 플래그 제거 (재시도 제외)
    if (retryCount >= maxRetries || retryCount === 0) {
      loadingUsers.delete(authUser.id);
    }
  }
};

/**
 * TOKEN_REFRESHED 이벤트에서 사용자 정보 로드
 * 
 * @param session - 새로 고침된 세션
 * @param processingRef - 중복 처리 방지용 ref
 * @returns Promise<AppUser | null>
 */
export const loadAppUserFromSession = async (
  session: Session,
  processingRef: { current: boolean }
): Promise<AppUser | null> => {
  if (!session?.user) {
    console.warn('🔍 세션에 사용자 정보 없음');
    return null;
  }

  // 중복 처리 방지
  if (processingRef.current) {
    console.log('⏳ TOKEN_REFRESHED 이벤트 이미 처리 중 - 중복 호출 무시');
    return null;
  }

  processingRef.current = true;

  const authUser = session.user;
  // TOKEN_REFRESHED 이벤트에서 사용자 정보 로드 시작: ${authUser.id}

  try {
    {
      // 웹/Electron 환경에서는 Supabase 클라이언트와 세션 동기화 수행
      console.log('🔄 TOKEN_REFRESHED 세션을 Supabase 클라이언트에 명시적 동기화 시작...');

      // 1단계: setSession으로 명시적 동기화 (타임아웃 적용)
      console.log('🔄 1단계: setSession으로 명시적 동기화 중...');
      
      const { error: setSessionError } = await setSessionWithTimeout({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      if (setSessionError) {
        console.error('❌ TOKEN_REFRESHED setSession 동기화 실패:', setSessionError);
        return null;
      } else {
        console.log('✅ setSession 동기화 성공 - Supabase 클라이언트와 세션 동기화 완료');
        
        // 동기화 확인
        const { data: { session: currentSession } } = await getSessionWithTimeout(5000);
        console.log('🔍 동기화 확인 결과:', {
          hasCurrentSession: !!currentSession,
          currentUserId: currentSession?.user?.id,
          originalUserId: session.user.id,
          동기화성공: currentSession?.user?.id === session.user.id
        });
      }

      // 2단계: refreshSession으로 완전 동기화 (권장 사항, WebView에서 타임아웃 적용)
      console.log('🔄 2단계: refreshSession으로 완전 동기화 중...');

      const { data: refreshData, error: refreshError } = await refreshSessionWithTimeout(
        session.refresh_token, 
        8000 // 8초 타임아웃
      );

      if (refreshError) {
        console.warn('⚠️ refreshSession 실패, setSession 결과로 계속 진행:', refreshError);
        // refreshSession 실패해도 setSession이 성공했으면 계속 진행
      } else {
        console.log('✅ refreshSession 완료 - 완전 동기화 성공:', {
          refreshedUserId: refreshData.user?.id,
        });
      }

      // 3단계: 최종 세션 확인 (타임아웃 적용)
      console.log('🔄 3단계: 최종 세션 상태 확인 중...');

      const { data: { session: finalSession } } = await getSessionWithTimeout(5000); // 5초 타임아웃

      if (!finalSession || finalSession.user.id !== session.user.id) {
        console.error('❌ 최종 세션 확인 실패 - 동기화되지 않음:', {
          hasFinalSession: !!finalSession,
          finalUserId: finalSession?.user?.id,
          expectedUserId: session.user.id
        });
        return null;
      } else {
        console.log('✅ 최종 세션 확인 성공 - 완전 동기화 완료');
      }
    }

    // 공통: 사용자 정보 조회 및 AppUser 생성 (Defensive Programming 적용)
    try {
      // 🔥 Defensive Programming: ensureUserExists 사용
      const { ensureUserExists } = await import('@/lib/supabase/users');

      const userData = await ensureUserExists(
        authUser.id,
        authUser.email,
        authUser.user_metadata?.name || authUser.user_metadata?.full_name
      );

      if (!userData) {
        console.error('❌ TOKEN_REFRESHED에서 사용자 정보 조회/생성 실패');

        // 사용자 정보 조회/생성 실패 시 기본 AppUser 생성
        const fallbackAppUser = AppUser.fromDatabase({
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any);

        console.log('⚠️ TOKEN_REFRESHED에서 fallback AppUser 생성:', fallbackAppUser.name);
        return fallbackAppUser;
      }

      console.log('✅ 💾 데이터베이스에서 사용자 정보 조회 성공! - TOKEN_REFRESHED 플로우 완료');
      console.log('👤 사용자 정보:', {
        id: userData.id,
        email: userData.email,
        name: userData.name
      });

      const appUser = AppUser.fromDatabase(userData);
      console.log('✅ TOKEN_REFRESHED AppUser 인스턴스 생성 완료:', appUser.name);
      return appUser;
    } catch (syncError) {
      console.error('❌ TOKEN_REFRESHED 사용자 정보 동기화 중 오류:', syncError);
      
      // 동기화 실패 시 기본 AppUser 생성
      const fallbackAppUser = AppUser.fromDatabase({
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any);
      
      console.log('⚠️ 동기화 오류로 인한 fallback AppUser 생성:', fallbackAppUser.name);
      return fallbackAppUser;
    }
  } catch (error) {
    console.error('❌ TOKEN_REFRESHED 이벤트 처리 중 예상치 못한 오류:', error);
    
    // 예상치 못한 오류 시 기본 AppUser 생성
    const fallbackAppUser = AppUser.fromDatabase({
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any);
    
    return fallbackAppUser;
  } finally {
    // TOKEN_REFRESHED 이벤트 처리 완료 - 플래그 해제
    processingRef.current = false;
    console.log('🏁 TOKEN_REFRESHED 이벤트 처리 완료 - 플래그 해제');
  }
};