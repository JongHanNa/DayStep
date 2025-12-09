/**
 * MCP 응답 포맷터
 *
 * JSON-RPC 2.0 응답 및 MCP Tool 결과 생성
 */

import type {
  JsonRpcResponse,
  JsonRpcError,
  McpToolCallResult,
  McpContent,
  JSON_RPC_ERROR_CODES,
} from '../types/mcp.ts';

// ============================================================================
// JSON-RPC 응답 생성
// ============================================================================

/**
 * 성공 응답 생성
 */
export function createSuccessResponse(id: string | number, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result,
  };
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  id: string | number,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

// ============================================================================
// MCP Tool 결과 생성
// ============================================================================

/**
 * 텍스트 결과 생성
 */
export function createTextResult(text: string, isError = false): McpToolCallResult {
  return {
    content: [{ type: 'text', text }],
    isError,
  };
}

/**
 * JSON 결과 생성 (포맷팅된 텍스트로 변환)
 */
export function createJsonResult(data: unknown, isError = false): McpToolCallResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
    isError,
  };
}

/**
 * 에러 결과 생성
 */
export function createErrorResult(message: string, details?: unknown): McpToolCallResult {
  let text = `오류: ${message}`;
  if (details) {
    text += `\n상세: ${JSON.stringify(details, null, 2)}`;
  }
  return {
    content: [{ type: 'text', text }],
    isError: true,
  };
}

/**
 * 성공 메시지 결과 생성
 */
export function createSuccessResult(message: string, data?: unknown): McpToolCallResult {
  const contents: McpContent[] = [{ type: 'text', text: `✅ ${message}` }];

  if (data) {
    contents.push({
      type: 'text',
      text: JSON.stringify(data, null, 2),
    });
  }

  return {
    content: contents,
    isError: false,
  };
}

/**
 * 목록 결과 생성 (포맷팅된 텍스트)
 */
export function createListResult<T>(
  items: T[],
  formatter: (item: T) => string,
  options?: {
    title?: string;
    emptyMessage?: string;
    showCount?: boolean;
  }
): McpToolCallResult {
  const { title, emptyMessage = '항목이 없습니다.', showCount = true } = options || {};

  if (items.length === 0) {
    return createTextResult(emptyMessage);
  }

  let text = '';
  if (title) {
    text += `${title}\n\n`;
  }

  text += items.map((item, index) => `${index + 1}. ${formatter(item)}`).join('\n');

  if (showCount) {
    text += `\n\n총 ${items.length}개`;
  }

  return {
    content: [{ type: 'text', text }],
    isError: false,
  };
}

/**
 * 확인 필요 결과 생성
 */
export function createConfirmationRequired(
  message: string,
  instructions: string
): McpToolCallResult {
  return {
    content: [
      {
        type: 'text',
        text: `⚠️ ${message}\n\n${instructions}`,
      },
    ],
    isError: false,
  };
}

// ============================================================================
// HTTP 응답 헬퍼
// ============================================================================

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * CORS 프리플라이트 응답
 */
export function createCorsResponse(): Response {
  return new Response('ok', { headers: CORS_HEADERS });
}

/**
 * JSON 응답 생성
 */
export function createJsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * HTML 응답 생성
 */
export function createHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

/**
 * 텍스트 응답 생성
 */
export function createPlainTextResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

/**
 * 에러 HTTP 응답 생성 (HTTP status + JSON-RPC error)
 */
export function createHttpErrorResponse(
  httpStatus: number,
  errorCode: number,
  message: string
): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: errorCode,
        message,
      },
      id: null,
    }),
    {
      status: httpStatus,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ============================================================================
// 포맷터 헬퍼
// ============================================================================

/**
 * 날짜 포맷 (한국어)
 */
export function formatDateKorean(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 시간 포맷 (한국어)
 */
export function formatTimeKorean(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 상태 이모지 변환
 */
export function getStatusEmoji(status: string): string {
  const statusEmojis: Record<string, string> = {
    not_started: '⏳',
    in_progress: '🔄',
    paused: '⏸️',
    completed: '✅',
    // Todo 상태
    none: '📋',
    reminder: '🔔',
    someday: '💭',
    waiting: '⏰',
    next_action: '⚡',
    schedule_clear: '📅',
  };
  return statusEmojis[status] || '📌';
}

/**
 * 우선순위 이모지 변환
 */
export function getPriorityEmoji(priority: string | null | undefined): string {
  const priorityEmojis: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  };
  return priorityEmojis[priority || 'medium'] || '⚪';
}
