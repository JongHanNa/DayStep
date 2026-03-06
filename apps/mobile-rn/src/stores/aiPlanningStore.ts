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

      // XMLHttpRequest 기반 SSE 스트리밍 (RN은 fetch의 ReadableStream 미지원)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/ai-gateway/chat`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        let buffer = '';
        let lastIndex = 0;

        const processLines = (lines: string[]) => {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event: ')) {
              const eventType = line.slice(7);
              const dataLineIndex = i + 1;
              if (dataLineIndex < lines.length && lines[dataLineIndex].startsWith('data: ')) {
                const data = lines[dataLineIndex].slice(6);
                try {
                  const parsed = JSON.parse(data);
                  switch (eventType) {
                    case 'delta':
                      if (parsed.content) appendToLastMessage(parsed.content);
                      break;
                    case 'tool_start':
                      appendToLastMessage('할일을 생성하고 있습니다...\n');
                      break;
                    case 'tool_result':
                      if (parsed.is_error) {
                        appendToLastMessage('생성 중 오류가 발생했습니다.');
                      } else {
                        appendToLastMessage('프로젝트와 할일이 생성되었습니다.');
                      }
                      break;
                    case 'tool_executing':
                      break;
                    case 'done':
                      break;
                    case 'error':
                      setError(parsed.message || 'Unknown error');
                      break;
                  }
                } catch {}
              }
            }
          }
        };

        xhr.onprogress = () => {
          const newData = xhr.responseText.substring(lastIndex);
          lastIndex = xhr.responseText.length;

          buffer += newData;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          processLines(lines);
        };

        xhr.onload = () => {
          // 잔여 버퍼 처리
          if (buffer.trim()) {
            processLines(buffer.split('\n'));
          }
          if (xhr.status >= 400) {
            reject(new Error(xhr.responseText || `API 오류 (${xhr.status})`));
          } else {
            resolve();
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.ontimeout = () => reject(new Error('Request timeout'));
        xhr.timeout = 60000;

        xhr.send(JSON.stringify({
          messages: history,
          provider,
          userId,
        }));
      });
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

      const response = await fetch(`${API_BASE}/ai-gateway/usage?userId=${userId}`, {
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
