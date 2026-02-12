/**
 * ADHD Store (Zustand)
 * 실행 모드 상태 관리 — 스마트 추천, 스킵, 세션 진행률
 * 웹앱 adhdStore 패턴의 RN 네이티브 구현
 */
import {create} from 'zustand';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Types
// ============================================

interface ExecutionState {
  currentTodo: Todo | null;
  skippedIds: string[];
  completedInSession: number;
  sessionStartedAt: Date | null;
}

interface CachedPatterns {
  completedKeywords: Record<string, number>;
  skippedKeywords: Record<string, number>;
  hourlyCompletionRate: number[];
}

interface ADHDState {
  // 실행 모드
  execution: ExecutionState;
  isExecutionActive: boolean;

  // 패턴 캐시 (추천 점수용)
  cachedPatterns: CachedPatterns;

  // 액션
  startExecution: (todos: Todo[]) => void;
  endExecution: () => void;
  recommendNext: (todos: Todo[]) => void;
  markCompleted: (todoId: string) => void;
  markSkipped: () => void;
  resetSession: () => void;
}

const DEFAULT_PATTERNS: CachedPatterns = {
  completedKeywords: {},
  skippedKeywords: {},
  hourlyCompletionRate: Array(24).fill(0),
};

// ============================================
// Recommendation Scoring
// ============================================

function calculateScore(
  todo: Todo,
  skippedIds: string[],
  patterns: CachedPatterns,
): number {
  if (todo.completed || skippedIds.includes(todo.id)) return -1;

  let score = 50; // base

  // 짧은 제목 → 가벼운 작업 → 시작하기 쉬움 (ADHD 핵심)
  if (todo.title.length <= 15) score += 30;
  else if (todo.title.length <= 30) score += 15;

  // anytime 할일은 지금 바로 시작 가능
  if (todo.schedule_type === 'anytime') score += 20;

  // 시간 근접도 (30분 이내이면 높은 점수)
  if (todo.start_time) {
    const now = Date.now();
    const start = new Date(todo.start_time).getTime();
    const diffMin = (start - now) / 60000;
    if (diffMin >= -15 && diffMin <= 30) score += 40;
    else if (diffMin >= -60 && diffMin <= 60) score += 20;
  }

  // 중요도/긴급도
  if (todo.importance && todo.urgency) score += 25;
  else if (todo.importance) score += 15;
  else if (todo.urgency) score += 20;

  // 소요 시간 짧은 순 (ADHD: 작은 것부터 완료)
  if (todo.anytime_duration) {
    if (todo.anytime_duration <= 15) score += 20;
    else if (todo.anytime_duration <= 30) score += 10;
  }

  // 키워드 매칭 (과거 완료/스킵 패턴)
  const words = todo.title.toLowerCase().split(/\s+/);
  for (const w of words) {
    if (patterns.completedKeywords[w]) score += 5;
    if (patterns.skippedKeywords[w]) score -= 10;
  }

  // 현재 시간대 완료율
  const hour = new Date().getHours();
  if (patterns.hourlyCompletionRate[hour] > 0.5) score += 10;

  return score;
}

function pickBest(
  todos: Todo[],
  skippedIds: string[],
  patterns: CachedPatterns,
): Todo | null {
  let best: Todo | null = null;
  let bestScore = -1;

  for (const todo of todos) {
    const s = calculateScore(todo, skippedIds, patterns);
    if (s > bestScore) {
      bestScore = s;
      best = todo;
    }
  }

  return best;
}

// ============================================
// Store
// ============================================

export const useADHDStore = create<ADHDState>()((set, get) => ({
  execution: {
    currentTodo: null,
    skippedIds: [],
    completedInSession: 0,
    sessionStartedAt: null,
  },
  isExecutionActive: false,
  cachedPatterns: {...DEFAULT_PATTERNS},

  startExecution: (todos) => {
    const best = pickBest(todos, [], get().cachedPatterns);
    set({
      isExecutionActive: true,
      execution: {
        currentTodo: best,
        skippedIds: [],
        completedInSession: 0,
        sessionStartedAt: new Date(),
      },
    });
  },

  endExecution: () => {
    set({
      isExecutionActive: false,
      execution: {
        currentTodo: null,
        skippedIds: [],
        completedInSession: 0,
        sessionStartedAt: null,
      },
    });
  },

  recommendNext: (todos) => {
    const {execution, cachedPatterns} = get();
    const best = pickBest(todos, execution.skippedIds, cachedPatterns);
    set(state => ({
      execution: {...state.execution, currentTodo: best},
    }));
  },

  markCompleted: (todoId) => {
    const {execution, cachedPatterns} = get();
    const todo = execution.currentTodo;

    // 키워드 학습
    if (todo) {
      const words = todo.title.toLowerCase().split(/\s+/);
      const updated = {...cachedPatterns.completedKeywords};
      for (const w of words) {
        updated[w] = (updated[w] ?? 0) + 1;
      }

      const hourRate = [...cachedPatterns.hourlyCompletionRate];
      const h = new Date().getHours();
      hourRate[h] = Math.min(1, hourRate[h] + 0.1);

      set({
        cachedPatterns: {
          ...cachedPatterns,
          completedKeywords: updated,
          hourlyCompletionRate: hourRate,
        },
      });
    }

    set(state => ({
      execution: {
        ...state.execution,
        currentTodo: null,
        completedInSession: state.execution.completedInSession + 1,
      },
    }));
  },

  markSkipped: () => {
    const {execution, cachedPatterns} = get();
    const todo = execution.currentTodo;

    // 스킵 키워드 학습
    if (todo) {
      const words = todo.title.toLowerCase().split(/\s+/);
      const updated = {...cachedPatterns.skippedKeywords};
      for (const w of words) {
        updated[w] = (updated[w] ?? 0) + 1;
      }
      set({
        cachedPatterns: {...cachedPatterns, skippedKeywords: updated},
      });
    }

    set(state => ({
      execution: {
        ...state.execution,
        currentTodo: null,
        skippedIds: todo
          ? [...state.execution.skippedIds, todo.id]
          : state.execution.skippedIds,
      },
    }));
  },

  resetSession: () => {
    set(state => ({
      execution: {
        ...state.execution,
        skippedIds: [],
        completedInSession: 0,
      },
    }));
  },
}));
