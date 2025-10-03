'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as AppUser } from '@/entities/user/User';
import { AuthContextType } from '@/lib/auth/types';
import {
  loadAppUser,
  loadAppUserFromSession
} from '@/lib/auth/sessionUtils';
import { 
  handleGoogleSignIn, 
  handleKakaoSignIn, 
  clearOAuthSessions 
} from '@/lib/auth/oauthHandlers';
import { useCapacitorAutoTokenRefresh } from '@/lib/auth/useAutoTokenRefresh';

// 환경 감지 (실제 Capacitor 환경에서만 모바일로 감지)
const isMobileEnvironment = (() => {
  if (typeof window === 'undefined') return false;
  
  // 🎯 핵심: 실제 Capacitor 환경에서만 모바일로 감지
  // capacitor:// 프로토콜이 가장 확실한 방법
  const isCapacitorProtocol = window.location.protocol === 'capacitor:';
  const hasCapacitorGlobal = !!(window as any).Capacitor;
  
  // 추가 검증: http/https는 웹 환경
  const isWebProtocol = ['http:', 'https:'].includes(window.location.protocol);
  
  // 웹 환경이면 무조건 웹으로 처리
  if (isWebProtocol) {
    console.log('🌐 웹 프로토콜 감지:', window.location.protocol);
    return false;
  }
  
  // Capacitor 환경이면 모바일로 처리
  if (isCapacitorProtocol && hasCapacitorGlobal) {
    console.log('📱 Capacitor 환경 감지:', window.location.protocol);
    return true;
  }
  
  // 기본값: 웹 환경
  console.log('🌐 기본값: 웹 환경으로 처리');
  return false;
})();

// 최소 인증 상태 타입 정의 (서버에서 사용)
export type AuthState = {
  isAuthenticated: boolean;
  user: { id: string; email: string | null } | null;
};

