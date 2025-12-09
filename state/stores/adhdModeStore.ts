import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Todo } from '@/entities/todo/Todo';

// ============================================
// 타입 정의
// ============================================

export type ADHDMode = 'entry' | 'execute' | 'organize' | null;

export type SkipReason =
  | 'not_now'      // 지금 상황에 안 맞아
  | 'too_big'      // 너무 큰 일이야
  | 'not_feeling'; // 기분이 안 나

interface SkipRecord {
  todoId: string;
  reason: SkipReason;
  timestamp: Date;
  hour: number;
}

interface CompletionRecord {
  todoId: string;
  method: 'direct' | 'alternative'; // 직접 완료 vs 다른 방법으로 완료
  timestamp: Date;
  hour: number;
}

// 사용자 패턴 학습 데이터
interface UserPatterns {
  // 완료한 할일 특성
  completedPatterns: {
    avgTitleLength: number;
    keywords: Record<string, number>; // 자주 완료하는 키워드 빈도
    hourlyCompletionRate: number[];   // 시간대별 완료율 (0-23)
  };

  // 건너뛴 할일 특성
  skippedPatterns: {
    keywords: Record<string, number>;       // 자주 건너뛰는 키워드 빈도
    tooBigKeywords: Record<string, number>; // "너무 큰 일" 사유로 건너뛴 키워드
  };

  // 학습 히스토리 (최근 100개)
  completionHistory: CompletionRecord[];
  skipHistory: SkipRecord[];
}

// 실행 모드 상태
interface ExecutionModeState {
  currentRecommendation: Todo | null;
  skippedTodoIds: string[];           // 현재 세션에서 건너뛴 할일
  completedInSession: number;          // 현재 세션 완료 수
}

// 정리 모드 상태
interface OrganizeModeState {
  consecutiveTodoAdds: number;         // 연속 할일 추가 수
  startTime: Date | null;              // 정리 모드 시작 시간
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

  // 사용자 설정 (settingsStore에서도 저장하지만 여기서도 캐시)
  awakeningSentence: string | null;

  // 패턴 학습 데이터
  userPatterns: UserPatterns;

  // === 모드 전환 Actions ===
  enterEntryMode: () => void;
  enterExecuteMode: () => void;
  enterOrganizeMode: () => void;
  exitMode: () => void;

  // === 실행 모드 Actions ===
  setCurrentRecommendation: (todo: Todo | null) => void;
  markCompleted: (todoId: string, method: 'direct' | 'alternative') => void;
  markSkipped: (todoId: string, reason: SkipReason) => void;
  resetSession: () => void;

  // === 정리 모드 Actions ===
  recordTodoAddition: () => void;
  resetOrganizeMode: () => void;

  // === 설정 Actions ===
  setAwakeningSentence: (sentence: string | null) => void;

  // === 추천 알고리즘 ===
  calculateRecommendationScore: (todo: Todo) => number;

  // === 패턴 학습 Actions ===
  learnFromCompletion: (todo: Todo, method: 'direct' | 'alternative') => void;
  learnFromSkip: (todo: Todo, reason: SkipReason) => void;

  // === 유틸리티 ===
  resetPatterns: () => void;
}

// ============================================
// 헬퍼 함수
// ============================================

// 키워드 추출 (한글/영문 단어)
function extractKeywords(title: string): string[] {
  // 한글, 영문 단어 추출 (2글자 이상)
  const words = title
    .toLowerCase()
    .split(/[\s,.\-_!?]+/)
    .filter(word => word.length >= 2);
  return words;
}

// 기본 패턴 데이터
const DEFAULT_USER_PATTERNS: UserPatterns = {
  completedPatterns: {
    avgTitleLength: 0,
    keywords: {},
    hourlyCompletionRate: Array(24).fill(0),
  },
  skippedPatterns: {
    keywords: {},
    tooBigKeywords: {},
  },
  completionHistory: [],
  skipHistory: [],
};

