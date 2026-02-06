/**
 * AI Gateway Edge Function
 *
 * 멀티 AI 프로바이더 추상화 + Tool Use 오케스트레이션
 * DayStep 앱 내 AI 플래닝 기능을 위한 백엔드
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { handleChat, handleStreamingChat } from './handlers/chat.ts';
import { handleUsage } from './handlers/usage.ts';
import { CORS_HEADERS, createJsonResponse, createCorsResponse } from './utils/response.ts';

// ============================================================================
// 환경 변수
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// ============================================================================
// 메인 핸들러
// ============================================================================

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // CORS 프리플라이트
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  try {
    // JWT에서 사용자 인증
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createJsonResponse({ error: 'Authorization header required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');

    // Supabase 클라이언트 (사용자 컨텍스트)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // Service Role 클라이언트 (관리자 작업용)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 사용자 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createJsonResponse({ error: 'Invalid token' }, 401);
    }

    // 라우팅
    // /ai-gateway/chat - 채팅 (스트리밍)
    // /ai-gateway/usage - 사용량 조회
    const endpoint = pathname.replace(/^\/ai-gateway\/?/, '').split('/')[0] || 'chat';

    switch (endpoint) {
      case 'chat': {
        const body = await req.json();
        const streaming = body.stream !== false; // 기본 스트리밍

        if (streaming) {
          return await handleStreamingChat(supabase, supabaseAdmin, user.id, body);
        } else {
          return await handleChat(supabase, supabaseAdmin, user.id, body);
        }
      }

      case 'usage': {
        return await handleUsage(supabase, user.id, req);
      }

      default:
        return createJsonResponse({ error: 'Unknown endpoint' }, 404);
    }
  } catch (error) {
    console.error('AI Gateway error:', error);
    return createJsonResponse(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
