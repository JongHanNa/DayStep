// ============================================
// Fuel (원동력) 시스템 UI 타입 정의
// (DB는 notes 테이블 사용, note_category='fuel')
// ============================================

/** 기분 레벨 (UI용, DB에 저장하지 않음) */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/** Fuel 뷰 상태 */
export type FuelViewState =
  | 'select-duration'    // 허브 화면 (시작점)
  | 'inspiration-input'  // 영감 노트 입력 ("수집→실행" 플로우)
  | 'inspiration-choice' // 영감 노트 저장 후 선택
  | 'reflection-input'   // 수집
  | 'action-choice'      // 선택지: 지금 할래? 언제 할래? 저장만?
  | 'quick-todo'         // 지금 바로 할래 (할일 입력 → ExecutionMode)
  | 'scheduled-todo'     // 언제 할지 정할래 (날짜/시간 선택)
  | 'capture'            // 기분/태그 (저장만 선택 시) - 레거시, 현재는 바로 저장
  | 'completed'          // 완료
  | 'history';           // 과거 기록

/** Fuel 타이머 시간 옵션 (분) */
export const FUEL_TIMER_OPTIONS = [5, 10, 15, 20] as const;
export type FuelTimerDuration = typeof FUEL_TIMER_OPTIONS[number];

// ============================================
// 원동력 필드 라벨
// ============================================

/** 원동력 필드 라벨 */
export const FUEL_FIELD_LABELS = {
  // 메인 필드 (필수)
  content: {
    label: '원동력이 될 무언가',
    placeholder: '마음에 불을 붙여줄 무언가를 적어보세요',
    required: true,
  },
} as const;

/** 원동력 안내 메시지 (랜덤 표시) */
export const FUEL_MESSAGES = [
  '실행하게 만드는 마음의 원동력을 기록하세요',
  '계획은 있는데 실행이 안 될 때, 마음에 불을 붙여줄 무언가를 기록하세요',
  '마음에 기쁨, 감사, 감동, 각성, 결단을 주는 무언가를 기록하면 마음에 실행력이 생겨요',
  '머리로는 알지만 몸이 안 움직일 때, 마음에 원동력을 채워보세요',
  '"해야지"가 아닌 "하고 싶다"로 바꿔줄 무언가를 기록하세요',
] as const;

/** 과제 도출 필드 라벨 - 레거시, 현재는 사용 안함 */
export const PROJECT_DERIVE_LABELS = {
  title: {
    label: '과제 이름',
    placeholder: '예: 재물 관리 습관 만들기',
    required: true,
  },
  expectedOutcome: {
    label: '기대 효과',
    placeholder: '이 과제를 완료하면 어떤 변화가 있을까요?',
    required: false,
  },
  goalConnection: {
    label: '연결할 목표',
    placeholder: '기존 목표에 연결하거나 새로 만들기',
    required: false,
  },
} as const;

/** 할일 계획 필드 라벨 */
export const TODO_PLANNING_LABELS = {
  preparation: {
    label: '준비할 것',
    placeholder: '시작 전에 필요한 것들 (선택)',
    required: false,
  },
  todoTitle: {
    label: '할 일',
    placeholder: '구체적인 할일을 적어보세요',
    required: true,
  },
} as const;

/** 할일 초안 타입 */
export interface TodoDraft {
  id: string;           // 임시 ID (클라이언트 생성)
  title: string;
  scheduledDate: string | null;  // YYYY-MM-DD
  scheduledTime: string | null;  // HH:mm
}

// ============================================
// Fuel 노트 인터페이스 (notes 테이블 기반)
// ============================================

/** Fuel 노트 입력 타입 */
export interface FuelNoteInput {
  content: string;
  linked_date?: string | null;
  is_pinned?: boolean;
}

/** Fuel 노트 업데이트 타입 */
export interface FuelNoteUpdate {
  content?: string;
  linked_date?: string | null;
  is_pinned?: boolean;
  is_processed?: boolean; // 할일로 변환 여부
}

// ============================================
// 하위 호환성을 위한 별칭 (deprecated)
// ============================================

/** @deprecated Use FuelViewState instead */
export type InboxViewState = FuelViewState;

/** @deprecated Use FUEL_TIMER_OPTIONS instead */
export const INBOX_TIMER_OPTIONS = FUEL_TIMER_OPTIONS;

/** @deprecated Use FuelTimerDuration instead */
export type InboxTimerDuration = FuelTimerDuration;

/** @deprecated Use FUEL_FIELD_LABELS instead */
export const INBOX_FIELD_LABELS = FUEL_FIELD_LABELS;

/** @deprecated Use FuelNoteInput instead */
export type InboxNoteInput = FuelNoteInput;

/** @deprecated Use FuelNoteUpdate instead */
export type InboxNoteUpdate = FuelNoteUpdate;
