/**
 * AI Gateway 타입 정의
 */

// ============================================================================
// 프로바이더 타입
// ============================================================================

export type AIProvider = 'claude' | 'openai' | 'groq' | 'gemini';

export interface ProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

// ============================================================================
// 채팅 타입
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: AIProvider;
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  content: string;
  tool_calls?: ToolCall[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  provider: AIProvider;
  model: string;
}

// ============================================================================
// Tool Use 타입
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ============================================================================
// 사용량 타입
// ============================================================================

export interface UsageInfo {
  current_count: number;
  daily_limit: number;
  remaining: number;
  is_limit_exceeded: boolean;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
}

export interface UsageLimitCheck {
  can_proceed: boolean;
  current_count: number;
  daily_limit: number;
  remaining: number;
}

// ============================================================================
// 스트리밍 이벤트 타입
// ============================================================================

export type StreamEvent =
  | { type: 'message_start'; message_id: string }
  | { type: 'content_delta'; delta: string }
  | { type: 'tool_use_start'; tool_call: ToolCall }
  | { type: 'tool_result'; result: ToolResult }
  | { type: 'message_end'; usage: { input_tokens: number; output_tokens: number } }
  | { type: 'error'; error: string };
