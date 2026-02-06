/**
 * AI 프로바이더 팩토리
 */

import type { AIProvider } from '../types/index.ts';
import type { AIProviderClient } from './base.ts';
import { ClaudeProvider } from './claude.ts';
import { OpenAIProvider } from './openai.ts';
import { GroqProvider } from './groq.ts';
import { GeminiProvider } from './gemini.ts';

// ============================================================================
// 환경 변수에서 API 키 가져오기
// ============================================================================

const API_KEYS: Record<AIProvider, string> = {
  claude: Deno.env.get('ANTHROPIC_API_KEY') || '',
  openai: Deno.env.get('OPENAI_API_KEY') || '',
  groq: Deno.env.get('GROQ_API_KEY') || '',
  gemini: Deno.env.get('GEMINI_API_KEY') || '',
};

// ============================================================================
// 프로바이더 팩토리
// ============================================================================

/**
 * 프로바이더 인스턴스 생성
 */
export function createProvider(provider: AIProvider): AIProviderClient {
  const apiKey = API_KEYS[provider];

  if (!apiKey) {
    throw new Error(`API key not configured for provider: ${provider}`);
  }

  switch (provider) {
    case 'claude':
      return new ClaudeProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'groq':
      return new GroqProvider(apiKey);
    case 'gemini':
      return new GeminiProvider(apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * 사용 가능한 프로바이더 목록
 */
export function getAvailableProviders(): AIProvider[] {
  const available: AIProvider[] = [];

  for (const [provider, apiKey] of Object.entries(API_KEYS)) {
    if (apiKey) {
      available.push(provider as AIProvider);
    }
  }

  return available;
}

/**
 * 프로바이더가 사용 가능한지 확인
 */
export function isProviderAvailable(provider: AIProvider): boolean {
  return !!API_KEYS[provider];
}
