import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// This API route needs to be dynamic for OAuth functionality
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // 상태 정보 파싱 (플랫폼 정보 포함)
    let platform = 'web';
    if (state) {
      try {
        const stateData = JSON.parse(state);
        platform = stateData.platform || 'web';
      } catch (e) {
        console.warn('상태 정보 파싱 실패:', e);
      }
    }

    console.log(`🔐 Google OAuth 콜백 처리 (플랫폼: ${platform})`);

    // 에러가 있는 경우
    if (error) {
      console.error('Google OAuth 에러:', error);
      const errorMessage = encodeURIComponent(
        error === 'access_denied'
          ? 'Google 인증이 거부되었습니다.'
          : `인증 오류: ${error}`
      );
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings/google-calendar?error=${errorMessage}`);
    }

    // 인증 코드가 없는 경우
    if (!code) {
      console.error('Google OAuth 코드가 없습니다.');
      const errorMessage = encodeURIComponent('인증 코드를 받지 못했습니다.');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings/google-calendar?error=${errorMessage}`);
    }

    // 환경 변수 확인
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      console.error('Google OAuth 환경 변수가 설정되지 않았습니다.');
      const errorMessage = encodeURIComponent('서버 설정 오류가 발생했습니다.');
      return NextResponse.redirect(`${siteUrl}/settings/google-calendar?error=${errorMessage}`);
    }

    // OAuth2 클라이언트 생성 (서버에서만 실행)
    const client = new OAuth2Client(
      clientId,
      clientSecret,
      `${siteUrl}/api/auth/google/callback`
    );

    // 인증 코드를 토큰으로 교환
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('액세스 토큰을 받지 못했습니다.');
    }

    console.log('✅ Google Calendar 토큰 교환 성공');

    // 토큰 정보 정리
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar.readonly',
      token_type: tokens.token_type || 'Bearer',
      expiry_date: tokens.expiry_date || Date.now() + 3600000 // 1시간 후 만료
    };

    // 성공 페이지로 리다이렉트 (토큰 정보를 안전하게 전달)
    const successParams = new URLSearchParams({
      platform,
      tokens: Buffer.from(JSON.stringify(tokenData)).toString('base64') // Base64로 인코딩
    });

    return NextResponse.redirect(`${siteUrl}/auth/google/success?${successParams.toString()}`);

  } catch (error) {
    console.error('Google OAuth 콜백 처리 실패:', error);
    const errorMessage = encodeURIComponent(
      error instanceof Error
        ? `인증 처리 실패: ${error.message}`
        : '인증 처리 중 알 수 없는 오류가 발생했습니다.'
    );
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings/google-calendar?error=${errorMessage}`);
  }
}

// POST 메서드도 지원 (일부 OAuth 플로우에서 사용)
export async function POST(request: NextRequest) {
  return GET(request);
}