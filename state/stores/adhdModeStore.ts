import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Todo } from '@/entities/todo/Todo';

// ============================================
// 타입 정의
// ============================================

export type ADHDMode = 'entry' | 'execute' | 'organize' | 'care' | 'relationship-insights' | 'task-organize' | 'inbox' | null;

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
  skippedTodoIds: string[];           // 세션 내 스킵된 할일 ID (로컬 상태)
  completedInSession: number;          // 현재 세션 완료 수
  adhocMode: AdhocModeState;          // 즉흥 포모도로 모드
}

// 정리 모드 상태
interface OrganizeModeState {
  consecutiveTodoAdds: number;         // 연속 할일 추가 수
  startTime: Date | null;              // 정리 모드 시작 시간
}

// 마음 전해보기 모드 상태
interface CareModeState {
  isActive: boolean;
  startedAt: Date | null;
  selectedPersonId: string | null;      // 선택한 소중한 사람 ID
  selectedPersonName: string | null;    // 선택한 사람 이름 (표시용)
  sessionId: string | null;             // 포모도로 세션 ID
  linkedTodoId: string | null;          // 연결된 할일 ID
}

// 수집→명료화→계획 모드 상태 (구 나의 마음 챙기기)
import type { InboxViewState, TodoDraft } from '@/types/inbox';
export type { InboxViewState };
export type InboxEntryType = 'reflection' | 'comfort' | 'gratitude';

interface InboxModeState {
  isActive: boolean;
  startedAt: Date | null;
  viewState: InboxViewState;

  // 수집 필드
  draftContent: string;           // 나의 깨달음 (필수)
  draftSourceText: string;        // 배운 내용
  draftSourceReference: string;   // 출처
  draftExperience: string;        // 오늘의 경험
  draftCommitment: string;        // 실천 다짐

  // 과제 도출 필드 (신규)
  selectedProjectId: string | null;      // 기존 프로젝트 선택 시
  newProjectTitle: string;               // 새 과제 이름
  newProjectExpectedOutcome: string;     // 기대 효과
  selectedGoalId: string | null;         // 연결할 목표

  // 할일 계획 필드 (신규)
  newProjectPreparation: string;         // 준비할 것
  todosDraft: TodoDraft[];               // 할일 초안 목록
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

  // 마음 전해보기 모드 상태
  careMode: CareModeState;

  // 수집→명료화→계획 모드 상태
  inboxMode: InboxModeState;

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
  markSkipped: (todoId: string) => void;  // 단순 스킵 (DB 기록 없음)
  resetSession: () => void;

  // === 즉흥 모드 Actions (지금 떠오른 거 할래) ===
  startAdhocMode: () => void;
  endAdhocMode: () => void;
  setSessionId: (sessionId: string | null) => void;
  setLinkedTodo: (todoId: string | null, title: string | null) => void;

  // === 정리 모드 Actions ===
  recordTodoAddition: () => void;
  resetOrganizeMode: () => void;

  // === 마음 전해보기 모드 Actions ===
  enterCareMode: (userId: string) => void;
  setCareModePerson: (personId: string, personName: string) => void;
  setCareModeLinkedTodo: (todoId: string) => void;
  endCareMode: () => void;

  // === 관계 인사이트 모드 Actions ===
  enterRelationshipInsightsMode: (userId: string) => void;

  // === 할일 정리 모드 Actions ===
  enterTaskOrganizeMode: (userId: string) => void;

  // === 수집→명료화→계획 모드 Actions ===
  enterInboxMode: (userId: string) => void;
  setInboxViewState: (viewState: InboxViewState) => void;
  setInboxDraft: (draft: {
    // 수집 필드
    content?: string;
    sourceText?: string;
    sourceReference?: string;
    experience?: string;
    commitment?: string;
    // 과제 도출 필드
    selectedProjectId?: string | null;
    newProjectTitle?: string;
    newProjectExpectedOutcome?: string;
    selectedGoalId?: string | null;
    // 할일 계획 필드
    newProjectPreparation?: string;
    todosDraft?: TodoDraft[];
  }) => void;
  resetInboxDraft: () => void;
  endInboxMode: () => void;

  // === 설정 Actions ===
  setAwakeningSentence: (sentence: string | null) => void;

  // === 추천 알고리즘 ===
  calculateRecommendationScore: (todo: Todo) => number;
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
  completedInSession: 0,
  adhocMode: DEFAULT_ADHOC_MODE,
};

const DEFAULT_ORGANIZE_MODE: OrganizeModeState = {
  consecutiveTodoAdds: 0,
  startTime: null,
};

const DEFAULT_CARE_MODE: CareModeState = {
  isActive: false,
  startedAt: null,
  selectedPersonId: null,
  selectedPersonName: null,
  sessionId: null,
  linkedTodoId: null,
};

