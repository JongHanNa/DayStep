// 서버 컴포넌트에서 초기 인증 상태를 확인하는 유틸리티
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AuthState } from '@/app/context/AuthContext';

/**
 * 서버에서 초기 인증 상태를 확인하고 클라이언트에 전달
 * SSR 최적화를 위해 서버에서 미리 세션을 확인하여 클라이언트 지연 시간 제거
 */
export async function getServerAuthState(): Promise<AuthState> {
  try {
    console.log('🖥️ 서버에서 초기 세션 확인 중...');
    
    const supabase = await createServerSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('서버 세션 확인 오류:', error);
      return {
        isAuthenticated: false,
        user: null
      };
    }
    
    if (session?.user) {
      console.log('✅ 서버에서 세션 발견:', {
        userId: session.user.id,
        email: session.user.email
      });
      
      return {
        isAuthenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email ?? null
        }
      };
    }
    
    console.log('❌ 서버에서 세션 없음');
    return {
      isAuthenticated: false,
      user: null
    };
    
  } catch (error) {
    console.error('서버 세션 확인 중 오류:', error);
    return {
      isAuthenticated: false,
      user: null
    };
  }
}