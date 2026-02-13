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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7일
                httpOnly: false, // 클라이언트에서도 접근 가능해야 함
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' as const,
                ...options,
              });
            });
          } catch (error) {
            // Server Component에서 호출 시 setAll이 실패할 수 있음 (무시 가능)
          }
        },
      },
    }
  );
}