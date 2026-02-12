import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { toSiteURL } from '@/lib/utils';

// 🔑 핵심: OAuth 콜백은 동적 처리가 필요함!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Nextbase 패턴 OAuth 콜백 Route Handler
 * 
 * 기능:
 * 1. OAuth authorization code를 Supabase session으로 교환
 * 2. 안전한 리다이렉트 처리 (next 파라미터 지원)
 * 3. PKCE 문제 해결 및 중복 호출 방지
 */

export async function GET(request: NextRequest) {
  console.log('🔧 [OAuth 콜백] Nextbase 패턴 처리 시작');
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next');
    
    // 🔧 OAuth 코드가 있으면 반드시 세션 교환 시도
    const supabase = await createServerSupabaseClient();
    
    console.log('🔧 [OAuth 콜백] URL 파라미터:', {
      fullUrl: request.url,
      hasCode: !!code,
      hasNext: !!next,
      codeLength: code?.length
    });
    
    // 에러 처리
    const error = searchParams.get('error');
    if (error) {
      console.error('❌ [OAuth 콜백] OAuth 에러:', error);
      return NextResponse.redirect(toSiteURL(`/login?error=${error}`));
    }
    
    // 인증 코드 확인
    if (!code) {
      console.error('❌ [OAuth 콜백] 인증 코드가 없습니다');
      return NextResponse.redirect(toSiteURL('/login?error=no_auth_code'));
    }

    console.log('🔧 [OAuth 콜백] exchangeCodeForSession 호출 시작');
    
    // 🚀 핵심: OAuth 코드를 세션으로 교환 (PKCE 자동 처리)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ [OAuth 콜백] 세션 교환 실패:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name
      });
      
      // PKCE 관련 에러는 더 구체적으로 처리
      if (exchangeError.message.includes('code verifier')) {
        console.error('❌ [OAuth 콜백] PKCE verifier 문제 - 새 로그인 시도 필요');
        return NextResponse.redirect(toSiteURL('/login?error=pkce_error&message=새로+로그인을+시도해주세요'));
      }
      
      return NextResponse.redirect(toSiteURL(`/login?error=${encodeURIComponent(exchangeError.message)}`));
    }

    if (!data.user || !data.session) {
      console.error('❌ [OAuth 콜백] 세션 교환 성공했지만 사용자 정보가 없습니다');
      return NextResponse.redirect(toSiteURL('/login?error=no_user_data'));
    }

    console.log('✅ [OAuth 콜백] 인증 성공:', {
      userId: data.user.id,
      email: data.user.email,
      provider: data.user.app_metadata?.provider,
      hasSession: !!data.session
    });

    // 🔐 중복 처리 방지: 성공 후 같은 코드로 재요청 차단
    console.log('🛡️ [OAuth 콜백] 세션 교환 완료 - 향후 같은 코드 재사용 차단됨');

    // 🎯 Nextbase 패턴: 안전한 리다이렉트 처리
    const redirectTo = next ? toSiteURL(next) : toSiteURL('/');
    console.log('🎯 [OAuth 콜백] 리다이렉트 대상:', redirectTo);
    
    // 🔐 보안: 302 리다이렉트로 브라우저 히스토리에서 OAuth 코드 제거
    const response = NextResponse.redirect(redirectTo, { status: 302 });
    
    // 🧹 캐시 방지: OAuth 콜백은 절대 캐시되면 안됨
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;

  } catch (error) {
    console.error('❌ [OAuth 콜백] 처리 중 예상치 못한 오류:', error);
    return NextResponse.redirect(toSiteURL('/login?error=callback_processing_failed'));
  }
}