/**
 * 일상투두 MCP Server
 *
 * Supabase Edge Function으로 구현된 MCP (Model Context Protocol) 서버
 * ChatGPT, Claude, Cursor 등 MCP 지원 플랫폼에서 일상투두 데이터를 관리할 수 있습니다.
 *
 * 엔드포인트:
 * - POST /mcp-server - JSON-RPC 2.0 MCP 요청 처리
 * - GET /mcp-server/auth/init - OAuth 인증 초기화
 * - GET /mcp-server/auth/callback - OAuth 콜백 처리
 *
 * ChatGPT Actions REST API:
 * - GET /mcp-server/oauth/authorize - OAuth 2.0 인증 시작
 * - POST /mcp-server/oauth/token - 토큰 교환
 * - GET /mcp-server/openapi.json - OpenAPI 스키마
 * - GET/POST/PATCH/DELETE /mcp-server/api/v1/* - REST API
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { JsonRpcRequest, JsonRpcResponse, McpToolCallResult } from './types/mcp.ts';
import { getCurrentDateContext } from './utils/date.ts';
import { createCorsResponse, createHttpErrorResponse, createJsonResponse, CORS_HEADERS } from './utils/response.ts';
import { handleAuthInit, handleAuthCallback, authenticateRequest, handleOAuthAuthorize, handleOAuthToken } from './handlers/auth.ts';
import { handleToolsList, handleToolsCall } from './handlers/tools.ts';
import { handleResourcesList, handleResourcesRead } from './handlers/resources.ts';
import { handlePromptsList, handlePromptsGet } from './handlers/prompts.ts';
import { handleRestApi } from './handlers/rest-api.ts';
import { getOpenApiSchema } from './openapi/schema.ts';

// ============================================================================
// Rate Limiting (간단한 인메모리 구현)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// ============================================================================
// MCP 메소드 핸들러
// ============================================================================

/**
 * MCP initialize 처리
 */
function handleInitialize(): object {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    serverInfo: {
      name: 'daystep-mcp',
      version: '1.0.0',
    },
  };
}

/**
 * MCP ping 처리
 */
function handlePing(): object {
  return {};
}

