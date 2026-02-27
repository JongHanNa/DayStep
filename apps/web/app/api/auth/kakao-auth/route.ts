import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || 'b00dcde236c2f8b028a981303aeb4253';

/**
 * Kakao OAuth 서버사이드 인증 처리
 *
 * 1. 클라이언트에서 받은 auth code로 Kakao 토큰 교환
 * 2. Kakao API로 사용자 정보 조회
 * 3. Supabase Admin API로 사용자 생성/조회
 * 4. 세션 토큰 발급하여 클라이언트에 반환
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: '인증 코드가 필요합니다' }, { status: 400 });
    }

    // 1. Kakao 토큰 교환
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectUri = `${siteUrl}/auth/kakao-callback`;

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_CLIENT_ID,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('Kakao 토큰 교환 실패:', tokenError);
      return NextResponse.json({ error: '카카오 토큰 교환 실패' }, { status: 502 });
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.json({ error: '카카오 액세스 토큰을 받지 못했습니다' }, { status: 502 });
    }

    // 2. Kakao 사용자 정보 조회
    const userInfoResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('Kakao 사용자 정보 조회 실패');
      return NextResponse.json({ error: '카카오 사용자 정보 조회 실패' }, { status: 502 });
    }

    const kakaoUser = await userInfoResponse.json();

    if (!kakaoUser.id) {
      return NextResponse.json({ error: '카카오 사용자 ID를 확인할 수 없습니다' }, { status: 502 });
    }

    const nickname = kakaoUser.kakao_account?.profile?.nickname || '카카오 사용자';
    const profileImageUrl = kakaoUser.kakao_account?.profile?.profile_image_url;
    const kakaoEmail = kakaoUser.kakao_account?.email;

    // 3. Supabase Admin API로 사용자 생성/조회
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = kakaoEmail || `kakao_${kakaoUser.id}@daystep.kakao`;
    // 암호학적으로 안전한 랜덤 비밀번호 생성 (사용자가 직접 사용하지 않음)
    const securePassword = crypto.randomBytes(32).toString('hex');

    // 기존 사용자 확인
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email || u.user_metadata?.kakao_id === String(kakaoUser.id)
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // 메타데이터 업데이트
      await serviceClient.auth.admin.updateUserById(userId, {
        user_metadata: {
          kakao_id: String(kakaoUser.id),
          name: nickname,
          avatar_url: profileImageUrl,
          provider: 'kakao',
        },
      });
    } else {
      // 신규 사용자 생성
      const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
        email,
        password: securePassword,
        email_confirm: true,
        user_metadata: {
          kakao_id: String(kakaoUser.id),
          name: nickname,
          avatar_url: profileImageUrl,
          provider: 'kakao',
        },
      });

      if (createError || !newUser.user) {
        console.error('Supabase 사용자 생성 실패:', createError);
        return NextResponse.json({ error: '사용자 생성 실패' }, { status: 500 });
      }

      userId = newUser.user.id;
    }

    // 4. 세션 생성 (Admin API로 임의 JWT 발급은 불가하므로,
    //    generateLink를 사용하여 매직 링크 토큰 생성 후 세션 교환)
    const { data: linkData, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData) {
      console.error('세션 생성 실패:', linkError);
      return NextResponse.json({ error: '세션 생성 실패' }, { status: 500 });
    }

    // generateLink에서 반환된 토큰으로 세션 교환
    const token_hash = linkData.properties?.hashed_token;
    if (!token_hash) {
      console.error('토큰 해시를 받지 못했습니다');
      return NextResponse.json({ error: '토큰 생성 실패' }, { status: 500 });
    }

    // verifyOtp로 세션 생성
    const { data: sessionData, error: verifyError } = await serviceClient.auth.verifyOtp({
      token_hash,
      type: 'magiclink',
    });

    if (verifyError || !sessionData.session) {
      console.error('세션 검증 실패:', verifyError);
      return NextResponse.json({ error: '세션 검증 실패' }, { status: 500 });
    }

    console.log('✅ Kakao 로그인 성공:', { userId, email });

    return NextResponse.json({
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
      },
    });
  } catch (error) {
    console.error('Kakao 인증 처리 중 오류:', error);
    return NextResponse.json(
      { error: '카카오 인증 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
