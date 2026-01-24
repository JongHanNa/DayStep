/**
 * Groq 프로바이더
 */

import type { AIProviderClient } from './base.ts';
import type { ChatMessage, ChatResponse, ToolDefinition, ToolCall } from '../types/index.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class GroqProvider implements AIProviderClient {
  provider = 'groq' as const;
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

    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options?.max_tokens) {
      body.max_tokens = options.max_tokens;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }));
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    // Tool Calls 파싱
    const toolCalls: ToolCall[] = [];
    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.type === 'function') {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || '{}'),
          });
        }
      }
    }

    return {
      id: data.id,
      content: message?.content || '',
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
      provider: 'groq',
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

    const body: Record<string, unknown> = {
      model,
      stream: true,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options?.max_tokens) {
      body.max_tokens = options.max_tokens;
    }

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      }));
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    yield JSON.stringify({ type: 'message_start', message_id: 'groq-stream' });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            yield JSON.stringify({ type: 'message_end' });
            continue;
          }

          try {
            const event = JSON.parse(data);
            const delta = event.choices?.[0]?.delta;

            if (delta?.content) {
              yield JSON.stringify({
                type: 'content_delta',
                delta: delta.content,
              });
            }

            // Groq 사용량 (x-groq 헤더에서)
            if (event.x_groq?.usage) {
              yield JSON.stringify({
                type: 'usage',
                usage: {
                  input_tokens: event.x_groq.usage.prompt_tokens || 0,
                  output_tokens: event.x_groq.usage.completion_tokens || 0,
                },
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
