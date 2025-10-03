// 서버 컴포넌트 / 서버 액션 / 라우트 핸들러 전용 - Next.js 15 표준 패턴
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

// Re-export createServerClient for compatibility
export { createServerClient };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Next.js 15 + Supabase SSR 최신 패턴 - 서버 클라이언트 (cookies만 사용)
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            // 🔑 PKCE OAuth 호환 쿠키 설정 (중요!)
            const cookieOptions = {
              path: '/',
              maxAge: 60 * 60 * 24 * 7, // 7일
              httpOnly: false, // 클라이언트에서도 접근 가능해야 함
              secure: process.env.NODE_ENV === 'production', // 프로덕션에서만 secure
              sameSite: 'lax' as const, // OAuth 리다이렉트 호환
              ...options
            };
            
            console.log(`🍪 [서버 쿠키 설정] ${name}:`, 
              value.length > 100 ? `${value.substring(0, 100)}... (${value.length} chars)` : value
            );
            
            cookieStore.set({ name, value, ...cookieOptions });
          } catch (error) {
            console.error(`❌ [서버 쿠키 설정 실패] ${name}:`, error);
          }
        },
        remove(name: string, options: any) {
          try {
            const cookieOptions = {
              path: '/',
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              ...options,
              maxAge: 0,
              expires: new Date(0)
            };
            
            console.log(`🗑️ [서버 쿠키 삭제] ${name}`);
            cookieStore.set({ name, value: '', ...cookieOptions });
          } catch (error) {
            console.error(`❌ [서버 쿠키 삭제 실패] ${name}:`, error);
          }
        },
      },
    }
  );
}