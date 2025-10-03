// 클라이언트 컴포넌트 전용 - Next.js 15 표준 패턴
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Next.js 15 + Supabase SSR 표준 패턴 - 브라우저 클라이언트 (개선된 쿠키 처리)
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    supabaseUrl, 
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          try {
            // 🔑 중요: 브라우저 환경에서만 document 접근
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              // 서버 사이드에서는 undefined 반환 (SSR 안전성)
              return undefined;
            }
            
            // document.cookie에서 특정 쿠키 추출
            const value = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${name}=`))
              ?.split('=')[1];
            
            if (value) {
              // console.log(`🍪 [클라이언트 쿠키 읽기] ${name}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
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
            // 🔑 중요: 브라우저 환경에서만 document 접근
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              // 서버 사이드에서는 쿠키 설정 불가 (SSR 안전성)
              return;
            }
            
            const cookieOptions = {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7일
              sameSite: 'lax', // 🔑 OAuth 리다이렉트 호환 (서버와 동일)
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
            // console.log(`🍪 [클라이언트 쿠키 저장] ${name}:`, value.length > 100 ? `${value.substring(0, 100)}... (${value.length} chars)` : value);
          } catch (error) {
            console.error(`❌ [클라이언트 쿠키 저장 실패] ${name}:`, error);
          }
        },
        remove: (name: string, options: any) => {
          try {
            // 🔑 중요: 브라우저 환경에서만 document 접근
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              // 서버 사이드에서는 쿠키 삭제 불가 (SSR 안전성)
              return;
            }
            
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
            // console.log(`🗑️ [클라이언트 쿠키 삭제] ${name}`);
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