// ============================================================================
// 메인 요청 핸들러
// ============================================================================

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  // ============================================================================
  // 인증 엔드포인트
  // ============================================================================

  // OAuth 초기화
  if (path.endsWith('/auth/init') && req.method === 'GET') {
    // Rate limiting: 분당 5회
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`auth:${clientIP}`, 5, 60000)) {
      return createHttpErrorResponse(429, -32000, '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }

    return handleAuthInit(req);
  }

  // OAuth 콜백
  if (path.endsWith('/auth/callback') && req.method === 'GET') {
    return handleAuthCallback(req);
  }

  // ============================================================================
  // ChatGPT Actions OAuth 2.0 엔드포인트
  // ============================================================================

  // OAuth 인증 시작 (ChatGPT가 사용자를 보내는 URL)
  if (path.endsWith('/oauth/authorize') && req.method === 'GET') {
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`oauth:${clientIP}`, 10, 60000)) {
      return createHttpErrorResponse(429, -32000, '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }
    return handleOAuthAuthorize(req);
  }

  // OAuth 토큰 교환
  if (path.endsWith('/oauth/token') && req.method === 'POST') {
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`token:${clientIP}`, 20, 60000)) {
      return createHttpErrorResponse(429, -32000, '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }
    return handleOAuthToken(req);
  }

  // ============================================================================
  // OpenAPI 스키마 엔드포인트
  // ============================================================================

  if (path.endsWith('/openapi.json') && req.method === 'GET') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const baseUrl = `${supabaseUrl}/functions/v1/mcp-server`;
    return createJsonResponse(getOpenApiSchema(baseUrl));
  }

  // ============================================================================
  // ChatGPT Actions REST API 엔드포인트
  // ============================================================================

  if (path.includes('/api/v1/')) {
    // 인증 확인
    const authResult = await authenticateRequest(req);
    if (!authResult.success || !authResult.userId) {
      return createHttpErrorResponse(401, -32001, authResult.error || '인증 필요');
    }

    const userId = authResult.userId;

    // Rate limiting: 분당 60회
    if (!checkRateLimit(`api:${userId}`, 60, 60000)) {
      return createHttpErrorResponse(429, -32000, '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }

    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return createHttpErrorResponse(500, -32000, '서버 구성 오류');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // API 경로 추출
    const apiPathMatch = path.match(/\/api\/v1\/(.+)/);
    const apiPath = apiPathMatch ? apiPathMatch[1] : '';

    return handleRestApi(req, supabase, userId, apiPath);
  }

  // ============================================================================
  // MCP JSON-RPC 엔드포인트
  // ============================================================================

  if (req.method !== 'POST') {
    return createHttpErrorResponse(405, -32600, 'POST 메소드만 지원합니다.');
  }

  // Content-Type 확인
  const contentType = req.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    return createHttpErrorResponse(400, -32600, 'Content-Type: application/json 필요');
  }

  // JSON-RPC 요청 파싱
  let rpcRequest: JsonRpcRequest;
  try {
    rpcRequest = await req.json();
  } catch {
    return createHttpErrorResponse(400, -32700, 'JSON 파싱 오류');
  }

  // JSON-RPC 2.0 검증
  if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method) {
    return createHttpErrorResponse(400, -32600, '유효하지 않은 JSON-RPC 요청');
  }

  const { method, params, id } = rpcRequest;

  // ============================================================================
  // 인증 불필요 메소드
  // ============================================================================

  if (method === 'initialize') {
    return createJsonResponse({ jsonrpc: '2.0', result: handleInitialize(), id });
  }

  if (method === 'ping') {
    return createJsonResponse({ jsonrpc: '2.0', result: handlePing(), id });
  }

  if (method === 'notifications/initialized') {
    // 알림은 응답 없음
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // ============================================================================
  // 인증 필요 메소드
  // ============================================================================

  // 인증 확인
  const authResult = await authenticateRequest(req);
  if (!authResult.success || !authResult.userId) {
    return createJsonResponse({
      jsonrpc: '2.0',
      error: { code: -32001, message: authResult.error || '인증 필요' },
      id,
    });
  }

  const userId = authResult.userId;

  // Rate limiting: 분당 60회 (tools/call)
  if (!checkRateLimit(`api:${userId}`, 60, 60000)) {
    return createJsonResponse({
      jsonrpc: '2.0',
      error: { code: -32000, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      id,
    });
  }

  // Supabase 클라이언트 생성 (RLS 적용)
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return createJsonResponse({
      jsonrpc: '2.0',
      error: { code: -32000, message: '서버 구성 오류' },
      id,
    });
  }

  // Service role로 생성하되 user_id 필터로 RLS 대체
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 날짜 컨텍스트 생성
  const dateContext = getCurrentDateContext();

  // ============================================================================
  // MCP 메소드 라우팅
  // ============================================================================

  let result: any;

  try {
    switch (method) {
      // Tools
      case 'tools/list':
        result = handleToolsList();
        break;

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return createJsonResponse({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'name 파라미터 필요' },
            id,
          });
        }

        result = await handleToolsCall({ name: toolName, arguments: toolArgs }, supabase, userId);
        break;
      }

      // Resources
      case 'resources/list':
        result = handleResourcesList();
        break;

      case 'resources/read': {
        const uri = params?.uri;

        if (!uri) {
          return createJsonResponse({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'uri 파라미터 필요' },
            id,
          });
        }

        const resourceResult = await handleResourcesRead(supabase, userId, uri, dateContext);
        result = {
          contents: resourceResult.content.map((c) => ({
            uri,
            mimeType: 'text/plain',
            text: c.text,
          })),
        };
        break;
      }

      // Prompts
      case 'prompts/list':
        result = handlePromptsList();
        break;

      case 'prompts/get': {
        const promptName = params?.name;
        const promptArgs = params?.arguments || {};

        if (!promptName) {
          return createJsonResponse({
            jsonrpc: '2.0',
            error: { code: -32602, message: 'name 파라미터 필요' },
            id,
          });
        }

        const promptResult = await handlePromptsGet(
          supabase,
          userId,
          promptName,
          promptArgs,
          dateContext
        );
        result = {
          messages: promptResult.content.map((c) => ({
            role: 'assistant',
            content: { type: 'text', text: c.text },
          })),
        };
        break;
      }

      default:
        return createJsonResponse({
          jsonrpc: '2.0',
          error: { code: -32601, message: `지원하지 않는 메소드: ${method}` },
          id,
        });
    }

    return createJsonResponse({ jsonrpc: '2.0', result, id });
  } catch (error: any) {
    console.error('MCP Error:', error);
    return createJsonResponse({
      jsonrpc: '2.0',
      error: { code: -32000, message: error.message || '내부 서버 오류' },
      id,
    });
  }
});