const DEFAULT_INBOX_MODE: InboxModeState = {
  isActive: false,
  startedAt: null,
  viewState: 'select-duration',
  // 수집 필드
  draftContent: '',
  draftSourceText: '',
  draftSourceReference: '',
  draftExperience: '',
  draftCommitment: '',
  // 과제 도출 필드
  selectedProjectId: null,
  newProjectTitle: '',
  newProjectExpectedOutcome: '',
  selectedGoalId: null,
  // 할일 계획 필드
  newProjectPreparation: '',
  todosDraft: [],
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
        careMode: DEFAULT_CARE_MODE,
        inboxMode: DEFAULT_INBOX_MODE,
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
            executionMode: DEFAULT_EXECUTION_MODE,
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
            careMode: DEFAULT_CARE_MODE,
            inboxMode: DEFAULT_INBOX_MODE,
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

        markSkipped: (todoId) => {
          console.log('⏭️ ADHD: 할일 건너뛰기', todoId);

          // 세션 내 스킵 상태만 업데이트 (DB 기록 없음)
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

        // === 마음 전해보기 모드 Actions ===
        enterCareMode: (userId: string) => {
          console.log('💝 ADHD: 마음 전해보기 모드 진입');
          set({
            currentMode: 'care',
            currentUserId: userId,
            careMode: {
              isActive: true,
              startedAt: new Date(),
              selectedPersonId: null,
              selectedPersonName: null,
              sessionId: null,
              linkedTodoId: null,
            }
          });
        },

        setCareModePerson: (personId: string, personName: string) => {
          console.log('💝 ADHD: 소중한 사람 선택', { personId, personName });
          set((state) => ({
            careMode: {
              ...state.careMode,
              selectedPersonId: personId,
              selectedPersonName: personName,
            }
          }));
        },

        setCareModeLinkedTodo: (todoId: string) => {
          console.log('💝 ADHD: 연결된 할일 설정', todoId);
          set((state) => ({
            careMode: {
              ...state.careMode,
              linkedTodoId: todoId,
            }
          }));
        },

        endCareMode: () => {
          console.log('💝 ADHD: 마음 전해보기 모드 종료');
          set({
            currentMode: 'entry',
            careMode: DEFAULT_CARE_MODE,
          });
        },

        // === 관계 인사이트 모드 Actions ===
        enterRelationshipInsightsMode: (userId: string) => {
          console.log('📊 ADHD: 관계 인사이트 모드 진입');
          set({
            currentMode: 'relationship-insights',
            currentUserId: userId,
          });
        },

        // === 할일 정리 모드 Actions ===
        enterTaskOrganizeMode: (userId: string) => {
          console.log('📋 ADHD: 할일 정리 모드 진입');
          set({
            currentMode: 'task-organize',
            currentUserId: userId,
          });
        },

        // === 수집→명료화→계획 모드 Actions ===
        enterInboxMode: (userId: string) => {
          console.log('💡 ADHD: 수집→명료화→계획 모드 진입');
          set({
            currentMode: 'inbox',
            currentUserId: userId,
            inboxMode: {
              isActive: true,
              startedAt: new Date(),
              viewState: 'select-duration',
              // 수집 필드
              draftContent: '',
              draftSourceText: '',
              draftSourceReference: '',
              draftExperience: '',
              draftCommitment: '',
              // 과제 도출 필드
              selectedProjectId: null,
              newProjectTitle: '',
              newProjectExpectedOutcome: '',
              selectedGoalId: null,
              // 할일 계획 필드
              newProjectPreparation: '',
              todosDraft: [],
            }
          });
        },

        setInboxViewState: (viewState: InboxViewState) => {
          console.log('💡 ADHD: 수집→명료화→계획 뷰 상태 변경', viewState);
          set((state) => ({
            inboxMode: {
              ...state.inboxMode,
              viewState,
            }
          }));
        },

        setInboxEntryType: (entryType: InboxEntryType) => {
          console.log('💡 ADHD: 수집→명료화→계획 유형 선택', entryType);
          set((state) => ({
            inboxMode: {
              ...state.inboxMode,
              selectedEntryType: entryType,
            }
          }));
        },

        setInboxDraft: (draft) => {
          set((state) => ({
            inboxMode: {
              ...state.inboxMode,
              // 수집 필드
              ...(draft.content !== undefined && { draftContent: draft.content }),
              ...(draft.sourceText !== undefined && { draftSourceText: draft.sourceText }),
              ...(draft.sourceReference !== undefined && { draftSourceReference: draft.sourceReference }),
              ...(draft.experience !== undefined && { draftExperience: draft.experience }),
              ...(draft.commitment !== undefined && { draftCommitment: draft.commitment }),
              // 과제 도출 필드
              ...(draft.selectedProjectId !== undefined && { selectedProjectId: draft.selectedProjectId }),
              ...(draft.newProjectTitle !== undefined && { newProjectTitle: draft.newProjectTitle }),
              ...(draft.newProjectExpectedOutcome !== undefined && { newProjectExpectedOutcome: draft.newProjectExpectedOutcome }),
              ...(draft.selectedGoalId !== undefined && { selectedGoalId: draft.selectedGoalId }),
              // 할일 계획 필드
              ...(draft.newProjectPreparation !== undefined && { newProjectPreparation: draft.newProjectPreparation }),
              ...(draft.todosDraft !== undefined && { todosDraft: draft.todosDraft }),
            }
          }));
        },

        resetInboxDraft: () => {
          set((state) => ({
            inboxMode: {
              ...state.inboxMode,
              // 수집 필드 초기화
              draftContent: '',
              draftSourceText: '',
              draftSourceReference: '',
              draftExperience: '',
              draftCommitment: '',
              // 과제 도출 필드 초기화
              selectedProjectId: null,
              newProjectTitle: '',
              newProjectExpectedOutcome: '',
              selectedGoalId: null,
              // 할일 계획 필드 초기화
              newProjectPreparation: '',
              todosDraft: [],
            }
          }));
        },

        endInboxMode: () => {
          console.log('💡 ADHD: 수집→명료화→계획 모드 종료');
          set({
            currentMode: 'entry',
            inboxMode: DEFAULT_INBOX_MODE,
          });
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
