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
import { useAuthStore } from '@/state/stores/authStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useSettingsSync } from '@/hooks/useSettingsSync';

// 환경 감지 (Electron / 웹 분리)
const isElectronEnvironment = (() => {
  if (typeof window === 'undefined') return false;
  if ((window as any).electronAPI) {
    console.log('🖥️ Electron 환경 감지');
    return true;
  }
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
  signInWithTestAccount: async () => {},
  signInWithEmail: async () => {},
  signOut: async () => {},
  isAuthenticated: false,
  isHydrated: false,
};

// 컨텍스트 생성
const AuthContext = createContext<AuthContextType>(defaultContextValue);

// AuthProvider 컴포넌트 - 하이드레이션 안전성 보장
export function AuthProvider({
  children
}: {
  children: React.ReactNode;
}) {
  // 하이드레이션 안전성을 위한 상태 - 서버와 클라이언트 동일한 초기값
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // 🔑 서버/클라이언트 모두 true로 시작 (Hydration 안전)
  const [isHydrated, setIsHydrated] = useState(false);

  // 설정 DB 동기화 (로그인 시 DB에서 설정 로드, 설정 변경 시 DB에 저장)
  useSettingsSync(user?.id);

  // 🛡️ Loading 안전장치: 15초 이상 loading=true면 강제 해제 (무한 로딩 방지)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (loading) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[Auth] 로딩 타임아웃 (15초) - 강제 해제');
        setLoading(false);
      }, 15000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading]);

  // 하이드레이션 완료 체크
  useEffect(() => {
    console.log('🚀 AuthContext - 하이드레이션 시작');
    setIsHydrated(true);
  }, []);

  // 초기 세션 확인 - 하이드레이션 완료 후에만 실행 (환경별 분리)
  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;

    const getInitialSession = async () => {
      try {
        const envLabel = isElectronEnvironment ? 'Electron' : '웹';
        console.log(`🔄 초기 세션 확인 시작... (환경: ${envLabel})`);

        if (isElectronEnvironment) {
          // 🖥️ Electron 환경: electron-store 기반 세션 복원
          console.log('🖥️ Electron 환경 - electron-store 세션 복원');
          await handleElectronInitialSession();
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

    // 🖥️ Electron 환경 초기 세션 처리 (electron-store 방식)
    const handleElectronInitialSession = async () => {
      console.log('🖥️ Electron electron-store 세션 확인...');

      try {
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.store?.get) {
          console.log('❌ electronAPI.store 사용 불가 - 비인증 상태');
          setSession(null);
          setUser(null);
          setAppUser(null);
          return;
        }

        const storedValue = await electronAPI.store.get('supabase_auth_session');

        if (!storedValue) {
          console.log('❌ Electron 저장소에 세션 없음 - 비인증 상태');
          setSession(null);
          setUser(null);
          setAppUser(null);
          return;
        }

        const storedSession = typeof storedValue === 'string' ? JSON.parse(storedValue) : storedValue;

        // 토큰 만료 확인
        const expiresAt = storedSession.expires_at ? new Date(storedSession.expires_at * 1000) : null;
        const now = new Date();

        if (expiresAt && now >= expiresAt) {
          console.log('❌ Electron 세션 만료됨 - 비인증 상태');
          setSession(null);
          setUser(null);
          setAppUser(null);
          return;
        }

        console.log('✅ Electron 세션 유효 - setSession 시작');

        // Supabase에 세션 설정
        const { data, error } = await supabase.auth.setSession({
          access_token: storedSession.access_token,
          refresh_token: storedSession.refresh_token,
        });

        if (error) {
          console.warn('❌ Electron Supabase setSession 실패:', error);
          setSession(null);
          setUser(null);
          setAppUser(null);
          return;
        }

        if (data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);

          // AppUser 로드
          try {
            const appUserData = await loadAppUser(data.session.user);
            if (appUserData) {
              setAppUser(appUserData);
              console.log('✅ Electron AppUser 로드 완료:', appUserData.name);
            }
          } catch (appUserError) {
            console.warn('Electron AppUser 로드 실패:', appUserError);
          }
        }
      } catch (error) {
        console.error('❌ Electron 세션 복원 실패:', error);
        setSession(null);
        setUser(null);
        setAppUser(null);
      }
    };

    // 🎯 웹 환경 초기 세션 처리 (클라이언트 사이드 세션 확인)
    const handleWebInitialSession = async () => {
      console.log('🔍 웹 클라이언트 세션 확인 중...');

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && !error) {
          console.log('✅ 웹 세션 확인 성공:', session.user.id);
          setSession(session);
          setUser(session.user);

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
  }, [isHydrated]);

  // TOKEN_REFRESHED 이벤트 중복 처리 방지를 위한 플래그
  const processingRef = useRef<boolean>(false);
  // appUser를 ref로도 추적 (onAuthStateChange 클로저에서 최신 값 참조용)
  const appUserRef = useRef<AppUser | null>(null);
  appUserRef.current = appUser;

  // 인증 상태 변경 리스너 설정 - 하이드레이션 완료 후에만
  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('SIGNED_IN 이벤트 발생, 리다이렉트는 OAuth 콜백에서 처리됨');
        }

        if (event === 'INITIAL_SESSION' && !session) {
          console.log('INITIAL_SESSION이 undefined - 저장된 세션 확인 중이므로 무시');
          return;
        }

        if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          setSession(null);
          setUser(null);
          setAppUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          // 세션과 유저만 즉시 설정 (getInitialSession과 동시 getSession() 경합 방지)
          setSession(session);
          setUser(session.user);
          setLoading(false);

          // appUser가 아직 없으면 비동기로 로드 (경합하지 않도록 별도 처리)
          if (!appUserRef.current) {
            loadAppUserFromSession(session, processingRef).then(loaded => {
              if (loaded) setAppUser(loaded);
            }).catch((err) => {
              console.warn('[Auth] onAuthStateChange appUser 로드 실패:', err);
            });
          }
        } else {
          setSession(session);
          setUser(null);
          setAppUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isHydrated]);

  // Google OAuth 로그인
  const signInWithGoogle = async () => {
    const envLabel = isElectronEnvironment ? 'Electron' : '웹';
    console.log(`[Auth] Starting Google sign in... (환경: ${envLabel})`);
    setLoading(true);

    try {
      const { error } = await handleGoogleSignIn();
      if (error) throw error;
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
    } catch (error) {
      console.error('[Auth] Kakao sign in failed:', error);
      const errorMessage = error instanceof Error ? error.message : '카카오 로그인 중 알 수 없는 오류가 발생했습니다.';
      alert(`카카오 로그인 오류: ${errorMessage}`);
      setLoading(false);
    }
  };

  // 테스트 계정 로그인 (개발 환경 전용)
  const signInWithTestAccount = async () => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment) {
      console.warn('[Auth] 테스트 계정 로그인은 개발 환경에서만 사용 가능합니다.');
      return;
    }

    const email = process.env.NEXT_PUBLIC_TEST_ACCOUNT_EMAIL;
    const password = process.env.NEXT_PUBLIC_TEST_ACCOUNT_PASSWORD;

    if (!email || !password) {
      console.error('[Auth] 테스트 계정 환경 변수가 설정되지 않았습니다.');
      alert('테스트 계정 정보가 없습니다. .env.development 파일을 확인하세요.');
      return;
    }

    console.log('[Auth] 테스트 계정 로그인 시작:', email);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('[Auth] 테스트 계정 로그인 성공:', data.user?.id);
      window.location.href = '/';

    } catch (error) {
      console.error('[Auth] 테스트 계정 로그인 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '테스트 계정 로그인 중 오류가 발생했습니다.';
      alert(`테스트 계정 로그인 오류: ${errorMessage}`);
      setLoading(false);
    }
  };

  // 이메일/비밀번호 로그인 (데모 계정용)
  const signInWithEmail = async (email: string, password: string) => {
    console.log('[Auth] 이메일/비밀번호 로그인 시작:', email);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      console.log('[Auth] 이메일/비밀번호 로그인 성공:', data.user?.id);
      window.location.href = '/';

    } catch (error) {
      console.error('[Auth] 이메일/비밀번호 로그인 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
      alert(`로그인 오류: ${errorMessage}`);
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

      // ✅ 모든 Zustand 스토어 초기화
      console.log('[Auth] Clearing Zustand stores...');
      useTodoStore.getState().clearTodos();
      console.log('[Auth] Stores cleared');

    } catch (globalError) {
      console.error('[Auth] Sign out error:', globalError);
    } finally {
      // 상태 초기화
      setUser(null);
      useAuthStore.setState({ user: null });
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
    signInWithTestAccount,
    signInWithEmail,
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
      window.location.href = '/login';
    }
  }, [isAuthenticated, loading]);

  return { isAuthenticated, loading };
}
