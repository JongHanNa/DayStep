/**
 * Pomodoro Store (Zustand + MMKV)
 * 포모도로 타이머 상태 — 작업/휴식 세션, 설정, 히스토리
 * 웹앱 pomodoroStore 패턴의 RN 네이티브 구현
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {
  shieldForFocus,
  clearFocusShield,
  requestAuthorization,
  getAuthorizationStatus,
} from '@/lib/screenTimeManager';
import {Platform} from 'react-native';

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

// ============================================
// Focus Garden types
// ============================================

export type FocusGardenViewMode = 'day' | 'week' | 'month' | 'year';

export interface FocusTreeInfo {
  sessionId: string;
  durationSeconds: number;
  outcome: 'completed' | 'abandoned';
}

export interface FocusGardenDayInfo {
  date: string; // yyyy-MM-dd
  trees: FocusTreeInfo[];
}

export interface FocusGardenPayload {
  days: FocusGardenDayInfo[];
}

interface PomodoroState {
  timerState: TimerState;
  settings: PomodoroSettings;
  sessions: PomodoroSession[];
  stats: PomodoroStats;
  connectedTodoId: string | null;
  consecutivePomodoros: number;
  focusMode: 'todo' | 'quick' | null;
  focusTodoTitle: string | null;

  // ---- 앱 차단 연동 (포커스 전용) ----
  screenTimeLinkEnabled: boolean;

  // ---- 집중 정원 뷰 상태 ----
  focusGardenViewMode: FocusGardenViewMode;
  focusGardenSelectedDate: string; // yyyy-MM-dd

  // Timer control
  startTimer: (timerType?: TimerType, todoId?: string | null) => void;
  startFocusTimer: (durationSeconds: number, mode: 'todo' | 'quick', todoId?: string, todoTitle?: string) => void;
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

  // 앱 차단
  toggleScreenTimeLink: () => Promise<boolean>; // 반환값: 최종 활성 여부
  setScreenTimeLinkEnabled: (v: boolean) => void;
  checkOrphanedSession: () => void;

  // 집중 정원
  setFocusGardenViewMode: (mode: FocusGardenViewMode) => void;
  setFocusGardenSelectedDate: (date: string) => void;
  getFocusGardenPayload: (days?: number) => FocusGardenPayload;
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

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

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
      focusMode: null,
      focusTodoTitle: null,

      screenTimeLinkEnabled: false,
      focusGardenViewMode: 'day',
      focusGardenSelectedDate: todayString(),

      startTimer: (timerType?: TimerType, todoId?: string | null) => {
        const {settings, screenTimeLinkEnabled} = get();
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

        if (screenTimeLinkEnabled && type === 'POMODORO') {
          shieldForFocus().catch(err => console.error('[Pomodoro] shieldForFocus:', err));
        }
      },

      startFocusTimer: (durationSeconds: number, mode: 'todo' | 'quick', todoId?: string, todoTitle?: string) => {
        const {screenTimeLinkEnabled} = get();
        set({
          timerState: {
            isRunning: true,
            isPaused: false,
            remainingTime: durationSeconds,
            elapsed: 0,
            progress: 0,
            duration: durationSeconds,
            timerType: 'POMODORO',
            status: 'running',
          },
          connectedTodoId: todoId ?? null,
          focusMode: mode,
          focusTodoTitle: todoTitle ?? null,
        });

        if (screenTimeLinkEnabled) {
          shieldForFocus().catch(err => console.error('[Pomodoro] shieldForFocus:', err));
        }
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
        const {timerState, connectedTodoId, sessions, screenTimeLinkEnabled} = get();

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
          const updated = [session, ...sessions].slice(0, 200);
          set({sessions: updated, stats: calcStats(updated)});
        }

        if (screenTimeLinkEnabled) {
          clearFocusShield().catch(err => console.error('[Pomodoro] clearFocusShield:', err));
        }

        set({
          timerState: {...DEFAULT_TIMER},
          connectedTodoId: null,
          focusMode: null,
          focusTodoTitle: null,
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
        const {timerState, connectedTodoId, sessions, settings, consecutivePomodoros, screenTimeLinkEnabled} =
          get();

        const session: PomodoroSession = {
          id: `pomo_${Date.now()}`,
          timerType: timerState.timerType,
          duration: timerState.duration,
          completedAt: new Date().toISOString(),
          interrupted: false,
          connectedTodoId,
        };

        const updated = [session, ...sessions].slice(0, 200);
        const newStats = calcStats(updated);

        // 다음 타이머 결정
        let nextConsecutive = consecutivePomodoros;
        if (timerState.timerType === 'POMODORO') {
          nextConsecutive++;
        } else {
          nextConsecutive = 0;
        }

        if (screenTimeLinkEnabled && timerState.timerType === 'POMODORO') {
          clearFocusShield().catch(err => console.error('[Pomodoro] clearFocusShield:', err));
        }

        set({
          sessions: updated,
          stats: newStats,
          consecutivePomodoros: nextConsecutive,
          timerState: {
            ...DEFAULT_TIMER,
            status: 'completed',
          },
          focusMode: null,
          focusTodoTitle: null,
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

      toggleScreenTimeLink: async () => {
        const current = get().screenTimeLinkEnabled;
        const next = !current;

        if (next && Platform.OS === 'ios') {
          // 권한 체크 — 미승인이면 요청
          try {
            if (getAuthorizationStatus() !== 'approved') {
              await requestAuthorization();
            }
          } catch (err) {
            console.error('[Pomodoro] requestAuthorization error:', err);
            return current; // 권한 실패 시 상태 변경 없음
          }
        }

        set({screenTimeLinkEnabled: next});

        // 세션 진행 중이면 즉시 shield 적용/해제
        const {timerState} = get();
        if (timerState.isRunning || timerState.isPaused) {
          if (next) {
            shieldForFocus().catch(err => console.error('[Pomodoro] shieldForFocus:', err));
          } else {
            clearFocusShield().catch(err => console.error('[Pomodoro] clearFocusShield:', err));
          }
        }

        return next;
      },

      setScreenTimeLinkEnabled: (v) => set({screenTimeLinkEnabled: v}),

      checkOrphanedSession: () => {
        const {timerState, screenTimeLinkEnabled} = get();
        if (!timerState.isRunning && !timerState.isPaused) return;

        // 앱 재시작 시 고아 세션 → shield 해제 + timer 리셋
        if (screenTimeLinkEnabled) {
          clearFocusShield().catch(err => console.error('[Pomodoro] clearFocusShield orphan:', err));
        }

        set({
          timerState: {...DEFAULT_TIMER},
          connectedTodoId: null,
          focusMode: null,
          focusTodoTitle: null,
        });
      },

      setFocusGardenViewMode: (mode) => set({focusGardenViewMode: mode}),
      setFocusGardenSelectedDate: (date) => set({focusGardenSelectedDate: date}),

      getFocusGardenPayload: (days = 365) => {
        const {sessions} = get();
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

        const map = new Map<string, FocusTreeInfo[]>();

        for (const s of sessions) {
          if (s.timerType !== 'POMODORO') continue;
          const ts = new Date(s.completedAt).getTime();
          if (isNaN(ts) || ts < cutoff) continue;

          // 2분 미만은 표시에서 제외 (씨앗 미만)
          if (s.duration < 120) continue;

          const date = s.completedAt.slice(0, 10); // yyyy-MM-dd
          const tree: FocusTreeInfo = {
            sessionId: s.id,
            durationSeconds: s.duration,
            outcome: s.interrupted ? 'abandoned' : 'completed',
          };
          const arr = map.get(date);
          if (arr) {
            arr.push(tree);
          } else {
            map.set(date, [tree]);
          }
        }

        const daysArr: FocusGardenDayInfo[] = [];
        for (const [date, trees] of map.entries()) {
          daysArr.push({date, trees});
        }
        // 날짜 오름차순 정렬 (일관성)
        daysArr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

        return {days: daysArr};
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
        timerState: state.timerState,
        connectedTodoId: state.connectedTodoId,
        focusMode: state.focusMode,
        focusTodoTitle: state.focusTodoTitle,
        screenTimeLinkEnabled: state.screenTimeLinkEnabled,
        focusGardenViewMode: state.focusGardenViewMode,
        focusGardenSelectedDate: state.focusGardenSelectedDate,
      }),
    },
  ),
);
