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
