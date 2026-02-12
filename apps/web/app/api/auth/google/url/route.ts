import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// This API route needs to be dynamic for OAuth functionality
export const dynamic = 'force-dynamic';

// 서버에서만 실행되는 Google Auth URL 생성 API
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || 'web';

    // 환경 변수 확인
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!clientId || !clientSecret) {
      console.error('Google OAuth 환경 변수가 설정되지 않았습니다:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });

      return NextResponse.json(
        {
          error: 'Google OAuth 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요.',
          details: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID 및 GOOGLE_CLIENT_SECRET 필요'
        },
        { status: 500 }
      );
    }

    // OAuth2 클라이언트 생성 (서버에서만 실행)
    const client = new OAuth2Client(
      clientId,
      clientSecret,
      `${siteUrl}/api/auth/google/callback`
    );

    // 인증 URL 생성
    const authUrl = client.generateAuthUrl({
      access_type: 'offline', // 리프레시 토큰을 위해 필요
      prompt: 'consent', // 사용자가 항상 권한을 확인할 수 있도록
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly', // 캘린더 읽기 권한
        'https://www.googleapis.com/auth/userinfo.profile', // 사용자 프로필 정보
        'https://www.googleapis.com/auth/userinfo.email' // 이메일 주소
      ],
      state: JSON.stringify({ platform }) // 플랫폼 정보를 state로 전달
    });

    return NextResponse.json({
      authUrl,
      platform,
      message: 'Google OAuth URL이 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('Google OAuth URL 생성 실패:', error);

    return NextResponse.json(
      {
        error: 'Google OAuth URL 생성에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}