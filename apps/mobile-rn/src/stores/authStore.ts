/**
 * Auth Store (Zustand + MMKV persist)
 * 웹앱 authStore 패턴의 RN 네이티브 구현
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
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

          // 1. 기존 세션 복원
          const {data: {session}, error} = await supabase.auth.getSession();
          if (error) throw error;

          if (session) {
            set({
              user: session.user,
              session,
              isAuthenticated: true,
            });
            setupTokenRefresh(session.expires_at);
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
                  break;
              }
            },
          );
        } catch (err: any) {
          console.error('[Auth] Initialize error:', err);
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
