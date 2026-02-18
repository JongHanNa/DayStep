/**
 * Motivation (원동력) 유틸리티
 * 웹의 motivation/utils.ts 포팅 — Tailwind → hex 컬러
 */
import type {Note, EmotionTag} from '@/stores/noteStore';

export type StatusFilter = 'all' | 'pending' | 'processed';

export const EMOTION_CONFIG: Record<
  EmotionTag,
  {
    emoji: string;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  joy: {
    emoji: '💖',
    label: '기쁨',
    color: '#E11D48',
    bgColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  gratitude: {
    emoji: '🙏',
    label: '감사',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  awakening: {
    emoji: '⚡',
    label: '각성',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  determination: {
    emoji: '💪',
    label: '결단',
    color: '#9333EA',
    bgColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
};

export const EMOTION_TAGS = Object.keys(EMOTION_CONFIG) as EmotionTag[];

/** 연속 작성일 수 계산 (오늘부터 역산) */
export function calculateStreak(fuelNotes: Note[]): number {
  if (fuelNotes.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateSet = new Set<string>();
  for (const note of fuelNotes) {
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
export function calculateXP(fuelNotes: Note[]): {
  total: number;
  level: number;
  progress: number;
} {
  let total = 0;

  for (const note of fuelNotes) {
    total += 10;
    const todoCount = note.todos?.length ?? 0;
    if (todoCount > 0) {
      total += 20 * todoCount;
    }
  }

  const level = Math.floor(total / 100) + 1;
  const progress = (total % 100) / 100;

  return {total, level, progress};
}

/** 필터 카운트 */
export function getFilterCounts(fuelNotes: Note[]): {
  all: number;
  pending: number;
  processed: number;
} {
  let pending = 0;
  let processed = 0;

  for (const note of fuelNotes) {
    if ((note.todos?.length ?? 0) > 0) {
      processed++;
    } else {
      pending++;
    }
  }

  return {all: fuelNotes.length, pending, processed};
}

/** 노트가 처리됨 상태인지 */
export function isNoteProcessed(note: Note): boolean {
  return (note.todos?.length ?? 0) > 0;
}
