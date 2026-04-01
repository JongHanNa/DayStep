import type { Note } from '@/state/stores/noteStore';

export type EmotionTag = 'joy' | 'gratitude' | 'awakening' | 'determination';

export type StatusFilter = 'all' | 'pending' | 'processed';

export const EMOTION_CONFIG: Record<EmotionTag, {
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  joy:           { emoji: '💖', label: '기쁨',  color: 'text-rose-600',   bgColor: 'bg-rose-50',   borderColor: 'border-rose-200' },
  gratitude:     { emoji: '🙏', label: '감사',  color: 'text-blue-600',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200' },
  awakening:     { emoji: '⚡', label: '각성',  color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  determination: { emoji: '💪', label: '결단',  color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
};

export const EMOTION_TAGS = Object.keys(EMOTION_CONFIG) as EmotionTag[];

/** 연속 작성일 수 계산 (오늘부터 역산) */
export function calculateStreak(motivationNotes: Note[]): number {
  if (motivationNotes.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 각 노트의 작성일을 날짜 문자열 Set으로 변환
  const dateSet = new Set<string>();
  for (const note of motivationNotes) {
    const d = new Date(note.created_at);
    d.setHours(0, 0, 0, 0);
    dateSet.add(d.toISOString().split('T')[0]);
  }

  let streak = 0;
  const current = new Date(today);

  while (true) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/** XP 계산: 원동력 10점 + 할일 전환 20점 */
export function calculateXP(motivationNotes: Note[]): {
  total: number;
  level: number;
  progress: number;
} {
  let total = 0;

  for (const note of motivationNotes) {
    total += 10; // 원동력 작성
    const todoCount = note.todos?.length ?? 0;
    if (todoCount > 0) {
      total += 20 * todoCount; // 할일 전환
    }
  }

  // 레벨 계산: 100 XP per level
  const level = Math.floor(total / 100) + 1;
  const progress = (total % 100) / 100;

  return { total, level, progress };
}

/** 필터 카운트 */
export function getFilterCounts(motivationNotes: Note[]): {
  all: number;
  pending: number;
  processed: number;
} {
  let pending = 0;
  let processed = 0;

  for (const note of motivationNotes) {
    if ((note.todos?.length ?? 0) > 0) {
      processed++;
    } else {
      pending++;
    }
  }

  return {
    all: motivationNotes.length,
    pending,
    processed,
  };
}

/** 노트가 처리됨 상태인지 */
export function isNoteProcessed(note: Note): boolean {
  return (note.todos?.length ?? 0) > 0;
}
