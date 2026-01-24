/**
 * Google Gemini 프로바이더
 */

import type { AIProviderClient } from './base.ts';
import type { ChatMessage, ChatResponse, ToolDefinition, ToolCall } from '../types/index.ts';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProviderClient {
  provider = 'gemini' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getApiUrl(model: string, streaming = false): string {
    const action = streaming ? 'streamGenerateContent' : 'generateContent';
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?key=${this.apiKey}`;
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

    // 시스템 메시지와 채팅 메시지 분리
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Gemini 형식으로 변환
    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        // 반복 억제 파라미터 (Gemini 반복 문제 해결)
        frequencyPenalty: 0.4,
        presencePenalty: 0.2,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (options?.max_tokens) {
      (body.generationConfig as Record<string, unknown>).maxOutputTokens = options.max_tokens;
    }

    if (options?.temperature !== undefined) {
      (body.generationConfig as Record<string, unknown>).temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
          })),
        },
      ];
    }

    const response = await fetch(this.getApiUrl(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const content = candidate?.content;

    // 응답 파싱
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    for (const part of content?.parts || []) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `gemini-${Date.now()}-${toolCalls.length}`,
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        });
      }
    }

    return {
      id: `gemini-${Date.now()}`,
      content: textContent,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount || 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
      provider: 'gemini',
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

    // 시스템 메시지와 채팅 메시지 분리
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Gemini 형식으로 변환
    const contents = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        // 반복 억제 파라미터 (Gemini 반복 문제 해결)
        frequencyPenalty: 0.4,
        presencePenalty: 0.2,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    if (options?.max_tokens) {
      (body.generationConfig as Record<string, unknown>).maxOutputTokens = options.max_tokens;
    }

    if (options?.temperature !== undefined) {
      (body.generationConfig as Record<string, unknown>).temperature = options.temperature;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.input_schema,
          })),
        },
      ];
    }

    const response = await fetch(this.getApiUrl(model, true) + '&alt=sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    yield JSON.stringify({ type: 'message_start', message_id: 'gemini-stream' });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const event = JSON.parse(data);
            const candidate = event.candidates?.[0];
            const content = candidate?.content;

            for (const part of content?.parts || []) {
              if (part.text) {
                yield JSON.stringify({
                  type: 'content_delta',
                  delta: part.text,
                });
              }
              if (part.functionCall) {
                yield JSON.stringify({
                  type: 'tool_use_start',
                  tool_call: {
                    id: `gemini-${Date.now()}`,
                    name: part.functionCall.name,
                    input: part.functionCall.args || {},
                  },
                });
              }
            }

            // 사용량
            if (event.usageMetadata) {
              yield JSON.stringify({
                type: 'usage',
                usage: {
                  input_tokens: event.usageMetadata.promptTokenCount || 0,
                  output_tokens: event.usageMetadata.candidatesTokenCount || 0,
                },
              });
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }

    yield JSON.stringify({ type: 'message_end' });
  }
}
