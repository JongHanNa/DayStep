import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// 서버에서만 실행되는 Google Auth 토큰 갱신 API
export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: '리프레시 토큰이 필요합니다.' },
        { status: 400 }
      );
    }

    // 환경 변수 확인
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Google OAuth 환경 변수가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: 'Google OAuth 설정이 완료되지 않았습니다.' },
        { status: 500 }
      );
    }

    // OAuth2 클라이언트 생성
    const client = new OAuth2Client(clientId, clientSecret);

    // 리프레시 토큰 설정
    client.setCredentials({
      refresh_token
    });

    // 새 액세스 토큰 요청
    const { credentials } = await client.refreshAccessToken();

    // 새 토큰 정보 반환
    const tokens = {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token || refresh_token, // 기존 리프레시 토큰 유지
      scope: credentials.scope || 'https://www.googleapis.com/auth/calendar.readonly',
      token_type: credentials.token_type || 'Bearer',
      expiry_date: credentials.expiry_date || Date.now() + 3600000 // 1시간 후 만료
    };

    console.log('🔄 Google 토큰 갱신 성공');

    return NextResponse.json({
      tokens,
      message: '토큰이 성공적으로 갱신되었습니다.'
    });

  } catch (error) {
    console.error('Google 토큰 갱신 실패:', error);

    // 리프레시 토큰이 만료된 경우
    if (error instanceof Error && error.message.includes('invalid_grant')) {
      return NextResponse.json(
        {
          error: '리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.',
          code: 'REFRESH_TOKEN_EXPIRED'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: '토큰 갱신에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}