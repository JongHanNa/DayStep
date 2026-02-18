/**
 * AI Planning Store (Zustand)
 * AI 채팅 + 프로바이더 선택 + 사용량 추적
 * persist 불필요 (세션 데이터)
 */
import {create} from 'zustand';
import Config from 'react-native-config';

export type AIProvider = 'claude' | 'openai' | 'groq' | 'gemini';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface AIUsage {
  currentCount: number;
  dailyLimit: number;
  remaining: number;
  isLimitExceeded: boolean;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

interface AIPlanningState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  provider: AIProvider;
  availableProviders: AIProvider[];
  usage: AIUsage | null;
  isPro: boolean;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendToLastMessage: (delta: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setProvider: (provider: AIProvider) => void;
  setIsPro: (isPro: boolean) => void;
  setUsage: (usage: AIUsage) => void;
  sendMessage: (userId: string, content: string) => Promise<void>;
  fetchUsage: (userId: string) => Promise<void>;
  reset: () => void;
}

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const API_BASE = Config.SUPABASE_URL
  ? `${Config.SUPABASE_URL}/functions/v1`
  : '';

export const useAIPlanningStore = create<AIPlanningState>()((set, get) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  provider: 'groq',
  availableProviders: ['openai', 'groq', 'gemini'],
  usage: null,
  isPro: false,

  addMessage: (message) => {
    set(state => ({
      messages: [
        ...state.messages,
        {...message, id: generateId(), timestamp: new Date()},
      ],
    }));
  },

  appendToLastMessage: (delta) => {
    set(state => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {...last, content: last.content + delta};
      }
      return {messages};
    });
  },

  clearMessages: () => set({messages: []}),

  setLoading: (loading) => set({isLoading: loading}),

  setStreaming: (streaming) => {
    set(state => {
      if (!streaming) {
        const messages = state.messages.map(m =>
          m.isStreaming ? {...m, isStreaming: false} : m,
        );
        return {isStreaming: false, messages};
      }
      return {isStreaming: streaming};
    });
  },

  setError: (error) => set({error}),

  setProvider: (provider) => set({provider}),

  setIsPro: (isPro) => {
    set({
      isPro,
      availableProviders: isPro
        ? ['claude', 'openai', 'groq', 'gemini']
        : ['openai', 'groq', 'gemini'],
    });
  },

  setUsage: (usage) => set({usage}),

  sendMessage: async (userId, content) => {
    const {provider, addMessage, appendToLastMessage, setLoading, setStreaming, setError} = get();

    // 유저 메시지 추가
    addMessage({role: 'user', content});

    // 어시스턴트 스트리밍 메시지 준비
    addMessage({role: 'assistant', content: '', isStreaming: true});

    setLoading(true);
    setStreaming(true);
    setError(null);

    try {
      const {data: {session}} = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) throw new Error('인증이 필요합니다');

      // 메시지 히스토리 구성
      const history = get().messages
        .filter(m => !m.isStreaming)
        .map(m => ({role: m.role, content: m.content}));

      const response = await fetch(`${API_BASE}/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: history,
          provider,
          userId,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `API 오류 (${response.status})`);
      }

      // 스트리밍 응답 처리
      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const {value, done: streamDone} = await reader.read();
          done = streamDone;
          if (value) {
            const chunk = decoder.decode(value, {stream: true});
            appendToLastMessage(chunk);
          }
        }
      } else {
        // 스트리밍 미지원 시 전체 응답
        const data = await response.json();
        appendToLastMessage(data.content ?? data.message ?? '');
      }
    } catch (err: any) {
      console.error('[AIPlanningStore] Send error:', err);
      setError(err.message ?? 'Failed to send message');
      // 에러 시 빈 어시스턴트 메시지에 에러 표시
      appendToLastMessage(`\n\n⚠️ 오류: ${err.message}`);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  },

  fetchUsage: async (userId) => {
    try {
      const {data: {session}} = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(`${API_BASE}/ai-usage?userId=${userId}`, {
        headers: {Authorization: `Bearer ${token}`},
      });

      if (response.ok) {
        const data = await response.json();
        set({usage: data as AIUsage});
      }
    } catch (err) {
      console.error('[AIPlanningStore] Usage fetch error:', err);
    }
  },

  reset: () =>
    set({
      messages: [],
      isLoading: false,
      isStreaming: false,
      error: null,
      usage: null,
    }),
}));
