// ============================================
// 나의 마음 챙기기 시스템 타입 정의
// ============================================

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
  content: string;
  source_text: string | null;      // 읽은 글/인용문
  source_reference: string | null; // 출처
  insight: string | null;          // 깨달은 점

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

  created_at: string;
  updated_at: string;
}

/** 마음 기록 입력 */
export interface MindCareEntryInput {
  entry_type: MindCareEntryType;
  content: string;
  source_text?: string;
  source_reference?: string;
  insight?: string;
  entry_date: string;
  mood_rating?: MoodLevel;
  tags?: string[];
  is_favorite?: boolean;
  reminder_enabled?: boolean;
}

/** 마음 기록 업데이트 */
export interface MindCareEntryUpdate {
  content?: string;
  source_text?: string | null;
  source_reference?: string | null;
  insight?: string | null;
  entry_date?: string;
  mood_rating?: MoodLevel | null;
  tags?: string[] | null;
  is_favorite?: boolean;
  is_pinned?: boolean;
  reminder_enabled?: boolean;
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

/** 기본 태그 제안 */
export const SUGGESTED_TAGS: Record<MindCareEntryType, string[]> = {
  reflection: ['책', '영상', '강연', '성찰', '일상', '관계', '성장'],
  comfort: ['위로', '격려', '희망', '용기', '평안', '치유', '감동'],
  gratitude: ['가족', '건강', '일상', '관계', '성장', '자연', '음식'],
};

/** 성찰 타이머 시간 옵션 (분) */
export const REFLECTION_TIMER_OPTIONS = [5, 10, 15, 20] as const;
export type ReflectionTimerDuration = typeof REFLECTION_TIMER_OPTIONS[number];
