import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Todo } from '@/entities/todo/Todo';
import { TodoSkipsService } from '@/services/todo-skips.service';
import { ADHDPatternsService, ADHDUserPatterns } from '@/services/adhd-patterns.service';

// ============================================
// 타입 정의
// ============================================

export type ADHDMode = 'entry' | 'execute' | 'organize' | null;

export type SkipReason =
  | 'not_now'      // 지금 상황에 안 맞아
  | 'too_big'      // 너무 큰 일이야
  | 'not_feeling'  // 기분이 안 나
  | 'not_needed';  // 필요 없는 할일이야 (삭제)

// 즉흥 모드 상태 (지금 떠오른 거 할래)
interface AdhocModeState {
  isActive: boolean;
  startedAt: Date | null;
  sessionId: string | null;        // DB 세션 ID (영속화용)
  linkedTodoId: string | null;     // 연결된 미완료 할일 ID
  linkedTodoTitle: string | null;  // 연결된 할일 제목 (표시용)
}

// 실행 모드 상태
interface ExecutionModeState {
  currentRecommendation: Todo | null;
  skippedTodoIds: string[];           // 쿨다운 중인 할일 ID (DB 기반)
  skipCooldowns: Record<string, string>; // 쿨다운 종료 시간 { todoId: cooldown_until }
  completedInSession: number;          // 현재 세션 완료 수
  isLoadingSkips: boolean;             // Skip 로딩 상태
  adhocMode: AdhocModeState;          // 즉흥 포모도로 모드
}

// 정리 모드 상태
interface OrganizeModeState {
  consecutiveTodoAdds: number;         // 연속 할일 추가 수
  startTime: Date | null;              // 정리 모드 시작 시간
}

// DB에서 로드한 패턴 (캐시용)
interface CachedPatterns {
  completedKeywords: Record<string, number>;
  skippedKeywords: Record<string, number>;
  tooBigKeywords: Record<string, number>;
  hourlyCompletionRate: number[];
}

// ============================================
// Store 인터페이스
// ============================================

interface ADHDModeState {
  // 모드 상태
  currentMode: ADHDMode;

  // 실행 모드 상태
  executionMode: ExecutionModeState;

  // 정리 모드 상태
  organizeMode: OrganizeModeState;

  // 사용자 설정
  awakeningSentence: string | null;

  // 패턴 데이터 (DB에서 로드, 캐시용)
  cachedPatterns: CachedPatterns | null;
  isLoadingPatterns: boolean;

  // 현재 사용자 ID (DB 연동용)
  currentUserId: string | null;

  // === 모드 전환 Actions ===
  enterEntryMode: () => void;
  enterExecuteMode: (userId: string) => Promise<void>;
  enterOrganizeMode: () => void;
  exitMode: () => void;

  // === 실행 모드 Actions ===
  setCurrentRecommendation: (todo: Todo | null) => void;
  markCompleted: (todoId: string, method: 'direct' | 'alternative') => void;
  markSkipped: (todoId: string, reason: SkipReason, userId: string) => Promise<void>;
  loadActiveSkips: (userId: string) => Promise<void>;
  resetSession: () => void;

  // === 즉흥 모드 Actions (지금 떠오른 거 할래) ===
  startAdhocMode: () => void;
  endAdhocMode: () => void;
  setSessionId: (sessionId: string | null) => void;
  setLinkedTodo: (todoId: string | null, title: string | null) => void;

  // === 정리 모드 Actions ===
  recordTodoAddition: () => void;
  resetOrganizeMode: () => void;

  // === 설정 Actions ===
  setAwakeningSentence: (sentence: string | null) => void;

  // === 추천 알고리즘 ===
  calculateRecommendationScore: (todo: Todo) => number;

  // === 패턴 학습 Actions (DB 연동) ===
  learnFromCompletion: (todo: Todo, method: 'direct' | 'alternative', userId: string) => Promise<void>;
  learnFromSkip: (todo: Todo, reason: SkipReason, userId: string) => Promise<void>;
  loadUserPatterns: (userId: string) => Promise<void>;