// 기본값
const defaultContextValue: AuthContextType = {
  user: null,
  appUser: null,
  session: null,
  loading: false, // 하이드레이션 안전성을 위해 초기값을 false로 설정
  signInWithGoogle: async () => {},
  signInWithKakao: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
  isHydrated: false,
};

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// AuthProvider 컴포넌트 - 하이드레이션 안전성 보장
export function AuthProvider({ 
  initialAuth,
  children 
}: { 
  initialAuth?: AuthState;  // 선택적으로 서버에서 초기 상태 주입
  children: React.ReactNode;
}) {
  // 하이드레이션 안전성을 위한 상태 - 서버와 클라이언트 동일한 초기값
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // 서버/클라이언트 모두 false로 시작
  const [isHydrated, setIsHydrated] = useState(false);

  // Capacitor 환경에서 자동 토큰 갱신 활성화
  useCapacitorAutoTokenRefresh();
  
  // 하이드레이션 완료 체크
  useEffect(() => {
    console.log('🚀 AuthContext - 하이드레이션 시작');
    setIsHydrated(true);
    setLoading(true); // 하이드레이션 완료 후에만 loading 활성화
  }, []); // 빈 의존성 배열로 한 번만 실행

  // 초기 세션 확인 - 하이드레이션 완료 후에만 실행 (환경별 분리)
  useEffect(() => {
    if (!isHydrated) return; // 🔑 핵심: 하이드레이션 전에는 실행 안함
    
    let isMounted = true;
    
    const getInitialSession = async () => {
      try {
        console.log(`🔄 초기 세션 확인 시작... (환경: ${isMobileEnvironment ? '모바일' : '웹'})`);
        
        if (isMobileEnvironment) {
          // 🎯 모바일 환경: 네이티브 SDK 클라이언트 인증 방식
          console.log('📱 모바일 환경 - 네이티브 SDK 클라이언트 인증');
          await handleMobileInitialSession();
        } else {
          // 🎯 웹 환경: SSR 서버 인증 + OAuth 콜백 방식
          console.log('🌐 웹 환경 - SSR 서버 인증 + OAuth 콜백');
          await handleWebInitialSession();
        }
        
      } catch (error) {
        console.error('초기 세션 확인 중 오류:', error);
        setSession(null);
        setUser(null);
        setAppUser(null);
      } finally {
        if (isMounted) {
          console.log('초기 세션 확인 완료 - loading 해제');
          setLoading(false);
        }
      }
    };

    // 🎯 모바일 환경 초기 세션 처리 (네이티브 SDK 방식)
    const handleMobileInitialSession = async () => {
      // 모바일 네이티브 SDK 세션 확인
      
      // 1차: Supabase 클라이언트 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session?.user && !error) {
        // 모바일 Supabase 세션 발견: ${session.user.id}
        setSession(session);
        setUser(session.user);
        
        // AppUser 로드
        try {
          const appUser = await loadAppUser(session.user);
          if (appUser) {
            setAppUser(appUser);
            // 모바일 AppUser 로드 완료: ${appUser.name}
          }
        } catch (appUserError) {
          console.warn('모바일 AppUser 로드 실패:', appUserError);
        }
      } else {
        // 2차: Capacitor 저장소에서 백업 세션 확인 (모바일 전용)
        // Supabase 세션 없음 - Capacitor 저장소 확인
        
        // 🔒 모바일 환경 재확인 - 웹에서는 절대 실행되지 않도록
        if (typeof window === 'undefined' || 
            !window.location.protocol.startsWith('capacitor:')) {
          console.log('❌ 웹 환경에서 Capacitor 저장소 접근 시도 차단');
          setSession(null);
          setUser(null);
          setAppUser(null);
          return;
        }
        
        try {
          // 🎯 모바일 환경에서만 Capacitor 모듈 동적 임포트
          const { Preferences } = await import('@capacitor/preferences');
          const { value } = await Preferences.get({ key: 'supabase_auth_session' });
          
          if (value) {
            const storedSession = JSON.parse(value);
            console.log('🔑 Capacitor 저장소에서 백업 세션 발견:', storedSession.user?.id);
            
            // 토큰 만료 확인
            const expiresAt = storedSession.expires_at ? new Date(storedSession.expires_at * 1000) : null;
            const now = new Date();
            
            if (expiresAt && now < expiresAt) {
              console.log('✅ 백업 세션이 유효함 - 세션 복원');
              
              // 세션 상태 복원
              setSession(storedSession);
              setUser(storedSession.user);
              
              // AppUser 로드
              try {
                const appUser = await loadAppUser(storedSession.user);
                if (appUser) {
                  setAppUser(appUser);
                  console.log('✅ 모바일 백업 세션으로 AppUser 로드 완료:', appUser.name);
                }
              } catch (appUserError) {
                console.warn('모바일 백업 AppUser 로드 실패:', appUserError);
              }
              
              return; // 성공적으로 복원됨
            } else {
              console.log('❌ 백업 세션 만료됨');
            }
          }
        } catch (capacitorError) {
          console.warn('모바일 Capacitor 저장소 접근 실패:', capacitorError);
        }
        
        console.log('❌ 모바일 모든 세션 확인 실패 - 비인증 상태');
        setSession(null);
        setUser(null);
        setAppUser(null);
      }
    };

    // 🎯 웹 환경 초기 세션 처리 (SSR + OAuth 콜백 방식)
    const handleWebInitialSession = async () => {
      console.log('🌐 웹 SSR + OAuth 콜백 세션 확인...');
      console.log('📊 initialAuth 상태:', initialAuth);
      
      // 서버에서 초기 인증 상태가 전달된 경우 우선 사용 (SSR 최적화)
      if (initialAuth?.isAuthenticated) {
        console.log('🚀 서버에서 인증된 사용자 정보 사용:', initialAuth.user?.email);
        
        // 서버에서 이미 인증 확인된 경우, 클라이언트 세션 확인 건너뛰기
        const tempUser = {
          id: initialAuth.user!.id,
          email: initialAuth.user!.email,
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: 'authenticated'
        } as any;
        
        setUser(tempUser);
        console.log('✅ 서버 인증 정보로 임시 사용자 설정 완료');
        
        // 비동기로 AppUser 로드
        setTimeout(async () => {
          try {
            console.log('🔍 비동기 AppUser 로드 시작...');
            const { data: { session: actualSession } } = await supabase.auth.getSession();
            
            if (actualSession?.user) {
              setSession(actualSession);
              setUser(actualSession.user);
              
              const appUser = await loadAppUser(actualSession.user);
              if (appUser) {
                setAppUser(appUser);
                console.log('✅ 웹 AppUser 로드 완료:', appUser.name);
              }
            }
          } catch (appUserError) {
            console.warn('웹 비동기 AppUser 로드 실패:', appUserError);
          }
        }, 100);
        
        return; // 서버 인증 정보 사용 완료
      }
      
      // 서버에서 초기 상태가 없는 경우, 클라이언트에서 세션 확인 (OAuth 콜백 후)
      console.log('🔍 웹 클라이언트 세션 확인 중...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          console.log('✅ 웹 세션 확인 성공:', session.user.id);
          setSession(session);
          setUser(session.user);
          
          // AppUser 로드
          try {
            const appUser = await loadAppUser(session.user);
            if (appUser) {
              setAppUser(appUser);
            }
          } catch (appUserError) {
            console.warn('웹 AppUser 로드 실패:', appUserError);
          }
        } else {
          console.log('❌ 웹 클라이언트 세션 없음 - 비인증 상태');
          setSession(null);
          setUser(null);
          setAppUser(null);
        }
      } catch (error) {
        console.error('❌ 웹 세션 확인 실패:', error);
        setSession(null);
        setUser(null);
        setAppUser(null);
      }
    };

    getInitialSession();

    return () => {
      isMounted = false;
    };
  }, [isHydrated, initialAuth]);

  // TOKEN_REFRESHED 이벤트 중복 처리 방지를 위한 플래그
  const processingRef = useRef<boolean>(false);
  
  // 인증 상태 변경 리스너 설정 - 하이드레이션 완료 후에만
  useEffect(() => {
    if (!isHydrated) return; // 🔑 핵심: 하이드레이션 전에는 실행 안함
    
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return; // 컴포넌트가 언마운트되었으면 중단
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        // OAuth 콜백에서 이미 타임라인으로 리다이렉트하므로 여기서는 추가 리다이렉트하지 않음
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('SIGNED_IN 이벤트 발생, 리다이렉트는 OAuth 콜백에서 처리됨');
        }
        
        // TOKEN_REFRESHED 이벤트 처리 (세션 복구 성공)
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          // TOKEN_REFRESHED 이벤트 - 세션 복구 성공: ${session.user.id}
        }
        
        // INITIAL_SESSION이 undefined인 경우는 무시 (초기 세션 확인에서 처리됨)
        if (event === 'INITIAL_SESSION' && !session) {
          console.log('INITIAL_SESSION이 undefined - 저장된 세션 확인 중이므로 무시');
          return;
        }
        
        // 인증 실패나 오류 이벤트 처리 (TOKEN_REFRESHED는 성공이므로 제외)
        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          // 임시 세션이 있을 때는 Supabase 세션 변경으로 덮어쓰지 않음
          const kakaoUserData = localStorage.getItem('kakao_user');
          const iosTestUserData = localStorage.getItem('ios_test_user');
          
          if (!session?.user && (kakaoUserData || iosTestUserData)) {
            console.log('임시 세션 유지 - Supabase 세션 변경 무시');
            setLoading(false);
            return;
          }
          
          // 인증 실패 시에도 loading을 false로 설정
          setSession(null);
          setUser(null);
          setAppUser(null);
          setLoading(false);
          return;
        }
        
        if (session?.user) {
          // 🔥 중요: 이벤트에서 전달받은 세션 직접 사용 (동기화 보장)
          const appUser = await loadAppUserFromSession(session, processingRef);
          if (appUser) {
            setAppUser(appUser);
          }
          // DB 조회 완료 후 세션과 사용자 정보 설정
          setSession(session);
          setUser(session.user);
          setLoading(false); // DB 조회 완료 후 loading 해제
        } else {
          setSession(session);
          setUser(null);
          setAppUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false; // cleanup 시 플래그 설정
      subscription.unsubscribe();
    };
  }, [isHydrated]);

  // Google OAuth 로그인 (환경별 분리)
  const signInWithGoogle = async () => {
    console.log(`[Auth] Starting Google sign in... (환경: ${isMobileEnvironment ? '모바일' : '웹'})`);
    setLoading(true);
    
    try {
      if (isMobileEnvironment) {
        // 🎯 모바일 환경: 네이티브 Google Sign-In SDK
        // 모바일 네이티브 Google Sign-In 시작
        
        // @capgo/capacitor-social-login 사용한 네이티브 인증
        if (typeof window !== 'undefined' && (window as any).Capacitor) {
          const { SocialLogin } = await import('@capgo/capacitor-social-login');
          
          const loginResult = await SocialLogin.login({ 
            provider: 'google',
            options: {
              scopes: ['email', 'profile']
            }
          });
          // 네이티브 Google Sign-In 결과 받음
          
          // 네이티브 로그인 결과에서 토큰 추출 (플러그인 버전에 따라 다를 수 있음)
          const idToken = (loginResult.result as any)?.idToken || 
                         (loginResult.result as any)?.accessToken ||
                         (loginResult as any)?.idToken;
          
          if (idToken) {
            // idToken으로 Supabase 인증
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });
            
            if (error) {
              throw error;
            }
            
            // 모바일 Google 인증 성공: ${data.user?.id}
            // onAuthStateChange에서 상태 업데이트 처리
          } else {
            throw new Error('idToken이 없습니다.');
          }
        } else {
          throw new Error('Capacitor 환경이 아닙니다.');
        }
      } else {
        // 🎯 웹 환경: OAuth 콜백 방식
        console.log('[Auth] 웹 OAuth 콜백 방식 Google Sign-In 시작');
        
        const { error } = await handleGoogleSignIn();
        
        if (error) {
          throw error;
        }
        
        console.log('[Auth] 웹 Google OAuth 리다이렉트 시작');
        // 웹에서는 리다이렉트 발생하므로 여기서 loading 해제하지 않음
      }
      
    } catch (error) {
      console.error('[Auth] Google sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Google 로그인 중 알 수 없는 오류가 발생했습니다.';
      alert(`Google 로그인 오류: ${errorMessage}`);
      setLoading(false);
    }
  };

  // Kakao OAuth 로그인
  const signInWithKakao = async () => {
    console.log('[Auth] Starting Kakao sign in...');
    setLoading(true);
    
    try {
      const { error } = await handleKakaoSignIn();
      
      if (error) {
        console.error('[Auth] Kakao sign in error:', error);
        alert(`카카오 로그인 오류: ${error.message}`);
        setLoading(false);
        return;
      }
      
      console.log('[Auth] Kakao sign in completed successfully');
      // 웹에서는 리다이렉트 발생
      
    } catch (error) {
      console.error('[Auth] Kakao sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인 중 알 수 없는 오류가 발생했습니다.';
      alert(`카카오 로그인 오류: ${errorMessage}`);
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    console.log('[Auth] Starting sign out...');
    setLoading(true);
    
    try {
      // Supabase 로그아웃 (타임아웃 포함)
      console.log('[Auth] Signing out from Supabase...');
      try {
        const signOutPromise = supabase.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Supabase signOut timeout')), 2000)
        );
        
        const result = await Promise.race([signOutPromise, timeoutPromise]);
        const { error } = result as any;
        
        if (error) {
          console.warn('[Auth] Supabase sign out error (continuing):', error);
        } else {
          console.log('[Auth] Supabase sign out completed');
        }
      } catch (supabaseError) {
        console.warn('[Auth] Supabase sign out failed (continuing):', supabaseError);
      }

      // OAuth 세션 정리
      await clearOAuthSessions();
      
      // localStorage 정리
      console.log('[Auth] Clearing localStorage...');
      const localStorageKeys = [
        'kakao_user',
        'ios_test_user',
        'supabase.auth.token',
        'sb-simbmdvtiukdbjxeepic-auth-token'
      ];
      
      localStorageKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`[Auth] localStorage key removed: ${key}`);
        } catch (e) {
          console.warn(`[Auth] Failed to remove localStorage key: ${key}`, e);
        }
      });
      
      // 쿠키 정리
      try {
        document.cookie = 'kakao_temp_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'supabase-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        console.log('[Auth] Cookies cleared');
      } catch (cookieError) {
        console.warn('[Auth] Cookie clearing failed:', cookieError);
      }

    } catch (globalError) {
      console.error('[Auth] Sign out error:', globalError);
    } finally {
      // 상태 초기화
      setUser(null);
      setAppUser(null);
      setSession(null);
      setLoading(false);
      
      console.log('[Auth] Sign out completed, redirecting to login...');
      
      // 로그인 페이지로 리다이렉트
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
  };

  // 컨텍스트 값
  const contextValue: AuthContextType = {
    user,
    appUser,
    session,
    loading,
    signInWithGoogle,
    signInWithKakao,
    signOut,
    isAuthenticated: !!user,
    isHydrated,
  };

  // 하이드레이션 완료 전에는 로딩 표시
  if (loading || !isHydrated) {
    return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth 커스텀 훅
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }
  
  return context;
}

// 인증 상태 확인을 위한 유틸리티 훅
export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // 미인증 상태일 때 로그인 페이지로 리다이렉트
      window.location.href = '/login';
    }
  }, [isAuthenticated, loading]);
  
  return { isAuthenticated, loading };
}