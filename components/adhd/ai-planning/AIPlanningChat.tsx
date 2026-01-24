'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAIPlanningStore, type AIProvider } from '@/state/stores/aiPlanningStore';
import { useSubscriptionStore } from '@/state/stores/subscriptionStore';
import { useAuth } from '@/app/context/AuthContext';
import ChatMessage from './ChatMessage';
import EmptyState from './EmptyState';
import UsageIndicator from './UsageIndicator';
import ProviderSelector from './ProviderSelector';

/**
 * AI 플래닝 채팅 컴포넌트
 *
 * 사용자와 AI가 양방향으로 소통하며 계획을 세우는 채팅 UI
 */
export default function AIPlanningChat() {
  const [input, setInput] = useState('');
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stores
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    provider,
    usage,
    isPro,
    addMessage,
    appendToLastMessage,
    setToolResult,
    setLoading,
    setStreaming,
    setError,
    setProvider,
    setUsage,
    setIsPro,
    clearMessages,
  } = useAIPlanningStore();

  const { hasActiveSubscription } = useSubscriptionStore();
  const { session } = useAuth();

  // Pro 상태 동기화
  useEffect(() => {
    setIsPro(hasActiveSubscription);
  }, [hasActiveSubscription, setIsPro]);

  // 사용량 로드
  useEffect(() => {
    const loadUsage = async () => {
      if (!session?.access_token) return;

      try {
        const response = await fetch('/api/ai/usage', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.usage) {
            setUsage({
              currentCount: data.usage.current_count,
              dailyLimit: data.usage.daily_limit,
              remaining: data.usage.remaining,
              isLimitExceeded: data.usage.is_limit_exceeded,
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
              estimatedCost: data.usage.estimated_cost,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load usage:', err);
      }
    };

    loadUsage();
  }, [session?.access_token, setUsage]);

  // 스크롤 to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 메시지 전송
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // 미로그인 시 안내
    if (!session?.access_token) {
      toast.error('로그인이 필요합니다.', {
        description: 'AI 플래닝 기능을 사용하려면 먼저 로그인해주세요.',
      });
      return;
    }

    const userMessage = input.trim();
    setInput('');

    // 사용자 메시지 추가
    addMessage({
      role: 'user',
      content: userMessage,
    });

    // AI 응답 시작
    setLoading(true);
    setError(null);

    // 빈 assistant 메시지 추가 (스트리밍용)
    addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    });

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          provider,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Chat failed');
      }

      // 스트리밍 처리
      setStreaming(true);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);

            // 다음 라인에서 데이터 읽기
            const dataLineIndex = lines.indexOf(line) + 1;
            if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
              const data = lines[dataLineIndex].slice(6);
              try {
                const parsed = JSON.parse(data);

                switch (eventType) {
                  case 'delta':
                    if (parsed.content) {
                      appendToLastMessage(parsed.content);
                    }
                    break;

                  case 'tool_result':
                    setToolResult(parsed.tool, parsed.result, parsed.is_error);
                    break;

                  case 'done':
                    if (parsed.usage) {
                      // 사용량 업데이트
                      const newUsage = {
                        currentCount: (usage?.currentCount || 0) + 1,
                        dailyLimit: usage?.dailyLimit || (isPro ? 30 : 3),
                        remaining: Math.max(0, (usage?.remaining || (isPro ? 30 : 3)) - 1),
                        isLimitExceeded: (usage?.currentCount || 0) + 1 >= (usage?.dailyLimit || (isPro ? 30 : 3)),
                        inputTokens: (usage?.inputTokens || 0) + parsed.usage.input_tokens,
                        outputTokens: (usage?.outputTokens || 0) + parsed.usage.output_tokens,
                        estimatedCost: (usage?.estimatedCost || 0) + parsed.usage.estimated_cost,
                      };
                      setUsage(newUsage);
                    }
                    break;

                  case 'error':
                    setError(parsed.message || 'Unknown error');
                    break;
                }
              } catch {
                // JSON 파싱 실패 무시
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  // 엔터 키 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 제한 초과 여부
  const isLimitExceeded = usage?.isLimitExceeded || false;

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AI 플래닝</h3>
            <p className="text-xs text-base-content/60">
              ADHD 친화적 계획 수립
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 사용량 표시 */}
          <UsageIndicator usage={usage} isPro={isPro} />

          {/* 프로바이더 선택 */}
          <button
            onClick={() => setShowProviderSelector(!showProviderSelector)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* 대화 초기화 */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="btn btn-ghost btn-sm text-xs"
            >
              새 대화
            </button>
          )}
        </div>
      </div>

      {/* 프로바이더 선택 드롭다운 */}
      <AnimatePresence>
        {showProviderSelector && (
          <ProviderSelector
            currentProvider={provider}
            onSelect={(p) => {
              setProvider(p);
              setShowProviderSelector(false);
            }}
            isPro={isPro}
            onClose={() => setShowProviderSelector(false)}
          />
        )}
      </AnimatePresence>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState onExampleClick={setInput} />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-error/10 text-error text-sm flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="px-4 py-3 border-t border-base-300">
        {isLimitExceeded ? (
          <div className="text-center py-4">
            <p className="text-sm text-base-content/70 mb-2">
              오늘 사용량을 모두 사용했습니다
            </p>
            {!isPro && (
              <button className="btn btn-primary btn-sm">
                Pro로 업그레이드
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="계획이 필요한 일을 말해주세요..."
              className="flex-1 textarea textarea-bordered resize-none min-h-[44px] max-h-[120px] py-2 text-sm"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn btn-primary btn-circle"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
