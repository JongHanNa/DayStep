import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Todo } from '@/entities/todo/Todo';

// ============================================
// 타입 정의
// ============================================

export type ADHDScreen = 'home' | 'entry' | 'execute' | 'organize' | 'care' | 'relationship-insights' | 'task-organize' | 'fuel' | 'settings' | 'project' | null;

/** @deprecated Use ADHDScreen instead */
export type ADHDMode = ADHDScreen;

// 설정 모드 서브뷰 타입
export type SettingsSubView = 'main' | 'subscription' | 'account' | 'font' | 'notifications' | 'theme' | 'time-format' | 'todos' | 'widgets';

// 설정 모드 상태
interface SettingsModeState {
  isActive: boolean;
  subView: SettingsSubView;
}

// 즉흥 모드 상태 (지금 떠오른 거 할래)
interface AdhocModeState {
  isActive: boolean;
  startedAt: Date | null;
  sessionId: string | null;        // DB 세션 ID (영속화용)
  linkedTodoId: string | null;     // 연결된 미완료 할일 ID
  linkedTodoTitle: string | null;  // 연결된 할일 제목 (표시용)
  // 반복 할일 연결 지원 (2026-01-19 추가)
  linkedParentTodoId: string | null;    // 반복 할일의 부모 ID
  linkedOccurrenceDate: string | null;  // YYYY-MM-DD 형식
}

// 포모도로 완료 후 노트 연결 대기 상태
interface PendingNoteConnection {
  todoId: string;                      // 연결할 할일 ID
  linkedNoteId: string | null;         // 기존 노트 선택 시 ID
  newNoteContent: string | null;       // 새로 작성할 노트 내용
}

// 실행 모드 상태
interface ExecutionModeState {
  currentRecommendation: Todo | null;
  skippedTodoIds: string[];           // 세션 내 스킵된 할일 ID (로컬 상태)
  completedInSession: number;          // 현재 세션 완료 수
  adhocMode: AdhocModeState;          // 즉흥 포모도로 모드
  pendingNoteConnection: PendingNoteConnection | null;  // 포모도로 완료 후 노트 연결 대기
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

// 복잡한 머릿속, 정리해줄게 모드 상태 (구 나의 마음 챙기기)
import type { FuelViewState, TodoDraft } from '@/types/fuel';
export type { FuelViewState };
export type FuelEntryType = 'reflection' | 'comfort' | 'gratitude';

/** @deprecated Use FuelViewState instead */
export type InboxViewState = FuelViewState;
/** @deprecated Use FuelEntryType instead */
export type InboxEntryType = FuelEntryType;

interface FuelModeState {
  isActive: boolean;
  startedAt: Date | null;
  viewState: FuelViewState;
  selectedNoteId: string | null;  // 배너에서 진입 시 선택된 원동력 ID

  // 수집 필드
  draftTitle: string;             // 제목 (선택)
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
  currentMode: ADHDScreen;
  previousMode: ADHDScreen | null;  // 뒤로가기용 이전 모드 저장
  currentSubView: string | null;  // 서브뷰 ID (예: 'banner', 'contact', 'timeline' 등)

  // 실행 모드 상태
  executionMode: ExecutionModeState;

  // 정리 모드 상태
  organizeMode: OrganizeModeState;

  // 마음 전해보기 모드 상태
  careMode: CareModeState;

  // 복잡한 머릿속, 정리해줄게 모드 상태
  fuelMode: FuelModeState;

  // 설정 모드 상태
  settingsMode: SettingsModeState;

  // 사용자 설정
  awakeningSentence: string | null;

  // 패턴 데이터 (DB에서 로드, 캐시용)
  cachedPatterns: CachedPatterns | null;
  isLoadingPatterns: boolean;

  // 현재 사용자 ID (DB 연동용)
  currentUserId: string | null;

  // === 서브뷰 Actions ===
  setCurrentSubView: (subView: string | null) => void;

