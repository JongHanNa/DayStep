import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * AI 프로바이더 타입
 */
export type AIProvider = 'claude' | 'openai' | 'groq' | 'gemini';

/**
 * 채팅 메시지 타입
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolResults?: Array<{
    tool: string;
    result: unknown;
    isError?: boolean;
  }>;
  isStreaming?: boolean;
}

/**
 * 사용량 정보
 */
export interface AIUsage {
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  isLimitExceeded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

/**
 * AI 플래닝 Store 상태
 */
interface AIPlanningState {
  // 채팅 상태
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;

  // 프로바이더 설정
  provider: AIProvider;
  availableProviders: AIProvider[];

  // 사용량
  usage: AIUsage | null;
  isPro: boolean;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string) => void;
  appendToLastMessage: (delta: string) => void;
  setToolResult: (toolName: string, result: unknown, isError?: boolean) => void;
  clearMessages: () => void;

  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;

  setProvider: (provider: AIProvider) => void;
  setAvailableProviders: (providers: AIProvider[]) => void;

  setUsage: (usage: AIUsage) => void;
  setIsPro: (isPro: boolean) => void;

  reset: () => void;
}

/**
 * 고유 ID 생성
 */
function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 초기 상태
 */
const initialState = {
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  provider: 'gemini' as AIProvider,
  availableProviders: ['openai', 'groq', 'gemini'] as AIProvider[],
  usage: null,
  isPro: false,
};

/**
 * AI 플래닝 Store
 */
export const useAIPlanningStore = create<AIPlanningState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // 메시지 추가
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      // 마지막 메시지 업데이트
      updateLastMessage: (content) => {
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            messages[messages.length - 1] = {
              ...messages[messages.length - 1],
              content,
              isStreaming: false,
            };
          }
          return { messages };
        });
      },

      // 마지막 메시지에 델타 추가 (스트리밍용)
      appendToLastMessage: (delta) => {
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            messages[messages.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + delta,
              isStreaming: true,
            };
          }
          return { messages };
        });
      },

      // Tool 결과 설정
      setToolResult: (toolName, result, isError = false) => {
        set((state) => {
          const messages = [...state.messages];
          if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const toolResults = lastMessage.toolResults || [];
            messages[messages.length - 1] = {
              ...lastMessage,
              toolResults: [...toolResults, { tool: toolName, result, isError }],
            };
          }
          return { messages };
        });
      },

      // 메시지 초기화
      clearMessages: () => {
        set({ messages: [] });
      },

      // 로딩 상태
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // 스트리밍 상태
      setStreaming: (streaming) => {
        set({ isStreaming: streaming });
      },

      // 에러 상태
      setError: (error) => {
        set({ error });
      },

      // 프로바이더 설정
      setProvider: (provider) => {
        set({ provider });
      },

      // 사용 가능한 프로바이더
      setAvailableProviders: (providers) => {
        set({ availableProviders: providers });
      },

      // 사용량 설정
      setUsage: (usage) => {
        set({ usage });
      },

      // Pro 상태 설정
      setIsPro: (isPro) => {
        set({
          isPro,
          // Pro 사용자는 Claude 사용 가능
          availableProviders: isPro
            ? ['claude', 'openai', 'groq', 'gemini']
            : ['openai', 'groq', 'gemini'],
          // 기본 프로바이더 변경
          provider: isPro ? 'claude' : 'gemini',
        });
      },

      // 전체 초기화
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'ai-planning-store',
    }
  )
);