  // === 유틸리티 ===
  resetPatterns: (userId: string) => Promise<void>;
}

// ============================================
// 헬퍼 함수
// ============================================

// 키워드 추출 (한글/영문 단어)
function extractKeywords(title: string): string[] {
  const words = title
    .toLowerCase()
    .split(/[\s,.\-_!?]+/)
    .filter(word => word.length >= 2);
  return words;
}

// 기본 패턴 데이터
const DEFAULT_CACHED_PATTERNS: CachedPatterns = {
  completedKeywords: {},
  skippedKeywords: {},
  tooBigKeywords: {},
  hourlyCompletionRate: Array(24).fill(0),
};

const DEFAULT_ADHOC_MODE: AdhocModeState = {
  isActive: false,
  startedAt: null,
  sessionId: null,
  linkedTodoId: null,
  linkedTodoTitle: null,
};

const DEFAULT_EXECUTION_MODE: ExecutionModeState = {
  currentRecommendation: null,
  skippedTodoIds: [],
  skipCooldowns: {},
  completedInSession: 0,
  isLoadingSkips: false,
  adhocMode: DEFAULT_ADHOC_MODE,
};

const DEFAULT_ORGANIZE_MODE: OrganizeModeState = {
  consecutiveTodoAdds: 0,
  startTime: null,
};

// ============================================
// Store 생성
// ============================================