  // === 모드 전환 Actions ===
  enterHomeMode: () => void;
  enterEntryMode: (initialTab?: string) => void;
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
  // 반복 할일 연결 (2026-01-19 추가)
  setLinkedRecurringTodo: (parentTodoId: string | null, occurrenceDate: string | null, title: string | null) => void;

  // 포모도로 완료 후 노트 연결 Actions
  setPendingNoteConnection: (data: { todoId: string; linkedNoteId?: string | null; newNoteContent?: string | null } | null) => void;
  clearPendingNoteConnection: () => void;

  // === 정리 모드 Actions ===
  recordTodoAddition: () => void;
  resetOrganizeMode: () => void;

  // === 마음 전해보기 모드 Actions ===
  enterCareMode: (userId: string) => void;
  setCareModePerson: (personId: string, personName: string) => void;
  setCareModeLinkedTodo: (todoId: string) => void;
  endCareMode: () => void;

  // === 관계 인사이트 모드 Actions ===
  enterRelationshipInsightsMode: (userId: string, initialTab?: string) => void;

  // === 할일 정리 모드 Actions ===
  enterTaskOrganizeMode: (userId: string) => void;

  // === 프로젝트 모드 Actions ===
  enterProjectMode: (userId: string, initialTab?: string) => void;

  // === 복잡한 머릿속, 정리해줄게 모드 Actions ===
  enterFuelMode: (userId: string, selectedNoteId?: string, initialTab?: string) => void;
  setFuelViewState: (viewState: FuelViewState) => void;
  setFuelDraft: (draft: {
    // 수집 필드
    title?: string;
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
  resetFuelDraft: () => void;
  endFuelMode: () => void;

  /** @deprecated Use enterFuelMode instead */
  enterInboxMode: (userId: string) => void;
  /** @deprecated Use setFuelViewState instead */
  setInboxViewState: (viewState: FuelViewState) => void;
  /** @deprecated Use setFuelDraft instead */
  setInboxDraft: (draft: any) => void;
  /** @deprecated Use resetFuelDraft instead */
  resetInboxDraft: () => void;
  /** @deprecated Use endFuelMode instead */
  endInboxMode: () => void;

  // === 설정 모드 Actions ===
  enterSettingsMode: (subView?: SettingsSubView) => void;
  setSettingsSubView: (subView: SettingsSubView) => void;
  exitSettingsMode: () => void;

  // === 설정 Actions ===
  setAwakeningSentence: (sentence: string | null) => void;

  // === 추천 알고리즘 ===
  calculateRecommendationScore: (todo: Todo) => number;

  // === URL 복원 Actions (웹 라우팅 지원) ===
  restoreFromUrl: (mode: string, tab: string | null, userId: string | null) => void;
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
  linkedParentTodoId: null,
  linkedOccurrenceDate: null,
};

const DEFAULT_EXECUTION_MODE: ExecutionModeState = {
  currentRecommendation: null,
  skippedTodoIds: [],
  completedInSession: 0,
  adhocMode: DEFAULT_ADHOC_MODE,
  pendingNoteConnection: null,
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

const DEFAULT_FUEL_MODE: FuelModeState = {
  isActive: false,
  startedAt: null,
  viewState: 'select-duration',
  selectedNoteId: null,
  // 수집 필드
  draftTitle: '',
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

const DEFAULT_SETTINGS_MODE: SettingsModeState = {
  isActive: false,
  subView: 'main',
};

// ============================================
// Store 생성
// ============================================

export const useADHDStore = create<ADHDModeState>()(
  devtools(
    persist(
      (set, get) => ({
        // 초기 상태
        currentMode: null,
        previousMode: null,
        currentSubView: null,
        executionMode: DEFAULT_EXECUTION_MODE,
        organizeMode: DEFAULT_ORGANIZE_MODE,
        careMode: DEFAULT_CARE_MODE,
        fuelMode: DEFAULT_FUEL_MODE,
        settingsMode: DEFAULT_SETTINGS_MODE,
        awakeningSentence: null,
        cachedPatterns: null,
        isLoadingPatterns: false,
        currentUserId: null,

        // === 서브뷰 Actions ===
        setCurrentSubView: (subView: string | null) => {
          console.log('🔀 ADHD: 서브뷰 설정', subView);
          set({ currentSubView: subView });
        },

        // === 모드 전환 Actions ===
        enterHomeMode: () => {
          console.log('🏠 ADHD: 홈 목차 모드');
          set({ currentMode: 'home', previousMode: null, currentSubView: null });
        },

        enterEntryMode: (initialTab?: string) => {
          console.log('🎯 ADHD: 진입 화면 모드', initialTab ? `(탭: ${initialTab})` : '');
          set({ currentMode: 'entry', previousMode: null, currentSubView: initialTab || null });
        },

        enterExecuteMode: async (userId: string) => {
          console.log('🎯 ADHD: 실행 모드 진입');
          const currentMode = get().currentMode;  // 이전 모드 저장

          set({
            currentMode: 'execute',
            previousMode: currentMode,  // 뒤로가기용 이전 모드 저장
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
            fuelMode: DEFAULT_FUEL_MODE,
            settingsMode: DEFAULT_SETTINGS_MODE,
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

        // 반복 할일 연결 (2026-01-19 추가)
        setLinkedRecurringTodo: (parentTodoId, occurrenceDate, title) => {
          console.log('🔗 ADHD: 반복 할일 인스턴스 연결', { parentTodoId, occurrenceDate, title });
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              adhocMode: {
                ...state.executionMode.adhocMode,
                linkedParentTodoId: parentTodoId,
                linkedOccurrenceDate: occurrenceDate,
                linkedTodoTitle: title,
                // 단일 할일 ID는 초기화 (반복 할일과 중복 방지)
                linkedTodoId: null,
              },
            }
          }));
        },

        // === 포모도로 완료 후 노트 연결 Actions ===
        setPendingNoteConnection: (data) => {
          console.log('📝 ADHD: 노트 연결 대기 설정', data);
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              pendingNoteConnection: data ? {
                todoId: data.todoId,
                linkedNoteId: data.linkedNoteId ?? null,
                newNoteContent: data.newNoteContent ?? null,
              } : null,
            }
          }));
        },

        clearPendingNoteConnection: () => {
          console.log('🗑️ ADHD: 노트 연결 대기 초기화');
          set((state) => ({
            executionMode: {
              ...state.executionMode,
              pendingNoteConnection: null,
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
        enterRelationshipInsightsMode: (userId: string, initialTab?: string) => {
          console.log('📊 ADHD: 관계 인사이트 모드 진입', initialTab ? `(탭: ${initialTab})` : '');
          set({
            currentMode: 'relationship-insights',
            currentUserId: userId,
            currentSubView: initialTab || null,
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

        // === 프로젝트 모드 Actions ===
        enterProjectMode: (userId: string, initialTab?: string) => {
          console.log('📁 ADHD: 프로젝트 모드 진입', initialTab ? `(탭: ${initialTab})` : '');
          set({
            currentMode: 'project',
            currentUserId: userId,
            currentSubView: initialTab || null,
          });
        },

        // === 복잡한 머릿속, 정리해줄게 모드 Actions ===
        enterFuelMode: (userId: string, selectedNoteId?: string, initialTab?: string) => {
          console.log('💡 ADHD: 원동력 모드 진입', selectedNoteId ? `(선택된 노트: ${selectedNoteId})` : '', initialTab ? `(탭: ${initialTab})` : '');
          set({
            currentMode: 'fuel',
            currentUserId: userId,
            currentSubView: initialTab || null,
            fuelMode: {
              isActive: true,
              startedAt: new Date(),
              viewState: 'select-duration',
              selectedNoteId: selectedNoteId || null,
              // 수집 필드
              draftTitle: '',
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

        setFuelViewState: (viewState: FuelViewState) => {
          console.log('💡 ADHD: 원동력 뷰 상태 변경', viewState);
          set((state) => ({
            fuelMode: {
              ...state.fuelMode,
              viewState,
            }
          }));
        },

        setFuelEntryType: (entryType: FuelEntryType) => {
          console.log('💡 ADHD: 원동력 유형 선택', entryType);
          set((state) => ({
            fuelMode: {
              ...state.fuelMode,
              selectedEntryType: entryType,
            }
          }));
        },

        setFuelDraft: (draft) => {
          set((state) => ({
            fuelMode: {
              ...state.fuelMode,
              // 수집 필드
              ...(draft.title !== undefined && { draftTitle: draft.title }),
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

        resetFuelDraft: () => {
          set((state) => ({
            fuelMode: {
              ...state.fuelMode,
              // 수집 필드 초기화
              draftTitle: '',
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

        endFuelMode: () => {
          console.log('💡 ADHD: 원동력 모드 종료');
          set({
            currentMode: 'entry',
            fuelMode: DEFAULT_FUEL_MODE,
          });
        },

        // === 하위 호환성을 위한 별칭 (deprecated) ===
        /** @deprecated Use enterFuelMode instead */
        enterInboxMode: (userId: string) => {
          console.warn('⚠️ enterInboxMode는 deprecated입니다. enterFuelMode를 사용하세요.');
          get().enterFuelMode(userId);
        },

        /** @deprecated Use setFuelViewState instead */
        setInboxViewState: (viewState: FuelViewState) => {
          console.warn('⚠️ setInboxViewState는 deprecated입니다. setFuelViewState를 사용하세요.');
          get().setFuelViewState(viewState);
        },

        /** @deprecated Use setFuelDraft instead */
        setInboxDraft: (draft: any) => {
          console.warn('⚠️ setInboxDraft는 deprecated입니다. setFuelDraft를 사용하세요.');
          get().setFuelDraft(draft);
        },

        /** @deprecated Use resetFuelDraft instead */
        resetInboxDraft: () => {
          console.warn('⚠️ resetInboxDraft는 deprecated입니다. resetFuelDraft를 사용하세요.');
          get().resetFuelDraft();
        },

        /** @deprecated Use endFuelMode instead */
        endInboxMode: () => {
          console.warn('⚠️ endInboxMode는 deprecated입니다. endFuelMode를 사용하세요.');
          get().endFuelMode();
        },

        // === 설정 모드 Actions ===
        enterSettingsMode: (subView: SettingsSubView = 'main') => {
          console.log('⚙️ ADHD: 설정 모드 진입', subView);
          set({
            currentMode: 'settings',
            settingsMode: {
              isActive: true,
              subView,
            }
          });
        },

        setSettingsSubView: (subView: SettingsSubView) => {
          console.log('⚙️ ADHD: 설정 서브뷰 변경', subView);
          set((state) => ({
            settingsMode: {
              ...state.settingsMode,
              subView,
            }
          }));
        },

        exitSettingsMode: () => {
          console.log('⚙️ ADHD: 설정 모드 종료');
          set({
            currentMode: 'entry',
            settingsMode: DEFAULT_SETTINGS_MODE,
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

          // 5. 우선순위 반영 (importance/urgency 아이젠하워 매트릭스 기반)
          if ((todo as any).importance === 'high') score += 25;
          else if ((todo as any).urgency === 'high') score += 15;

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

        // === URL 복원 Actions (웹 라우팅 지원) ===
        restoreFromUrl: (mode: string, tab: string | null, userId: string | null) => {
          console.log('🔄 ADHD: URL에서 상태 복원', { mode, tab, userId });

          switch (mode) {
            case 'entry':
              get().enterEntryMode(tab || undefined);
              break;
            case 'project':
              if (userId) get().enterProjectMode(userId, tab || undefined);
              break;
            case 'fuel':
              if (userId) get().enterFuelMode(userId, undefined, tab || undefined);
              break;
            case 'relationship-insights':
              if (userId) get().enterRelationshipInsightsMode(userId, tab || undefined);
              break;
            case 'settings':
              get().enterSettingsMode((tab as SettingsSubView) || 'main');
              break;
            case 'home':
            default:
              get().enterHomeMode();
              break;
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

/** @deprecated Use useADHDStore instead */
export const useADHDModeStore = useADHDStore;
