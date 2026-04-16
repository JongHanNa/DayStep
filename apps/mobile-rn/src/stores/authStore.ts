/**
 * Auth Store (Zustand + MMKV persist)
 * 웹앱 authStore 패턴의 RN 네이티브 구현
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {NativeModules, Platform} from 'react-native';
import Config from 'react-native-config';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage, sessionStorage, storage} from '@/lib/mmkv';
import type {Session, User, AuthChangeEvent} from '@supabase/supabase-js';

interface AuthState {
  // 인증 상태
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;

  // UI 상태
  loading: boolean;
  initializing: boolean;
  error: string | null;

  // 액션
  initialize: () => Promise<void>;
  signInWithIdToken: (provider: 'google' | 'apple', idToken: string, nonce?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

// 토큰 리프레시 타이머 (스토어 외부에서 관리)
let tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let authListener: {data: {subscription: {unsubscribe: () => void}}} | null = null;

function setupTokenRefresh(expiresAt?: number) {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }

  if (!expiresAt) return;

  // 만료 5분 전에 갱신
  const refreshAt = expiresAt * 1000 - Date.now() - 5 * 60 * 1000;
  if (refreshAt <= 0) {
    // 이미 만료 임박 → 즉시 갱신
    supabase.auth.refreshSession();
    return;
  }

  tokenRefreshTimer = setTimeout(async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (err) {
      console.warn('[Auth] Token refresh failed:', err);
    }
  }, refreshAt);
}

/** Share Extension에 인증 정보 동기화 (iOS App Group UserDefaults) */
function syncAuthToExtension(session: Session | null) {
  if (Platform.OS !== 'ios' || !session?.user?.id || !session?.access_token) return;
  const mod = NativeModules.DayStepShareModule;
  if (!mod?.setAuthForExtension) return;
  mod.setAuthForExtension(
    session.user.id,
    session.access_token,
    Config.SUPABASE_URL ?? '',
    Config.SUPABASE_ANON_KEY ?? '',
  ).catch(() => {});
}

function clearAuthFromExtension() {
  if (Platform.OS !== 'ios') return;
  const mod = NativeModules.DayStepShareModule;
  if (!mod?.clearAuthForExtension) return;
  mod.clearAuthForExtension().catch(() => {});
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      loading: false,
      initializing: true,
      error: null,

      initialize: async () => {
        try {
          set({initializing: true, error: null});

          // UI Test 모드: AppDelegate에서 --uitesting 플래그 감지 시 MMKV에 저장
          const isUITestMode = storage.getBoolean('uitest_mode') === true;
          if (isUITestMode) {
            storage.remove('uitest_mode'); // 일회용 플래그 삭제
            storage.set('uitest_active', true); // 앱 전역 참조용 (모달 억제 등)
            // 마케팅 데모 계정으로 실제 로그인 (DB 데이터 로드를 위해)
            try {
              const {data, error} = await supabase.auth.signInWithPassword({
                email: 'demo@daystep.app',
                password: 'DayStep2026!',
              });
              if (data?.session) {
                set({user: data.session.user, session: data.session, isAuthenticated: true, initializing: false});
                return;
              }
              console.warn('[Auth] UITest signIn failed:', error?.message);
            } catch (e) {
              console.warn('[Auth] UITest signIn error:', e);
            }
            // 로그인 실패 시 기존 방식 폴백
            set({isAuthenticated: true, initializing: false});
            return;
          }

          // 1. 기존 세션 복원 (10초 타임아웃: 만료 세션의 refreshSession hang 방지)
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Auth init timeout (10s)')), 10_000),
          );

          const {data: {session}, error} = await Promise.race([
            sessionPromise,
            timeoutPromise,
          ]);
          if (error) throw error;

          if (session) {
            set({
              user: session.user,
              session,
              isAuthenticated: true,
            });
            setupTokenRefresh(session.expires_at);
            // Share Extension에 인증 정보 동기화 (앱 시작 시 기존 세션)
            syncAuthToExtension(session);
          }

          // 2. 인증 상태 변경 리스너
          if (authListener) {
            authListener.data.subscription.unsubscribe();
          }

          authListener = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, newSession: Session | null) => {
              const currentState = get();

              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                  set({
                    user: newSession?.user ?? null,
                    session: newSession,
                    isAuthenticated: !!newSession,
                    error: null,
                  });
                  if (newSession?.expires_at) {
                    setupTokenRefresh(newSession.expires_at);
                  }
                  // Share Extension에 인증 정보 동기화 (iOS)
                  syncAuthToExtension(newSession);
                  break;

                case 'SIGNED_OUT':
                  set({
                    user: null,
                    session: null,
                    isAuthenticated: false,
                  });
                  if (tokenRefreshTimer) {
                    clearTimeout(tokenRefreshTimer);
                    tokenRefreshTimer = null;
                  }
                  // Share Extension 인증 정보 삭제
                  clearAuthFromExtension();
                  break;
              }
            },
          );
        } catch (err: any) {
          console.error('[Auth] Initialize error:', err);
          // 타임아웃 시 stale 세션 초기화 → 다음 실행에서 즉시 getSession null 반환
          if (err.message?.includes('timeout')) {
            try {
              sessionStorage.clearAll();
            } catch {}
          }
          set({error: err.message ?? 'Failed to initialize auth'});
        } finally {
          set({initializing: false});
        }
      },

      signInWithIdToken: async (provider, idToken, nonce) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase.auth.signInWithIdToken({
            provider,
            token: idToken,
            nonce,
          });

          if (error) throw error;

          set({
            user: data.user,
            session: data.session,
            isAuthenticated: true,
          });

          if (data.session?.expires_at) {
            setupTokenRefresh(data.session.expires_at);
          }

          return true;
        } catch (err: any) {
          console.error(`[Auth] ${provider} sign-in error:`, err);
          set({error: err.message ?? `${provider} sign-in failed`});
          return false;
        } finally {
          set({loading: false});
        }
      },

      signOut: async () => {
        try {
          set({loading: true, error: null});
          await supabase.auth.signOut();
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          });
          if (tokenRefreshTimer) {
            clearTimeout(tokenRefreshTimer);
            tokenRefreshTimer = null;
          }
        } catch (err: any) {
          console.error('[Auth] Sign-out error:', err);
          set({error: err.message ?? 'Sign-out failed'});
        } finally {
          set({loading: false});
        }
      },

      refreshSession: async () => {
        try {
          const {data, error} = await supabase.auth.refreshSession();
          if (error) throw error;
          if (data.session) {
            set({
              session: data.session,
              user: data.session.user,
            });
            setupTokenRefresh(data.session.expires_at);
          }
        } catch (err: any) {
          console.error('[Auth] Refresh error:', err);
          // 리프레시 실패 → 로그아웃
          get().signOut();
        }
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        // session과 user는 Supabase SDK가 MMKV에 직접 관리
      }),
    },
  ),
);
