// ============================================
// 배움→과제→계획 시스템 타입 정의
// (구 나의 마음 챙기기)
// ============================================

/** 마음 챙기기 뷰 상태 */
export type MindCareViewState =
  | 'select-duration'    // 시작 화면 (타이머 선택)
  | 'reflection-input'   // 배움 기록
  | 'project-derive'     // 과제 도출 (신규)
  | 'todo-planning'      // 할일 계획 (신규)
  | 'capture'            // 기분/태그 (배움만 기록 시)
  | 'completed'          // 완료
  | 'history';           // 과거 기록

/** 기록 유형 */
export type MindCareEntryType =
  | 'reflection'   // 마음 기록
  | 'comfort'      // 위로의 순간
  | 'gratitude';   // 감사 일기

/** 기분 레벨 (1-5) */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/** 마음 기록 엔트리 */
export interface MindCareEntry {
  id: string;
  user_id: string;
  entry_type: MindCareEntryType;

  // 내용
  content: string;                   // 나의 생각
  source_text: string | null;        // 마음에 닿은 글
  source_reference: string | null;   // 출처
  insight: string | null;            // 깨달은 점 (레거시)
  experience: string | null;         // 오늘의 경험
  commitment: string | null;         // 실천 다짐

  // 메타데이터
  entry_date: string;              // YYYY-MM-DD
  mood_rating: MoodLevel | null;
  tags: string[] | null;
  is_favorite: boolean;
  is_pinned: boolean;

  // 리마인더
  reminder_enabled: boolean;
  last_reminded_at: string | null;
  reminder_count: number;

  // 프로젝트 연결 (배움→과제 플로우)
  project_id: string | null;

  created_at: string;
  updated_at: string;
}

/** 마음 기록 입력 */
export interface MindCareEntryInput {
  entry_type?: MindCareEntryType;  // 옵셔널 (기본값: 'reflection')
  content: string;
  source_text?: string;
  source_reference?: string;
  insight?: string;
  experience?: string;             // 오늘의 경험
  commitment?: string;             // 실천 다짐
  entry_date: string;
  mood_rating?: MoodLevel;
  tags?: string[];
  is_favorite?: boolean;
  reminder_enabled?: boolean;
  project_id?: string;           // 프로젝트 연결
}

/** 마음 기록 업데이트 */
export interface MindCareEntryUpdate {
  content?: string;
  source_text?: string | null;
  source_reference?: string | null;
  insight?: string | null;
  experience?: string | null;      // 오늘의 경험
  commitment?: string | null;      // 실천 다짐
  entry_date?: string;
  mood_rating?: MoodLevel | null;
  tags?: string[] | null;
  is_favorite?: boolean;
  is_pinned?: boolean;
  reminder_enabled?: boolean;
  project_id?: string | null;   // 프로젝트 연결
}

/** 마음 챙기기 설정 */
export interface MindCareSettings {
  id: string;
  user_id: string;

  comfort_reminder_enabled: boolean;
  comfort_reminder_frequency: number;  // 일 단위

  gratitude_reminder_enabled: boolean;
  gratitude_reminder_time: string;     // HH:MM

  show_streak: boolean;

  created_at: string;
  updated_at: string;
}

/** 성찰 질문 */
export interface MindCarePrompt {
  id: string;
  prompt_type: MindCareEntryType;
  prompt_text: string;
  prompt_key: string;
  display_weight: number;
  is_active: boolean;
  created_at: string;
}

/** 마음 돌봄 통계 */
export interface MindCareStats {
  totalEntries: number;
  reflectionCount: number;
  comfortCount: number;
  gratitudeCount: number;
  currentStreak: number;          // 연속 기록일
  longestStreak: number;          // 최장 연속 기록
  favoriteCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
}

/** 위로 리마인더 (홈 화면 배너용) */
export interface ComfortReminder {
  entry: MindCareEntry;
  daysSinceCreated: number;
}

// ============================================
// 라벨 및 상수
// ============================================

/** 기록 유형 라벨 */
export const ENTRY_TYPE_LABELS: Record<MindCareEntryType, {
  label: string;
  emoji: string;
  description: string;
  color: string;
}> = {
  reflection: {
    label: '마음 기록',
    emoji: '📝',
    description: '오늘 읽은 글과 성찰한 내용을 기록해요',
    color: 'text-blue-500',
  },
  comfort: {
    label: '위로의 순간',
    emoji: '💝',
    description: '마음에 닿은 문장이나 경험을 저장해요',
    color: 'text-pink-500',
  },
  gratitude: {
    label: '감사 일기',
    emoji: '🙏',
    description: '오늘 감사한 것들을 적어요',
    color: 'text-amber-500',
  },
};

/** 기분 레벨 라벨 */
export const MOOD_LABELS: Array<{ value: MoodLevel; emoji: string; label: string }> = [
  { value: 1, emoji: '😔', label: '힘들어요' },
  { value: 2, emoji: '😐', label: '그저 그래요' },
  { value: 3, emoji: '🙂', label: '괜찮아요' },
  { value: 4, emoji: '😊', label: '좋아요' },
  { value: 5, emoji: '🥰', label: '감사해요' },
];

/** 기본 태그 제안 (레거시 - 유형별) */
export const SUGGESTED_TAGS: Record<MindCareEntryType, string[]> = {
  reflection: ['책', '영상', '강연', '성찰', '일상', '관계', '성장'],
  comfort: ['위로', '격려', '희망', '용기', '평안', '치유', '감동'],
  gratitude: ['가족', '건강', '일상', '관계', '성장', '자연', '음식'],
};

/** 통합 태그 목록 (유형 구분 없이) */
export const UNIFIED_TAGS = [
  // 성찰/깨달음
  '깨달음', '성장', '도전', '배움', '결심',
  // 위로/격려
  '위로', '희망', '평안', '격려', '감동',
  // 감사
  '감사', '가족', '친구', '건강', '일상', '자연',
];

/** 성찰 타이머 시간 옵션 (분) */
export const REFLECTION_TIMER_OPTIONS = [5, 10, 15, 20] as const;
export type ReflectionTimerDuration = typeof REFLECTION_TIMER_OPTIONS[number];

// ============================================
// 배움→과제→계획 플로우 라벨 (비신앙인 친화적)
// ============================================

/** 배움 기록 필드 라벨 */
export const LEARNING_FIELD_LABELS = {
  sourceText: {
    label: '영감을 준 내용',
    placeholder: '책, 영상, 대화에서 인상 깊었던 내용을 적어보세요',
    required: false,
  },
  sourceReference: {
    label: '출처',
    placeholder: '어디서 배웠나요? (책 제목, 영상 링크 등)',
    required: false,
  },
  content: {
    label: '나의 깨달음',
    placeholder: '무엇을 깨달았나요? 어떤 생각이 드나요?',
    required: true,
  },
  experience: {
    label: '오늘의 경험',
    placeholder: '이 배움과 관련된 오늘의 경험이 있나요?',
    required: false,
  },
  commitment: {
    label: '실천 다짐',
    placeholder: '앞으로 어떻게 할까요?',
    required: false,
  },
} as const;

/** 과제 도출 필드 라벨 */
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
