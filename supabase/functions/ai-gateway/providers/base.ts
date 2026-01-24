/**
 * AI 프로바이더 베이스 인터페이스
 */

import type { ChatMessage, ChatResponse, ToolDefinition, AIProvider } from '../types/index.ts';

export interface AIProviderClient {
  provider: AIProvider;

  /**
   * 일반 채팅 완료
   */
  chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      tools?: ToolDefinition[];
    }
  ): Promise<ChatResponse>;

  /**
   * 스트리밍 채팅
   */
  streamChat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      tools?: ToolDefinition[];
    }
  ): AsyncGenerator<string, void, unknown>;
}

/**
 * 프로바이더별 기본 모델
 */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
};

/**
 * 무료 사용자용 모델
 */
export const FREE_TIER_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514', // Claude는 무료 티어 없음, Pro 전용
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
};

/**
 * Pro 사용자용 모델
 */
export const PRO_TIER_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  groq: 'llama-3.3-70b-versatile',
  gemini: 'gemini-2.0-flash',
};

/**
 * 모델별 비용 (1M 토큰당 USD)
 */
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
};

/**
 * 비용 계산
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model] || { input: 0, output: 0 };
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}
