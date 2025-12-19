// ============================================
// 수집→명료화→계획 시스템 UI 타입 정의
// (DB는 notes 테이블 사용, note_category='capture')
// ============================================

/** 기분 레벨 (UI용, DB에 저장하지 않음) */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/** 수집→명료화→계획 뷰 상태 */
export type LearningReflectionViewState =
  | 'select-duration'    // 허브 화면 (시작점)
  | 'reflection-input'   // 수집
  | 'action-choice'      // 선택지: 지금 할래? 언제 할래? 저장만?
  | 'quick-todo'         // 지금 바로 할래 (할일 입력 → ExecutionMode)
  | 'scheduled-todo'     // 언제 할지 정할래 (날짜/시간 선택)
  | 'capture'            // 기분/태그 (저장만 선택 시) - 레거시, 현재는 바로 저장
  | 'completed'          // 완료
  | 'history';           // 과거 기록

/** 성찰 타이머 시간 옵션 (분) */
export const REFLECTION_TIMER_OPTIONS = [5, 10, 15, 20] as const;
export type ReflectionTimerDuration = typeof REFLECTION_TIMER_OPTIONS[number];

// ============================================
// 수집 필드 라벨 (비신앙인 친화적)
// ============================================

/** 수집 필드 라벨 */
export const LEARNING_FIELD_LABELS = {
  // 메인 필드 (필수)
  content: {
    label: '떠오른 것',
    placeholder: '생각이든, 본 것이든, 들은 것이든 적어보세요',
    required: true,
  },
  // 출처 (선택)
  sourceReference: {
    label: '출처',
    placeholder: '어디서 얻었나요?',
    required: false,
  },
  // --- 더 적기 (펼침) ---
  sourceText: {
    label: '상세 내용',
    placeholder: '더 자세히 적고 싶다면 여기에',
    required: false,
  },
  experience: {
    label: '관련 경험',
    placeholder: '이것과 관련된 경험이 있나요?',
    required: false,
  },
} as const;

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
// Capture 노트 인터페이스 (notes 테이블 기반)
// ============================================

/** Capture 노트 입력 타입 */
export interface CaptureNoteInput {
  content: string;
  source_text?: string | null;
  source_reference?: string | null;
  linked_date?: string | null;
  is_pinned?: boolean;
}

/** Capture 노트 업데이트 타입 */
export interface CaptureNoteUpdate {
  content?: string;
  source_text?: string | null;
  source_reference?: string | null;
  linked_date?: string | null;
  is_pinned?: boolean;
  is_processed?: boolean; // 할일로 변환 여부
}
