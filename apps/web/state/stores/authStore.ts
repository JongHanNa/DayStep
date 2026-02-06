import { User, Session } from "@supabase/supabase-js";
import { User as AppUser } from "@/entities/user/User";
import { supabase } from "@/lib/supabase";
import { updateUserWithJWT } from "@/lib/supabase/users";
import {
  createStore,
  loadingHelpers,
  logStoreAction,
} from "../utils/storeUtils";
import type { BaseStoreState, LoadingState } from "../types";

/**
 * 인증 스토어 상태 타입 정의
 */
interface AuthStoreState extends BaseStoreState {
  // 인증 상태
  user: User | null;
  appUser: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean;

  // UI 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 세션 관리
  tokenRefreshTimer: NodeJS.Timeout | null;
  sessionExpiresAt: Date | null;

  // 액션들
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithKakao: () => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: { name?: string }) => Promise<boolean>;

  // 내부 헬퍼 메서드
  setAuthState: (
    user: User | null,
    session: Session | null,
    appUser?: AppUser | null
  ) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // 스토어 초기화 및 정리
  reset: () => void;
}

/**
 * 인증 스토어 생성
 */
export const useAuthStore = createStore<AuthStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    user: null,
    appUser: null,
    session: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    lastUpdated: null,
    tokenRefreshTimer: null,
    sessionExpiresAt: null,

    /**
     * 인증 시스템 초기화
     */
    initialize: async () => {
      logStoreAction("AuthStore", "initialize");

      set((state: AuthStoreState) => {
        state.loading = true;
        state.error = null;
      });

      try {
        // 현재 세션 확인
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (session) {
          await get().loadAppUser(session.user);
          get().setAuthState(session.user, session);
          get().setupTokenRefresh(session);
        }

        // 인증 상태 변경 리스너 설정
        supabase.auth.onAuthStateChange(async (event, session) => {
          logStoreAction("AuthStore", "onAuthStateChange", {
            event,
            userId: session?.user?.id,
          });

          if (event === "SIGNED_IN" && session) {
            await get().loadAppUser(session.user);
            get().setAuthState(session.user, session);
            get().setupTokenRefresh(session);
          } else if (event === "SIGNED_OUT") {
            get().setAuthState(null, null, null);
            get().clearTokenRefresh();
          } else if (event === "TOKEN_REFRESHED" && session) {
            get().setAuthState(session.user, session);
            get().setupTokenRefresh(session);
          }
        });

        set((state: AuthStoreState) => {
          state.initialized = true;
          state.loading = false;
        });
      } catch (error) {
        console.error("인증 초기화 오류:", error);
        set((state: AuthStoreState) => {
          state.loading = false;
          state.error =
            error instanceof Error
              ? error.message
              : "인증 초기화에 실패했습니다.";
          state.initialized = true;
        });
      }
    },

    /**
     * Google OAuth 로그인
     */
    signInWithGoogle: async () => {
      logStoreAction("AuthStore", "signInWithGoogle");

      set((state: AuthStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          throw error;
        }

        set((state: AuthStoreState) => {
          loadingHelpers.setSuccess(state);
        });

        return true;
      } catch (error) {
        console.error("Google 로그인 오류:", error);
        set((state: AuthStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error
              ? error.message
              : "Google 로그인에 실패했습니다."
          );
        });
        return false;
      }
    },

    /**
     * Kakao OAuth 로그인 (추후 구현)
     */
    signInWithKakao: async () => {
      logStoreAction("AuthStore", "signInWithKakao");

      set((state: AuthStoreState) => {
        loadingHelpers.setError(state, "Kakao 로그인은 현재 개발 중입니다.");
      });

      return false;
    },

    /**
     * 로그아웃
     */
    signOut: async () => {
      logStoreAction("AuthStore", "signOut");

      set((state: AuthStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        get().setAuthState(null, null, null);
        get().clearTokenRefresh();

        set((state: AuthStoreState) => {
          loadingHelpers.setSuccess(state);
        });
      } catch (error) {
        console.error("로그아웃 오류:", error);
        set((state: AuthStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : "로그아웃에 실패했습니다."
          );
        });
      }
    },

    /**
     * 세션 갱신
     */
    refreshSession: async () => {
      logStoreAction("AuthStore", "refreshSession");

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession();

        if (error) {
          throw error;
        }

        if (session) {
          get().setAuthState(session.user, session);
          get().setupTokenRefresh(session);
        }
      } catch (error) {
        console.error("세션 갱신 오류:", error);
        get().signOut(); // 갱신 실패 시 로그아웃
      }
    },

    /**
     * 사용자 프로필 업데이트
     */
    updateProfile: async (data: { name?: string }) => {
      logStoreAction("AuthStore", "updateProfile", data);

      const { user, appUser } = get();
      if (!user || !appUser) {
        return false;
      }

      try {
        // JWT 방식으로 데이터베이스 업데이트 (Capacitor/웹 공통)
        await updateUserWithJWT(user.id, { name: data.name });

        // 로컬 상태 업데이트
        const updatedAppUser = appUser.update(data.name);

        set((state: AuthStoreState) => {
          state.appUser = updatedAppUser;
        });

        return true;
      } catch (error) {
        console.error("프로필 업데이트 오류:", error);
        set((state: AuthStoreState) => {
          state.error =
            error instanceof Error
              ? error.message
              : "프로필 업데이트에 실패했습니다.";
        });
        return false;
      }
    },

    /**
     * 앱 사용자 정보 로드 (Defensive Programming 적용)
     */
    loadAppUser: async (authUser: User) => {
      try {
        // 🔥 Defensive Programming: ensureUserExists 사용
        const { ensureUserExists } = await import('@/lib/supabase/users');

        const userData = await ensureUserExists(
          authUser.id,
          authUser.email,
          authUser.user_metadata?.name || authUser.user_metadata?.full_name
        );

        if (userData) {
          const appUserEntity = AppUser.fromDatabase(userData);
          set((state: AuthStoreState) => {
            state.appUser = appUserEntity;
          });
        } else {
          console.error('⚠️ 사용자 생성 실패 - fallback AppUser 미생성');
        }
      } catch (error) {
        console.error("앱 사용자 로드 오류:", error);
      }
    },

    /**
     * 토큰 갱신 타이머 설정
     */
    setupTokenRefresh: (session: Session) => {
      get().clearTokenRefresh();

      const expiresAt = new Date(session.expires_at! * 1000);
      const refreshTime = expiresAt.getTime() - Date.now() - 5 * 60 * 1000; // 5분 전에 갱신

      if (refreshTime > 0) {
        const timer = setTimeout(() => {
          get().refreshSession();
        }, refreshTime);

        set((state: AuthStoreState) => {
          state.tokenRefreshTimer = timer;
          state.sessionExpiresAt = expiresAt;
        });
      }
    },

    /**
     * 토큰 갱신 타이머 정리
     */
    clearTokenRefresh: () => {
      const { tokenRefreshTimer } = get();
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
        set((state: AuthStoreState) => {
          state.tokenRefreshTimer = null;
          state.sessionExpiresAt = null;
        });
      }
    },

    /**
     * 인증 상태 설정
     */
    setAuthState: (
      user: User | null,
      session: Session | null,
      appUser?: AppUser | null
    ) => {
      set((state: AuthStoreState) => {
        state.user = user;
        state.session = session;
        state.isAuthenticated = !!user;

        if (appUser !== undefined) {
          state.appUser = appUser;
        }
      });
    },

    /**
     * 에러 상태 설정
     */
    setError: (error: string | null) => {
      set((state: AuthStoreState) => {
        state.error = error;
      });
    },

    /**
     * 로딩 상태 설정
     */
    setLoading: (loading: boolean) => {
      set((state: AuthStoreState) => {
        state.loading = loading;
      });
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      get().clearTokenRefresh();

      set((state: AuthStoreState) => {
        state.user = null;
        state.appUser = null;
        state.session = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.tokenRefreshTimer = null;
        state.sessionExpiresAt = null;
      });
    },
  }),
  {
    name: "auth-store",
    devtools: true,
    persist: {
      name: "daystep-auth",
      version: 1,
      // 민감한 정보는 제외하고 필요한 정보만 저장
      blacklist: ["session", "tokenRefreshTimer", "loading", "error"],
    },
  }
);
