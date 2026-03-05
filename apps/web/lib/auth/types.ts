/**
 * Authentication Types
 * 
 * 인증 관련 모든 타입 정의를 포함합니다.
 * AuthContext에서 사용되는 핵심 인터페이스들을 정의합니다.
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { User as AppUser } from '@/entities/user/User';

/**
 * 인증 컨텍스트 타입 정의
 * 
 * AuthContext에서 제공하는 모든 상태와 메서드를 정의합니다.
 */
export interface AuthContextType {
  // 인증 상태
  user: User | null;
  appUser: AppUser | null;
  session: Session | null;
  loading: boolean;
  
  // 인증 메서드
  signInWithGoogle: () => Promise<void>;
  signInWithTestAccount: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  
  // 유틸리티
  isAuthenticated: boolean;
  isHydrated: boolean;
}

/**
 * AuthProvider 컴포넌트의 Props 타입 정의
 */
export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * OAuth 관련 타입 정의
 */

/**
 * 지원되는 OAuth 제공자
 */
export type OAuthProvider = 'google';

/**
 * OAuth 핸들러 함수의 반환 타입
 */
export interface OAuthResult {
  error: AuthError | null;
}

/**
 * OAuth 핸들러 인터페이스
 */
export interface OAuthHandlers {
  google: () => Promise<OAuthResult>;
}