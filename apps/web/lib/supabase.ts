// 클라이언트 컴포넌트 전용 - Next.js 15 표준 패턴
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Electron 환경 감지 (app:// 프로토콜에서 document.cookie SecurityError 방지)
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// 인메모리 폴백 스토리지 (localStorage도 차단될 경우 대비)
const memoryStore = new Map<string, string>();

// Next.js 15 + Supabase SSR 표준 패턴 - 브라우저 클라이언트 (개선된 쿠키 처리)
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return undefined;
            }

            // Electron: document.cookie 접근 불가 → localStorage → 인메모리 폴백
            if (isElectron) {
              try {
                const value = localStorage.getItem(`supabase_cookie_${name}`);
                return value ?? undefined;
              } catch {
                return memoryStore.get(`supabase_cookie_${name}`) ?? undefined;
              }
            }

            // 브라우저: document.cookie에서 특정 쿠키 추출
            const value = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];

            if (value) {
              return decodeURIComponent(value);
            }
            return undefined;
          } catch (error) {
            console.warn(`⚠️ [클라이언트 쿠키 읽기 실패] ${name}:`, error);
            return undefined;
          }
        },
        set: (name: string, value: string, options: any) => {
          try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return;
            }

            // Electron: localStorage에 저장 → 인메모리 폴백
            if (isElectron) {
              try {
                localStorage.setItem(`supabase_cookie_${name}`, value);
              } catch {
                memoryStore.set(`supabase_cookie_${name}`, value);
              }
              return;
            }

            // 브라우저: document.cookie 사용
            const cookieOptions = {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7일
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              ...options
            };

            let cookieString = `${name}=${encodeURIComponent(value)}`;

            Object.entries(cookieOptions).forEach(([key, val]) => {
              if (val !== undefined && val !== null) {
                if (typeof val === 'boolean') {
                  if (val) cookieString += `; ${key}`;
                } else {
                  cookieString += `; ${key}=${val}`;
                }
              }
            });

            document.cookie = cookieString;
          } catch (error) {
            console.error(`❌ [클라이언트 쿠키 저장 실패] ${name}:`, error);
          }
        },
        remove: (name: string, options: any) => {
          try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return;
            }

            // Electron: localStorage에서 삭제 → 인메모리 폴백
            if (isElectron) {
              try {
                localStorage.removeItem(`supabase_cookie_${name}`);
              } catch {
                memoryStore.delete(`supabase_cookie_${name}`);
              }
              return;
            }

            // 브라우저: document.cookie로 만료 처리
            const cookieOptions = {
              path: '/',
              ...options,
              maxAge: 0,
              expires: new Date(0).toUTCString()
            };

            let cookieString = `${name}=`;

            Object.entries(cookieOptions).forEach(([key, val]) => {
              if (val !== undefined && val !== null) {
                if (typeof val === 'boolean') {
                  if (val) cookieString += `; ${key}`;
                } else {
                  cookieString += `; ${key}=${val}`;
                }
              }
            });

            document.cookie = cookieString;
          } catch (error) {
            console.error(`❌ [클라이언트 쿠키 삭제 실패] ${name}:`, error);
          }
        },
      },
    }
  );
}

// 기본 클라이언트 (호환성용)
export const supabase = createBrowserSupabaseClient();