/**
 * Pomodoro Store (Zustand + MMKV)
 * 포모도로 타이머 상태 — 작업/휴식 세션, 설정, 히스토리
 * 웹앱 pomodoroStore 패턴의 RN 네이티브 구현
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';

// ============================================
// Types
// ============================================

type TimerType = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';
type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  remainingTime: number; // seconds
  elapsed: number; // seconds
  progress: number; // 0-1
  duration: number; // total seconds
  timerType: TimerType;
  status: TimerStatus;
}

interface PomodoroSettings {
  pomodoroDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
}

interface PomodoroSession {
  id: string;
  timerType: TimerType;
  duration: number; // seconds
  completedAt: string; // ISO
  interrupted: boolean;
  connectedTodoId: string | null;
}

interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTime: number; // minutes
  currentStreak: number;
  longestStreak: number;
  todaySessions: number;
}

interface PomodoroState {
  timerState: TimerState;
  settings: PomodoroSettings;
  sessions: PomodoroSession[];
  stats: PomodoroStats;
  connectedTodoId: string | null;
  consecutivePomodoros: number;

  // Timer control
  startTimer: (timerType?: TimerType, todoId?: string | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void; // called every second by interval
  completeSession: () => void;

  // Settings
  updateSettings: (updates: Partial<PomodoroSettings>) => void;

  // Todo connection
  connectTodo: (todoId: string | null) => void;

  // Stats
  recalculateStats: () => void;
}

// ============================================
// Defaults
// ============================================

const DEFAULT_SETTINGS: PomodoroSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
};

const DEFAULT_TIMER: TimerState = {
  isRunning: false,
  isPaused: false,
  remainingTime: 25 * 60,
  elapsed: 0,
  progress: 0,
  duration: 25 * 60,
  timerType: 'POMODORO',
  status: 'idle',
};

const DEFAULT_STATS: PomodoroStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalFocusTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  todaySessions: 0,
};

// ============================================
// Helpers
// ============================================

function getDurationForType(type: TimerType, settings: PomodoroSettings): number {
  switch (type) {
    case 'POMODORO':
      return settings.pomodoroDuration * 60;
    case 'SHORT_BREAK':
      return settings.shortBreakDuration * 60;
    case 'LONG_BREAK':
      return settings.longBreakDuration * 60;
  }
}

function calcStats(sessions: PomodoroSession[]): PomodoroStats {
  const today = new Date().toISOString().split('T')[0];
  const completed = sessions.filter(s => !s.interrupted);
  const pomodoros = completed.filter(s => s.timerType === 'POMODORO');
  const todayPomodoros = pomodoros.filter(s => s.completedAt.startsWith(today));

  // Streak calculation
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const sortedDesc = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  for (const s of sortedDesc) {
    if (s.timerType === 'POMODORO' && !s.interrupted) {
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else if (s.timerType === 'POMODORO') {
      if (currentStreak === 0) currentStreak = streak;
      streak = 0;
    }
  }
  if (currentStreak === 0) currentStreak = streak;

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    totalFocusTime: Math.round(
      pomodoros.reduce((sum, s) => sum + s.duration, 0) / 60,
    ),
    currentStreak,
    longestStreak,
    todaySessions: todayPomodoros.length,
  };
}

// ============================================
// Store
// ============================================

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      timerState: {...DEFAULT_TIMER},
      settings: {...DEFAULT_SETTINGS},
      sessions: [],
      stats: {...DEFAULT_STATS},
      connectedTodoId: null,
      consecutivePomodoros: 0,

      startTimer: (timerType?: TimerType, todoId?: string | null) => {
        const {settings} = get();
        const type = timerType ?? 'POMODORO';
        const duration = getDurationForType(type, settings);

        set({
          timerState: {
            isRunning: true,
            isPaused: false,
            remainingTime: duration,
            elapsed: 0,
            progress: 0,
            duration,
            timerType: type,
            status: 'running',
          },
          connectedTodoId: todoId ?? get().connectedTodoId,
        });
      },

      pauseTimer: () => {
        set(state => ({
          timerState: {
            ...state.timerState,
            isRunning: false,
            isPaused: true,
            status: 'paused',
          },
        }));
      },

      resumeTimer: () => {
        set(state => ({
          timerState: {
            ...state.timerState,
            isRunning: true,
            isPaused: false,
            status: 'running',
          },
        }));
      },

      stopTimer: () => {
        const {timerState, connectedTodoId, sessions} = get();

        // 세션 기록 (중단)
        if (timerState.elapsed > 0) {
          const session: PomodoroSession = {
            id: `pomo_${Date.now()}`,
            timerType: timerState.timerType,
            duration: timerState.elapsed,
            completedAt: new Date().toISOString(),
            interrupted: true,
            connectedTodoId,
          };
          const updated = [session, ...sessions].slice(0, 100);
          set({sessions: updated, stats: calcStats(updated)});
        }

        set({
          timerState: {...DEFAULT_TIMER},
          connectedTodoId: null,
        });
      },

      tick: () => {
        const {timerState} = get();
        if (!timerState.isRunning) return;

        const newRemaining = timerState.remainingTime - 1;
        const newElapsed = timerState.elapsed + 1;

        if (newRemaining <= 0) {
          get().completeSession();
          return;
        }

        set({
          timerState: {
            ...timerState,
            remainingTime: newRemaining,
            elapsed: newElapsed,
            progress: newElapsed / timerState.duration,
          },
        });
      },

      completeSession: () => {
        const {timerState, connectedTodoId, sessions, settings, consecutivePomodoros} =
          get();

        const session: PomodoroSession = {
          id: `pomo_${Date.now()}`,
          timerType: timerState.timerType,
          duration: timerState.duration,
          completedAt: new Date().toISOString(),
          interrupted: false,
          connectedTodoId,
        };

        const updated = [session, ...sessions].slice(0, 100);
        const newStats = calcStats(updated);

        // 다음 타이머 결정
        let nextConsecutive = consecutivePomodoros;
        if (timerState.timerType === 'POMODORO') {
          nextConsecutive++;
        } else {
          nextConsecutive = 0;
        }

        set({
          sessions: updated,
          stats: newStats,
          consecutivePomodoros: nextConsecutive,
          timerState: {
            ...DEFAULT_TIMER,
            status: 'completed',
          },
        });

        // 자동 시작
        if (timerState.timerType === 'POMODORO' && settings.autoStartBreaks) {
          const breakType =
            nextConsecutive >= settings.longBreakInterval
              ? 'LONG_BREAK'
              : 'SHORT_BREAK';
          setTimeout(() => get().startTimer(breakType), 500);
        } else if (
          timerState.timerType !== 'POMODORO' &&
          settings.autoStartPomodoros
        ) {
          setTimeout(() => get().startTimer('POMODORO'), 500);
        }
      },

      updateSettings: (updates) => {
        set(state => ({
          settings: {...state.settings, ...updates},
        }));
      },

      connectTodo: (todoId) => {
        set({connectedTodoId: todoId});
      },

      recalculateStats: () => {
        set(state => ({stats: calcStats(state.sessions)}));
      },
    }),
    {
      name: 'pomodoro-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        settings: state.settings,
        sessions: state.sessions,
        stats: state.stats,
        consecutivePomodoros: state.consecutivePomodoros,
      }),
    },
  ),
);
