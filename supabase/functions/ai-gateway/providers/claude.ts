/**
 * Claude (Anthropic) 프로바이더
 */

import type { AIProviderClient } from './base.ts';
import type { ChatMessage, ChatResponse, ToolDefinition, ToolCall } from '../types/index.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class ClaudeProvider implements AIProviderClient {
  provider = 'claude' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      tools?: ToolDefinition[];
    }
  ): Promise<ChatResponse> {
    const model = options?.model || DEFAULT_MODEL;

    // 시스템 메시지 분리
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.max_tokens || 4096,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // 응답 파싱
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of data.content || []) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    return {
      id: data.id,
      content,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
      },
      provider: 'claude',
      model,
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      tools?: ToolDefinition[];
    }
  ): AsyncGenerator<string, void, unknown> {
    const model = options?.model || DEFAULT_MODEL;

    // 시스템 메시지 분리
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: options?.max_tokens || 4096,
      stream: true,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      }));
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 파싱
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            // 텍스트 델타
            if (event.type === 'content_block_delta') {
              if (event.delta?.type === 'text_delta') {
                yield JSON.stringify({
                  type: 'content_delta',
                  delta: event.delta.text,
                });
              } else if (event.delta?.type === 'input_json_delta') {
                // Tool input 스트리밍
                yield JSON.stringify({
                  type: 'tool_input_delta',
                  delta: event.delta.partial_json,
                });
              }
            }

            // Tool Use 시작
            if (event.type === 'content_block_start') {
              if (event.content_block?.type === 'tool_use') {
                yield JSON.stringify({
                  type: 'tool_use_start',
                  tool_call: {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: {},
                  },
                });
              }
            }

            // 메시지 종료
            if (event.type === 'message_delta') {
              if (event.usage) {
                yield JSON.stringify({
                  type: 'usage',
                  usage: {
                    input_tokens: event.usage.input_tokens || 0,
                    output_tokens: event.usage.output_tokens || 0,
                  },
                });
              }
            }

            // 메시지 시작
            if (event.type === 'message_start') {
              yield JSON.stringify({
                type: 'message_start',
                message_id: event.message?.id,
              });
            }

            // 메시지 완전 종료
            if (event.type === 'message_stop') {
              yield JSON.stringify({
                type: 'message_end',
              });
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }
  }
}
