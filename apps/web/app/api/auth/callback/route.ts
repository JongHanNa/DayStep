import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// 🔑 핵심: OAuth 콜백은 동적 처리가 필요함!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * OAuth 콜백 API 라우트
 * Google OAuth 프로바이더에서 인증 완료 후 콜백 처리
 */
export async function GET(request: NextRequest) {
  console.log('🔧 [서버 콜백] OAuth 콜백 처리 시작');
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    console.log('🔧 [서버 콜백] URL 파라미터:', {
      fullUrl: request.url,
      hasCode: !!code,
      codeLength: code?.length
    });

    if (!code) {
      console.error('❌ [서버 콜백] OAuth 인증 코드가 없습니다');
      return NextResponse.redirect(new URL('/login?error=no_auth_code', request.url));
    }

    const cookieStore = await cookies();

    // Supabase 서버 클라이언트 생성
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              console.error('쿠키 설정 중 오류:', error);
            }
          },
        },
      }
    );

    // 🚀 핵심: OAuth 코드를 세션으로 교환
    console.log('🔧 [서버 콜백] exchangeCodeForSession 호출 시작');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('❌ [서버 콜백] OAuth 세션 교환 실패:', error.message);
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
    }

    if (!data.user) {
      console.error('❌ [서버 콜백] OAuth 세션 교환 성공했지만 사용자 정보가 없습니다');
      return NextResponse.redirect(new URL('/login?error=no_user_data', request.url));
    }

    console.log('✅ [서버 콜백] OAuth 인증 성공:', {
      userId: data.user.id,
      email: data.user.email,
      provider: data.user.app_metadata?.provider
    });

    // 성공적으로 로그인된 경우 홈(타임라인) 페이지로 리다이렉트
    console.log('🎯 [서버 콜백] 타임라인으로 리다이렉트');
    return NextResponse.redirect(new URL('/', request.url));

  } catch (error) {
    console.error('OAuth 콜백 처리 중 예상치 못한 오류:', error);
    return NextResponse.redirect(new URL('/login?error=callback_processing_failed', request.url));
  }
}