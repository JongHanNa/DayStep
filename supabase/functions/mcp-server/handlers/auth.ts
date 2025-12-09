/**
 * 인증 핸들러
 *
 * OAuth 초기화, 콜백 처리, JWT 토큰 발급/검증
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import * as djwt from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import {
  createPlainTextResponse,
  createJsonResponse,
  createHttpErrorResponse,
  CORS_HEADERS,
} from '../utils/response.ts';
import type { AuthResult, McpTokenPayload } from '../types/mcp.ts';

// ============================================================================
// 환경 변수
// ============================================================================

function getEnvVars() {
  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    mcpJwtSecret: Deno.env.get('MCP_JWT_SECRET') || 'default-secret-change-in-production',
  };
}

// ============================================================================
// JWT 키 생성
// ============================================================================

let cryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cryptoKey) return cryptoKey;

  const { mcpJwtSecret } = getEnvVars();
  const encoder = new TextEncoder();
  cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(mcpJwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return cryptoKey;
}

// ============================================================================
// OAuth 초기화
// ============================================================================

/**
 * PKCE code_verifier 생성
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * PKCE code_challenge 생성 (SHA256)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * OAuth 초기화 - Supabase Auth OAuth URL로 직접 리다이렉트 (PKCE flow)
 */
export async function handleAuthInit(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const provider = url.searchParams.get('provider') || 'google';

  // 지원하는 프로바이더 확인
  if (!['google', 'kakao'].includes(provider)) {
    return createHttpErrorResponse(400, -32602, '지원하지 않는 인증 프로바이더입니다.');
  }

  const { supabaseUrl } = getEnvVars();

  // 콜백 URL 생성 (Edge Function 경로 포함)
  const callbackUrl = `${supabaseUrl}/functions/v1/mcp-server/auth/callback`;

  // PKCE code_verifier 및 code_challenge 생성
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Supabase Auth OAuth URL 직접 구성
  const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
  oauthUrl.searchParams.set('provider', provider);
  oauthUrl.searchParams.set('redirect_to', callbackUrl);
  oauthUrl.searchParams.set('code_challenge', codeChallenge);
  oauthUrl.searchParams.set('code_challenge_method', 'S256');
  oauthUrl.searchParams.set('prompt', 'select_account');

  // OAuth URL로 리다이렉트하면서 code_verifier를 쿠키에 저장
  return new Response(null, {
    status: 302,
    headers: {
      'Location': oauthUrl.toString(),
      'Set-Cookie': `mcp_code_verifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      ...CORS_HEADERS,
    },
  });
}

/**
 * OAuth 초기화 HTML 페이지
 */
function generateAuthInitPage(
  provider: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  callbackUrl: string
): string {
  const providerName = provider === 'google' ? 'Google' : 'Kakao';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DayStep MCP 인증</title>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      color: #1a1a2e;
      font-size: 24px;
      margin-bottom: 8px;
    }
    p {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      background: ${provider === 'google' ? '#4285F4' : '#FEE500'};
      color: ${provider === 'google' ? 'white' : '#3C1E1E'};
      border: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      width: 100%;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .loading {
      display: none;
      margin-top: 20px;
      color: #666;
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #ddd;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">📅</div>
    <h1>DayStep MCP 연결</h1>
    <p>${providerName}로 로그인하여 AI 어시스턴트에서 DayStep을 사용하세요.</p>
    <button class="btn" onclick="startAuth()">
      ${provider === 'google' ? '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' : '💬'}
      ${providerName}로 로그인
    </button>
    <div class="loading" id="loading">
      <span class="spinner"></span>인증 중...
    </div>
  </div>

  <script>
    const supabase = window.supabase.createClient('${supabaseUrl}', '${supabaseAnonKey}');

    async function startAuth() {
      document.getElementById('loading').style.display = 'block';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: '${provider}',
        options: {
          redirectTo: '${callbackUrl}',
          queryParams: { prompt: 'select_account' }
        }
      });

      if (error) {
        alert('인증 오류: ' + error.message);
        document.getElementById('loading').style.display = 'none';
      }
    }
  </script>
</body>
</html>
`;
}

// ============================================================================
// OAuth 콜백
// ============================================================================

/**
 * 쿠키에서 값 추출
 */
function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return value;
  }
  return null;
}

/**
 * OAuth 콜백 처리 (PKCE flow)
 */
export async function handleAuthCallback(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return createPlainTextResponse(generateErrorPage(errorDescription || error));
  }

  if (!code) {
    return createPlainTextResponse(generateErrorPage('인증 코드가 없습니다.'));
  }

  // 쿠키에서 code_verifier 추출
  const codeVerifier = getCookieValue(req, 'mcp_code_verifier');
  if (!codeVerifier) {
    return createPlainTextResponse(generateErrorPage('인증 세션이 만료되었습니다. 다시 시도해주세요.'));
  }

  try {
    const { supabaseUrl, supabaseAnonKey } = getEnvVars();

    // Supabase Auth API로 직접 토큰 교환 (PKCE)
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        auth_code: code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      return createPlainTextResponse(generateErrorPage(errorData.error_description || errorData.error || '토큰 교환 실패'));
    }

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token || !tokenData.user) {
      return createPlainTextResponse(generateErrorPage('토큰 교환 실패: 유효하지 않은 응답'));
    }

    // MCP 토큰 생성
    const mcpToken = await generateMcpToken({
      userId: tokenData.user.id,
      email: tokenData.user.email || '',
      supabaseAccessToken: tokenData.access_token,
      supabaseRefreshToken: tokenData.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
    });

    // 성공 페이지 반환 (code_verifier 쿠키 삭제)
    const mcpServerUrl = `${supabaseUrl}/functions/v1/mcp-server`;
    const response = createPlainTextResponse(generateSuccessPage(mcpToken, tokenData.user.email || '', mcpServerUrl));
    response.headers.set('Set-Cookie', 'mcp_code_verifier=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return response;
  } catch (err) {
    console.error('Auth callback error:', err);
    return createPlainTextResponse(generateErrorPage((err as Error).message));
  }
}

