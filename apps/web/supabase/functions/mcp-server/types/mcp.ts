/**
 * MCP (Model Context Protocol) 타입 정의
 *
 * JSON-RPC 2.0 기반 프로토콜로 AI 클라이언트와 통신
 */

// ============================================================================
// JSON-RPC 2.0 기본 타입
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// JSON-RPC 에러 코드
export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// ============================================================================
// MCP 프로토콜 타입
// ============================================================================

export interface McpServerInfo {
  name: string;
  version: string;
}

export interface McpCapabilities {
  tools?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
}

export interface InitializeParams {
  protocolVersion: string;
  capabilities: Record<string, unknown>;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
}

// ============================================================================
// Tool 관련 타입
// ============================================================================

export interface JsonSchema {
  type: string;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JsonSchema>;
    required?: string[];
  };
}

export interface McpToolsListResult {
  tools: McpTool[];
}

export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: McpContent[];
  isError?: boolean;
}

export interface McpContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

// ============================================================================
// Resource 관련 타입
// ============================================================================

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourcesListResult {
  resources: McpResource[];
}

export interface McpResourceReadParams {
  uri: string;
}

export interface McpResourceReadResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

// ============================================================================
// Prompt 관련 타입
// ============================================================================

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptsListResult {
  prompts: McpPrompt[];
}

export interface McpPromptGetParams {
  name: string;
  arguments?: Record<string, string>;
}

export interface McpPromptGetResult {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: McpContent;
  }>;
}

// ============================================================================
// 인증 관련 타입
// ============================================================================

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  supabase?: unknown; // SupabaseClient 타입
}

export interface McpTokenPayload {
  sub: string; // userId
  email: string;
  sat: string; // Supabase Access Token
  srt: string; // Supabase Refresh Token
  exp: number;
  iat: number;
}

// ============================================================================
// ChatGPT Actions OAuth 2.0 타입
// ============================================================================

/**
 * OAuth 2.0 Token Response
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Authorization Code 임시 저장 데이터
 */
export interface AuthCodeData {
  userId: string;
  email: string;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  redirectUri: string;
  scope: string;
  expiresAt: number;
}

// ============================================================================
// REST API 타입
// ============================================================================

/**
 * REST API 목록 응답
 */
export interface RestListResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * REST API 에러 응답
 */
export interface RestErrorResponse {
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
}

/**
 * Todo REST API 타입
 */
export interface TodoResponse {
  id: string;
  title: string;
  completed: boolean;
  schedule_type: string;
  start_time: string | null;
  end_time: string | null;
  project_id: string | null;
  recurrence_pattern: string;
  is_today_highlight: boolean;
  icon: string | null;
  color: string;
  anytime_duration: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Todo 생성 입력
 */
export interface CreateTodoRequest {
  title: string;
  schedule_type?: 'all_day' | 'timed' | 'anytime' | 'none';
  start_time?: string;
  end_time?: string;
  project_id?: string;
  is_today_highlight?: boolean;
  icon?: string;
  color?: string;
  anytime_duration?: number;
}

/**
 * Todo 수정 입력
 */
export interface UpdateTodoRequest {
  title?: string;
  schedule_type?: 'all_day' | 'timed' | 'anytime' | 'none';
  start_time?: string | null;
  end_time?: string | null;
  completed?: boolean;
  project_id?: string | null;
  is_today_highlight?: boolean;
  icon?: string;
  color?: string;
  anytime_duration?: number;
}

// ============================================================================
// Project REST API 타입
// ============================================================================

/**
 * Project 응답 타입
 */
export interface ProjectResponse {
  id: string;
  title: string;
  description: string | null;
  status: string;
  icon: string | null;
  color: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Project 생성 입력
 */
export interface CreateProjectRequest {
  title: string;
  description?: string;
  status?: 'active' | 'completed' | 'abandoned';
  icon?: string;
  color?: string;
}

/**
 * Project 수정 입력
 */
export interface UpdateProjectRequest {
  title?: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'abandoned';
  icon?: string;
  color?: string;
}

/**
 * Project+Todos 일괄 생성 입력
 */
export interface CreateProjectWithTodosRequest {
  project: {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
  };
  todos: Array<{
    title: string;
    start_time?: string;
    schedule_type?: 'all_day' | 'timed' | 'anytime' | 'none';
    anytime_duration?: number;
    subtasks?: Array<{
      title: string;
      anytime_duration?: number;
    }>;
  }>;
}