const DEFAULT_EXECUTION_MODE: ExecutionModeState = {
  currentRecommendation: null,
  skippedTodoIds: [],
  completedInSession: 0,
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
        userPatterns: DEFAULT_USER_PATTERNS,

        // === 모드 전환 Actions ===
        enterEntryMode: () => {
          console.log('🎯 ADHD: 진입 화면 모드');
          set({ currentMode: 'entry' });
        },

        enterExecuteMode: () => {
          console.log('🎯 ADHD: 실행 모드 진입');
          set({
            currentMode: 'execute',
            executionMode: {
              ...get().executionMode,
              skippedTodoIds: [],
              completedInSession: 0,
            }
          });
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

        markSkipped: (todoId, reason) => {
          console.log(`⏭️ ADHD: 할일 건너뛰기 (${reason})`, todoId);
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              skippedTodoIds: [...state.executionMode.skippedTodoIds, todoId],
            }
          }));
        },

        resetSession: () => {
          set({ executionMode: DEFAULT_EXECUTION_MODE });
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
          const { userPatterns } = get();
          let score = 100; // 기본 점수

          // === 규칙 기반 점수 ===

          // 1. 제목 길이 (짧을수록 +점수, 간단한 작업일 가능성)
          const titleLength = todo.title.length;
          if (titleLength <= 10) score += 30;
          else if (titleLength <= 20) score += 20;
          else if (titleLength <= 30) score += 10;
          else score -= 10;

          // 2. 시간 지정 없음 +20점 (유연성, 지금 바로 할 수 있음)
          if (todo.scheduleType === 'anytime') score += 20;

          // 3. 시간 지정 할일은 해당 시간대에 우선 추천
          if (todo.scheduleType === 'timed' && todo.startTime) {
            const now = new Date();
            const startTime = new Date(todo.startTime);
            const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

            // 시작 시간이 지났거나 30분 내에 시작이면 +40점
            if (diffMinutes <= 30) score += 40;
            // 1시간 이내면 +20점
            else if (diffMinutes <= 60) score += 20;
          }

          // 4. 반복 할일 -10점 (매일 하는 일이라 급하지 않음)
          if (todo.recurrencePattern && todo.recurrencePattern !== 'none') {
            score -= 10;
          }

          // 5. 우선순위 반영 (있는 경우)
          if (todo.priority === 'high') score += 25;
          else if (todo.priority === 'medium') score += 10;

          // === 패턴 기반 점수 ===
          const hour = new Date().getHours();

          // 현재 시간대 완료율 반영 (+0~30점)
          const hourlyRate = userPatterns.completedPatterns.hourlyCompletionRate[hour];
          score += Math.min(hourlyRate * 3, 30);

          // 키워드 매칭
          const keywords = extractKeywords(todo.title);
          keywords.forEach(kw => {
            // 자주 완료하는 키워드 +5점
            if (userPatterns.completedPatterns.keywords[kw]) {
              score += 5;
            }
            // 자주 건너뛰는 키워드 -3점
            if (userPatterns.skippedPatterns.keywords[kw]) {
              score -= 3;
            }
            // "너무 큰 일"로 건너뛴 키워드 -5점
            if (userPatterns.skippedPatterns.tooBigKeywords[kw]) {
              score -= 5;
            }
          });

          return score;
        },

        // === 패턴 학습 Actions ===
        learnFromCompletion: (todo, method) => {
          const hour = new Date().getHours();
          const keywords = extractKeywords(todo.title);

          set((state) => {
            const newPatterns = { ...state.userPatterns };

            // 시간대별 완료율 업데이트
            newPatterns.completedPatterns.hourlyCompletionRate[hour]++;

            // 키워드 빈도 업데이트
            keywords.forEach(kw => {
              newPatterns.completedPatterns.keywords[kw] =
                (newPatterns.completedPatterns.keywords[kw] || 0) + 1;
            });

            // 평균 제목 길이 업데이트
            const totalCompleted = newPatterns.completionHistory.length;
            newPatterns.completedPatterns.avgTitleLength =
              (newPatterns.completedPatterns.avgTitleLength * totalCompleted + todo.title.length) / (totalCompleted + 1);

            // 히스토리 추가 (최근 100개 유지)
            newPatterns.completionHistory = [
              ...newPatterns.completionHistory.slice(-99),
              {
                todoId: todo.id,
                method,
                timestamp: new Date(),
                hour,
              }
            ];

            return { userPatterns: newPatterns };
          });

          console.log('📊 ADHD: 완료 패턴 학습', { todoTitle: todo.title, method, hour });
        },

        learnFromSkip: (todo, reason) => {
          const hour = new Date().getHours();
          const keywords = extractKeywords(todo.title);

          set((state) => {
            const newPatterns = { ...state.userPatterns };

            // 키워드별 건너뛰기 빈도 업데이트
            keywords.forEach(kw => {
              newPatterns.skippedPatterns.keywords[kw] =
                (newPatterns.skippedPatterns.keywords[kw] || 0) + 1;

              // "너무 큰 일" 사유면 별도 기록
              if (reason === 'too_big') {
                newPatterns.skippedPatterns.tooBigKeywords[kw] =
                  (newPatterns.skippedPatterns.tooBigKeywords[kw] || 0) + 1;
              }
            });

            // 히스토리 추가 (최근 100개 유지)
            newPatterns.skipHistory = [
              ...newPatterns.skipHistory.slice(-99),
              {
                todoId: todo.id,
                reason,
                timestamp: new Date(),
                hour,
              }
            ];

            return { userPatterns: newPatterns };
          });

          console.log('📊 ADHD: 건너뛰기 패턴 학습', { todoTitle: todo.title, reason, hour });
        },

        // === 유틸리티 ===
        resetPatterns: () => {
          console.log('🔄 ADHD: 패턴 데이터 초기화');
          set({ userPatterns: DEFAULT_USER_PATTERNS });
        },
      }),
      {
        name: 'adhd-mode-store',
        partialize: (state) => ({
          awakeningSentence: state.awakeningSentence,
          userPatterns: state.userPatterns,
          // currentMode와 executionMode는 persist하지 않음 (세션별 초기화)
        }),
      }
    ),
    {
      name: 'adhd-mode-store',
    }
  )
);
