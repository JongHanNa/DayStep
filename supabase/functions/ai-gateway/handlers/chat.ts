/**
 * 채팅 핸들러
 *
 * AI 채팅 요청 처리 및 Tool Use 오케스트레이션
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { ChatRequest, ChatMessage, AIProvider, ToolCall } from '../types/index.ts';
import { createProvider } from '../providers/index.ts';
import { PRO_TIER_MODELS, FREE_TIER_MODELS, calculateCost } from '../providers/base.ts';
import { getToolDefinitions } from '../tools/definitions.ts';
import { executeTool } from '../tools/executor.ts';
import { createJsonResponse, createStreamResponse, formatSSE, CORS_HEADERS } from '../utils/response.ts';
import { generateSystemPrompt } from '../../_shared/prompts/adhd-planning.ts';

// ============================================================================
// 시스템 프롬프트
// ============================================================================

// 공통 모듈에서 생성 (일관성 확보)
const SYSTEM_PROMPT = generateSystemPrompt();

// ============================================================================
// 비스트리밍 채팅
// ============================================================================

export async function handleChat(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  userId: string,
  body: ChatRequest
): Promise<Response> {
  const { messages, provider: requestedProvider, model: requestedModel } = body;

  // 구독 상태 확인
  const isPro = await checkProStatus(supabase, userId);

  // 사용량 제한 확인
  const limitCheck = await checkUsageLimit(supabaseAdmin, userId, isPro);
  if (!limitCheck.can_proceed) {
    return createJsonResponse(
      {
        error: 'Daily limit exceeded',
        message: isPro
          ? '오늘 AI 사용량을 모두 사용했습니다. (30회/일)'
          : '오늘 무료 AI 사용량을 모두 사용했습니다. (3회/일) Pro로 업그레이드하면 더 많이 사용할 수 있어요!',
        usage: limitCheck,
      },
      429
    );
  }

  // 프로바이더 및 모델 결정
  const provider = requestedProvider || (isPro ? 'claude' : 'openai');
  const model =
    requestedModel || (isPro ? PRO_TIER_MODELS[provider] : FREE_TIER_MODELS[provider]);

  // 무료 사용자 Claude 차단
  if (!isPro && provider === 'claude') {
    return createJsonResponse(
      {
        error: 'Pro required',
        message: 'Claude는 Pro 사용자만 사용할 수 있습니다.',
      },
      403
    );
  }

  try {
    const providerClient = createProvider(provider as AIProvider);
    const tools = getToolDefinitions();

    // 시스템 프롬프트 추가
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // AI 호출
    let response = await providerClient.chat(fullMessages, {
      model,
      temperature: 0.7,
      max_tokens: 4096,
      tools,
    });

    // Tool Use 처리 (최대 5회 반복)
    let iterations = 0;
    const maxIterations = 5;
    const toolResults: Array<{ tool: string; result: unknown }> = [];

    while (response.tool_calls && response.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++;

      // 도구 실행
      for (const toolCall of response.tool_calls) {
        const result = await executeTool(supabase, userId, toolCall);
        toolResults.push({
          tool: toolCall.name,
          result: JSON.parse(result.content),
        });

        // 도구 결과를 메시지에 추가
        fullMessages.push({
          role: 'assistant',
          content: response.content || '',
        });
        fullMessages.push({
          role: 'user',
          content: `[Tool Result for ${toolCall.name}]: ${result.content}`,
        });
      }

      // 다시 AI 호출
      response = await providerClient.chat(fullMessages, {
        model,
        temperature: 0.7,
        max_tokens: 4096,
        tools,
      });
    }

    // 사용량 기록
    const usage = response.usage || { input_tokens: 0, output_tokens: 0 };
    const cost = calculateCost(model, usage.input_tokens, usage.output_tokens);

    await incrementUsage(supabaseAdmin, userId, isPro, usage.input_tokens, usage.output_tokens, cost, provider, model);

    return createJsonResponse({
      id: response.id,
      content: response.content,
      tool_results: toolResults.length > 0 ? toolResults : undefined,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost: cost,
      },
      provider,
      model,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return createJsonResponse(
      {
        error: 'Chat failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

// ============================================================================
// 스트리밍 채팅
// ============================================================================

export async function handleStreamingChat(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  userId: string,
  body: ChatRequest
): Promise<Response> {
  const { messages, provider: requestedProvider, model: requestedModel } = body;

  // 구독 상태 확인
  const isPro = await checkProStatus(supabase, userId);

  // 사용량 제한 확인
  const limitCheck = await checkUsageLimit(supabaseAdmin, userId, isPro);
  if (!limitCheck.can_proceed) {
    return createJsonResponse(
      {
        error: 'Daily limit exceeded',
        message: isPro
          ? '오늘 AI 사용량을 모두 사용했습니다. (30회/일)'
          : '오늘 무료 AI 사용량을 모두 사용했습니다. (3회/일)',
        usage: limitCheck,
      },
      429
    );
  }

  // 프로바이더 및 모델 결정
  const provider = requestedProvider || (isPro ? 'claude' : 'openai');
  const model =
    requestedModel || (isPro ? PRO_TIER_MODELS[provider] : FREE_TIER_MODELS[provider]);

  // 무료 사용자 Claude 차단
  if (!isPro && provider === 'claude') {
    return createJsonResponse(
      {
        error: 'Pro required',
        message: 'Claude는 Pro 사용자만 사용할 수 있습니다.',
      },
      403
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const providerClient = createProvider(provider as AIProvider);
        const tools = getToolDefinitions();

        // 시스템 프롬프트 추가
        const fullMessages: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ];

        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let accumulatedContent = '';
        const pendingToolCalls: ToolCall[] = [];

        // 스트리밍 시작
        const streamGenerator = providerClient.streamChat(fullMessages, {
          model,
          temperature: 0.7,
          max_tokens: 4096,
          tools,
        });

        let messageEndReceived = false;

        for await (const chunk of streamGenerator) {
          try {
            const event = JSON.parse(chunk);

            if (event.type === 'content_delta') {
              accumulatedContent += event.delta;
              controller.enqueue(encoder.encode(formatSSE('delta', { content: event.delta })));
            }

            if (event.type === 'tool_use_start') {
              pendingToolCalls.push(event.tool_call);
              controller.enqueue(
                encoder.encode(formatSSE('tool_start', { tool: event.tool_call.name }))
              );
            }

            if (event.type === 'usage') {
              totalInputTokens = event.usage.input_tokens;
              totalOutputTokens = event.usage.output_tokens;
            }

            if (event.type === 'message_end') {
              messageEndReceived = true;

              // Tool Calls 처리
              if (pendingToolCalls.length > 0) {
                for (const toolCall of pendingToolCalls) {
                  controller.enqueue(
                    encoder.encode(formatSSE('tool_executing', { tool: toolCall.name }))
                  );

                  const result = await executeTool(supabase, userId, toolCall);

                  controller.enqueue(
                    encoder.encode(
                      formatSSE('tool_result', {
                        tool: toolCall.name,
                        result: JSON.parse(result.content),
                        is_error: result.is_error,
                      })
                    )
                  );
                }
              }

              // 사용량 기록
              const cost = calculateCost(model, totalInputTokens, totalOutputTokens);
              await incrementUsage(
                supabaseAdmin,
                userId,
                isPro,
                totalInputTokens,
                totalOutputTokens,
                cost,
                provider,
                model
              );

              controller.enqueue(
                encoder.encode(
                  formatSSE('done', {
                    usage: {
                      input_tokens: totalInputTokens,
                      output_tokens: totalOutputTokens,
                      estimated_cost: cost,
                    },
                  })
                )
              );
            }
          } catch {
            // 파싱 실패 시 raw 전송
            controller.enqueue(encoder.encode(formatSSE('raw', { data: chunk })));
          }
        }

        // 스트림 종료 후 done 이벤트 보장 (message_end 미수신 시)
        if (!messageEndReceived) {
          console.warn('[chat.ts] Stream ended without message_end, sending done event');
          const cost = calculateCost(model, totalInputTokens, totalOutputTokens);
          await incrementUsage(
            supabaseAdmin,
            userId,
            isPro,
            totalInputTokens,
            totalOutputTokens,
            cost,
            provider,
            model
          );
          controller.enqueue(
            encoder.encode(
              formatSSE('done', {
                usage: {
                  input_tokens: totalInputTokens,
                  output_tokens: totalOutputTokens,
                  estimated_cost: cost,
                },
              })
            )
          );
        }

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(
          encoder.encode(
            formatSSE('error', {
              message: error instanceof Error ? error.message : 'Unknown error',
            })
          )
        );
        controller.close();
      }
    },
  });

  return createStreamResponse(stream);
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * Pro 구독 상태 확인
 */
async function checkProStatus(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .single();

  return data?.status === 'active' || data?.status === 'trial';
}

/**
 * 사용량 제한 확인
 */
async function checkUsageLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  isPro: boolean
): Promise<{ can_proceed: boolean; current_count: number; daily_limit: number; remaining: number }> {
  const { data, error } = await supabaseAdmin.rpc('check_ai_limit', {
    p_user_id: userId,
    p_is_pro: isPro,
  });

  if (error) {
    console.error('Usage check error:', error);
    // 오류 시 일단 허용
    return { can_proceed: true, current_count: 0, daily_limit: isPro ? 30 : 3, remaining: isPro ? 30 : 3 };
  }

  return data;
}

/**
 * 사용량 증가
 */
async function incrementUsage(
  supabaseAdmin: SupabaseClient,
  userId: string,
  isPro: boolean,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  provider: string,
  model: string
): Promise<void> {
  const { error } = await supabaseAdmin.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_is_pro: isPro,
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
    p_estimated_cost: cost,
    p_provider: provider,
    p_model: model,
  });

  if (error) {
    console.error('Usage increment error:', error);
  }
}
