import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/tokens
 * HttpOnly 쿠키에서 Google Calendar 토큰을 읽어서 반환하고 쿠키 삭제
 * 클라이언트가 DB에 저장한 후 호출
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const tokensCookie = cookieStore.get('google_calendar_tokens');

  if (!tokensCookie) {
    return NextResponse.json({ error: '토큰이 없습니다' }, { status: 404 });
  }

  try {
    const tokens = JSON.parse(tokensCookie.value);

    // 쿠키 즉시 삭제
    const response = NextResponse.json({ tokens });
    response.cookies.set('google_calendar_tokens', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json({ error: '토큰 파싱 실패' }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/google/tokens
 * 토큰 쿠키 삭제 (클라이언트가 DB 저장 완료 후 호출)
 */
export async function DELETE(_request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('google_calendar_tokens', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