export const useADHDModeStore = create<ADHDModeState>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        currentMode: null,
        executionMode: DEFAULT_EXECUTION_MODE,
        organizeMode: DEFAULT_ORGANIZE_MODE,
        awakeningSentence: null,
        cachedPatterns: null,
        isLoadingPatterns: false,
        currentUserId: null,

        // === 모드 전환 Actions ===
        enterEntryMode: () => {
          console.log('🎯 ADHD: 진입 화면 모드');
          set({ currentMode: 'entry' });
        },

        enterExecuteMode: async (userId: string) => {
          console.log('🎯 ADHD: 실행 모드 진입');

          set({
            currentMode: 'execute',
            currentUserId: userId,
            executionMode: {
              ...DEFAULT_EXECUTION_MODE,
              isLoadingSkips: true,
            }
          });

          // DB에서 쿨다운 중인 skip 로드 (전체 정보 포함)
          try {
            const activeSkips = await TodoSkipsService.getActiveSkips(userId);
            const skippedTodoIds = activeSkips.map(skip => skip.todo_id);
            const skipCooldowns: Record<string, string> = {};
            activeSkips.forEach(skip => {
              skipCooldowns[skip.todo_id] = skip.cooldown_until;
            });

            set((state) => ({
              executionMode: {
                ...state.executionMode,
                skippedTodoIds,
                skipCooldowns,
                isLoadingSkips: false,
              }
            }));
            console.log(`📥 쿨다운 중인 Skip ${skippedTodoIds.length}개 로드`);
          } catch (error: any) {
            // AbortError는 React 재렌더링으로 인한 정상적인 취소이므로 무시
            if (error?.name !== 'AbortError') {
              console.error('❌ Skip 로드 실패:', error);
            }
            set((state) => ({
              executionMode: {
                ...state.executionMode,
                isLoadingSkips: false,
              }
            }));
          }

          // 패턴 데이터도 로드
          get().loadUserPatterns(userId);
        },

        enterOrganizeMode: () => {
          console.log('🎯 ADHD: 정리 모드 진입');
          set({
            currentMode: 'organize',
            organizeMode: {
              consecutiveTodoAdds: 0,
              startTime: new Date(),
            }
          });
        },

        exitMode: () => {
          console.log('🎯 ADHD: 모드 종료');
          set({
            currentMode: null,
            executionMode: DEFAULT_EXECUTION_MODE,
            organizeMode: DEFAULT_ORGANIZE_MODE,
            currentUserId: null,
          });
        },

        // === 실행 모드 Actions ===
        setCurrentRecommendation: (todo) => {
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              currentRecommendation: todo,
            }
          }));
        },

        markCompleted: (todoId, method) => {
          console.log(`✅ ADHD: 할일 완료 (${method})`, todoId);
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              completedInSession: state.executionMode.completedInSession + 1,
            }
          }));
        },

        markSkipped: async (todoId, reason, userId) => {
          console.log(`⏭️ ADHD: 할일 건너뛰기 (${reason})`, todoId);

          // 쿨다운 종료 시간 계산 (30분 후)
          const cooldownUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

          // 1. 즉시 로컬 상태 업데이트 (낙관적 업데이트)
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              skippedTodoIds: [...state.executionMode.skippedTodoIds, todoId],
              skipCooldowns: {
                ...state.executionMode.skipCooldowns,
                [todoId]: cooldownUntil,
              },
            }
          }));

          // 2. not_needed가 아닌 경우만 DB에 저장 (not_needed는 삭제이므로)
          if (reason !== 'not_needed') {
            try {
              await TodoSkipsService.recordSkip(todoId, userId, reason);
            } catch (error) {
              console.error('❌ Skip DB 저장 실패:', error);
              // 실패해도 로컬 상태는 유지 (UX 우선)
            }
          }
        },

        loadActiveSkips: async (userId: string) => {
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              isLoadingSkips: true,
            }
          }));

          try {
            const activeSkips = await TodoSkipsService.getActiveSkips(userId);
            const skippedTodoIds = activeSkips.map(skip => skip.todo_id);
            const skipCooldowns: Record<string, string> = {};
            activeSkips.forEach(skip => {
              skipCooldowns[skip.todo_id] = skip.cooldown_until;
            });

            set((state) => ({
              executionMode: {
                ...state.executionMode,
                skippedTodoIds,
                skipCooldowns,
                isLoadingSkips: false,
              }
            }));
          } catch (error) {
            console.error('❌ Active Skips 로드 실패:', error);
            set((state) => ({
              executionMode: {
                ...state.executionMode,
                isLoadingSkips: false,
              }
            }));
          }
        },

        resetSession: () => {
          set({ executionMode: DEFAULT_EXECUTION_MODE });
        },

        // === 즉흥 모드 Actions (지금 떠오른 거 할래) ===
        startAdhocMode: () => {
          console.log('🚀 ADHD: 즉흥 모드 시작');
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              adhocMode: {
                ...state.executionMode.adhocMode,
                isActive: true,
                startedAt: new Date(),
              },
            }
          }));
        },

        endAdhocMode: () => {
          console.log('✅ ADHD: 즉흥 모드 종료');
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              adhocMode: DEFAULT_ADHOC_MODE,
            }
          }));
        },

        setSessionId: (sessionId) => {
          console.log('🔗 ADHD: 세션 ID 설정', sessionId);
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              adhocMode: {
                ...state.executionMode.adhocMode,
                sessionId,
              },
            }
          }));
        },

        setLinkedTodo: (todoId, title) => {
          console.log('🔗 ADHD: 연결된 할일 설정', { todoId, title });
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              adhocMode: {
                ...state.executionMode.adhocMode,
                linkedTodoId: todoId,
                linkedTodoTitle: title,
              },
            }
          }));
        },

        // === 정리 모드 Actions ===
        recordTodoAddition: () => {
          console.log('📝 ADHD: 할일 추가 감지');
          set((state) => ({
            organizeMode: {
              ...state.organizeMode,
              consecutiveTodoAdds: state.organizeMode.consecutiveTodoAdds + 1,
            }
          }));
        },

        resetOrganizeMode: () => {
          console.log('🔄 ADHD: 정리 모드 상태 리셋');
          set({ organizeMode: DEFAULT_ORGANIZE_MODE });
        },

        // === 설정 Actions ===
        setAwakeningSentence: (sentence) => {
          console.log('💡 ADHD: 각성 문장 설정', sentence);
          set({ awakeningSentence: sentence });
        },

        // === 추천 알고리즘 ===
        calculateRecommendationScore: (todo) => {
          const { cachedPatterns } = get();
          const patterns = cachedPatterns || DEFAULT_CACHED_PATTERNS;
          let score = 100; // 기본 점수

          // === 규칙 기반 점수 ===

          // 1. 제목 길이 (짧을수록 +점수)
          const titleLength = todo.title.length;
          if (titleLength <= 10) score += 30;
          else if (titleLength <= 20) score += 20;
          else if (titleLength <= 30) score += 10;
          else score -= 10;

          // 2. 시간 지정 없음 +20점
          if (todo.scheduleType === 'anytime') score += 20;

          // 3. 시간 지정 할일은 해당 시간대에 우선 추천
          if (todo.scheduleType === 'timed' && todo.startTime) {
            const now = new Date();
            const startTime = new Date(todo.startTime);
            const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

            if (diffMinutes <= 30) score += 40;
            else if (diffMinutes <= 60) score += 20;
          }

          // 4. 반복 할일 -10점
          if (todo.recurrencePattern && todo.recurrencePattern !== 'none') {
            score -= 10;
          }

          // 5. 우선순위 반영
          if (todo.priority === 'high') score += 25;
          else if (todo.priority === 'medium') score += 10;

          // === 패턴 기반 점수 ===
          const hour = new Date().getHours();

          // 현재 시간대 완료율 반영 (+0~30점)
          const hourlyRate = patterns.hourlyCompletionRate[hour] || 0;
          score += Math.min(hourlyRate * 3, 30);

          // 키워드 매칭
          const keywords = extractKeywords(todo.title);
          keywords.forEach(kw => {
            if (patterns.completedKeywords[kw]) score += 5;
            if (patterns.skippedKeywords[kw]) score -= 3;
            if (patterns.tooBigKeywords[kw]) score -= 5;
          });

          return score;
        },

        // === 패턴 학습 Actions (DB 연동) ===
        learnFromCompletion: async (todo, method, userId) => {
          console.log('📊 ADHD: 완료 패턴 학습', { todoTitle: todo.title, method });

          // 백그라운드로 DB 업데이트 (실패해도 UX에 영향 없음)
          try {
            await ADHDPatternsService.updateCompletionPattern(userId, todo, method);

            // 캐시 갱신
            const patterns = await ADHDPatternsService.getPatternsForScoring(userId);
            set({ cachedPatterns: patterns });
          } catch (error) {
            console.error('❌ 완료 패턴 학습 실패:', error);
          }
        },

        learnFromSkip: async (todo, reason, userId) => {
          // not_needed는 학습 대상 아님
          if (reason === 'not_needed') return;

          console.log('📊 ADHD: 스킵 패턴 학습', { todoTitle: todo.title, reason });

          try {
            await ADHDPatternsService.updateSkipPattern(userId, todo, reason);

            // 캐시 갱신
            const patterns = await ADHDPatternsService.getPatternsForScoring(userId);
            set({ cachedPatterns: patterns });
          } catch (error) {
            console.error('❌ 스킵 패턴 학습 실패:', error);
          }
        },

        loadUserPatterns: async (userId: string) => {
          set({ isLoadingPatterns: true });

          try {
            const patterns = await ADHDPatternsService.getPatternsForScoring(userId);
            set({
              cachedPatterns: patterns,
              isLoadingPatterns: false
            });
            console.log('📥 ADHD 패턴 데이터 로드 완료');
          } catch (error) {
            console.error('❌ 패턴 데이터 로드 실패:', error);
            set({ isLoadingPatterns: false });
          }
        },

        // === 유틸리티 ===
        resetPatterns: async (userId: string) => {
          console.log('🔄 ADHD: 패턴 데이터 초기화');
          try {
            await ADHDPatternsService.resetPatterns(userId);
            set({ cachedPatterns: DEFAULT_CACHED_PATTERNS });
          } catch (error) {
            console.error('❌ 패턴 초기화 실패:', error);
          }
        },
      }),
      {
        name: 'adhd-mode-store',
        partialize: (state) => ({
          awakeningSentence: state.awakeningSentence,
          // userPatterns는 더 이상 persist하지 않음 (DB에서 로드)
          // currentMode와 executionMode는 세션별 초기화
        }),
      }
    ),
    {
      name: 'adhd-mode-store',
    }
  )
);
