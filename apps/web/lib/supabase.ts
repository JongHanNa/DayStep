// 클라이언트 컴포넌트 전용 - Next.js 15 표준 패턴
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Electron 환경 감지 (app:// 프로토콜에서 document.cookie SecurityError 방지)
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// 인메모리 폴백 스토리지 (localStorage도 차단될 경우 대비)
const memoryStore = new Map<string, string>();

/**
 * 쿠키 문자열을 설정하는 헬퍼 함수
 */
function buildCookieString(name: string, value: string, options: Record<string, any> = {}): string {
  let cookieString = `${name}=${encodeURIComponent(value)}`;

  Object.entries(options).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      if (typeof val === 'boolean') {
        if (val) cookieString += `; ${key}`;
      } else {
        cookieString += `; ${key}=${val}`;
      }
    }
  });

  return cookieString;
}

// Next.js 15 + Supabase SSR 표준 패턴 - 브라우저 클라이언트 (getAll/setAll API)
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return [];
            }

            // Electron: localStorage에서 모든 supabase 쿠키 수집
            if (isElectron) {
              const cookies: { name: string; value: string }[] = [];
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key?.startsWith('supabase_cookie_')) {
                    cookies.push({
                      name: key.replace('supabase_cookie_', ''),
                      value: localStorage.getItem(key) || ''
                    });
                  }
                }
              } catch {
                // localStorage 접근 실패 시 인메모리 폴백
                memoryStore.forEach((value, key) => {
                  if (key.startsWith('supabase_cookie_')) {
                    cookies.push({
                      name: key.replace('supabase_cookie_', ''),
                      value
                    });
                  }
                });
              }
              return cookies;
            }

            // 브라우저: document.cookie 파싱 (indexOf로 = 포함 값 안전 처리)
            return document.cookie
              .split('; ')
              .filter(Boolean)
              .map(cookie => {
                const eqIndex = cookie.indexOf('=');
                if (eqIndex === -1) return { name: cookie, value: '' };
                const name = cookie.substring(0, eqIndex);
                const value = decodeURIComponent(cookie.substring(eqIndex + 1));
                return { name, value };
              });
          } catch (error) {
            console.warn('⚠️ [클라이언트 쿠키 읽기 실패]:', error);
            return [];
          }
        },
        setAll(cookiesToSet) {
          try {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return;
            }

            cookiesToSet.forEach(({ name, value, options }) => {
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

              document.cookie = buildCookieString(name, value, cookieOptions);
            });
          } catch (error) {
            console.error('❌ [클라이언트 쿠키 저장 실패]:', error);
          }
        },
      },
    }
  );
}

// 기본 클라이언트 (호환성용)
export const supabase = createBrowserSupabaseClient();