/**
 * MCP JWT 토큰 생성
 */
async function generateMcpToken(params: {
  userId: string;
  email: string;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  expiresAt: number;
}): Promise<string> {
  const key = await getCryptoKey();
  const now = Math.floor(Date.now() / 1000);

  const payload: McpTokenPayload = {
    sub: params.userId,
    email: params.email,
    sat: params.supabaseAccessToken,
    srt: params.supabaseRefreshToken,
    exp: params.expiresAt,
    iat: now,
  };

  return await djwt.create({ alg: 'HS256', typ: 'JWT' }, payload, key);
}

/**
 * 성공 페이지 (순수 텍스트)
 */
function generateSuccessPage(token: string, email: string, mcpServerUrl: string): string {
  return `DayStep MCP 인증 완료!
=====================================

계정: ${email}

MCP 토큰 (아래 전체를 복사하세요):
-------------------------------------
${token}
-------------------------------------

Claude Desktop 설정 방법:
1. 설정 파일 열기: ~/.config/Claude/claude_desktop_config.json
2. 아래 내용 추가:

{
  "mcpServers": {
    "daystep": {
      "url": "${mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer <위의 토큰>"
      }
    }
  }
}

3. Claude Desktop 재시작
`;
}

/**
 * 에러 페이지 (순수 텍스트)
 */
function generateErrorPage(message: string): string {
  return `DayStep MCP 인증 오류
=====================================

오류: ${message}

다시 시도하려면 브라우저 뒤로가기를 눌러주세요.
`;
}

// ============================================================================
// 토큰 검증
// ============================================================================

/**
 * 요청 인증 검증
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.slice(7);

  try {
    const key = await getCryptoKey();
    const payload = (await djwt.verify(token, key)) as McpTokenPayload;

    // 토큰 만료 확인
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      // 토큰 만료 - 리프레시 토큰으로 갱신 시도
      const newSession = await refreshSupabaseSession(payload.srt);
      if (!newSession) {
        return { success: false, error: 'Token expired' };
      }
      // 새 세션으로 업데이트
      payload.sat = newSession.access_token;
    }

    // 인증된 Supabase 클라이언트 생성
    const { supabaseUrl, supabaseAnonKey } = getEnvVars();
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${payload.sat}` },
      },
    });

    return {
      success: true,
      userId: payload.sub,
      supabase,
    };
  } catch (err) {
    console.error('Token verification error:', err);
    return { success: false, error: 'Invalid token' };
  }
}

/**
 * Supabase 세션 갱신
 */
async function refreshSupabaseSession(
  refreshToken: string
): Promise<{ access_token: string } | null> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getEnvVars();
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      console.error('Session refresh failed:', error);
      return null;
    }

    return { access_token: data.session.access_token };
  } catch (err) {
    console.error('Session refresh error:', err);
    return null;
  }
}
