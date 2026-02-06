import {
  createStore,
  createAsyncAction,
  logStoreAction,
} from "../utils/storeUtils";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useAudio } from "@/hooks/useAudio";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  TimerState,
  TimerSettings,
  PomodoroSession,
  PomodoroStats,
  TimerType,
} from "@/types/pomodoro";
import type { BaseStoreState } from "../types";

/**
 * 포모도로 스토어 상태 타입 정의
 */
interface PomodoroStoreState extends BaseStoreState {
  // 타이머 상태
  timerState: TimerState;

  // 설정
  settings: TimerSettings;

  // 세션 히스토리
  sessions: PomodoroSession[];
  currentSession: PomodoroSession | null;

  // 통계
  stats: PomodoroStats;

  // UI 상태
  isSettingsOpen: boolean;
  isStatsOpen: boolean;
  showNotifications: boolean;

  // 할일 연동
  connectedTodoId: string | null;

  // 반복 할일 인스턴스 정보 (반복 할일의 특정 날짜 인스턴스)
  connectedRecurrenceInfo: {
    parentTodoId: string;
    occurrenceDate: string; // YYYY-MM-DD
    title?: string;
  } | null;

  // 액션들
  updateSettings: (settings: Partial<TimerSettings>) => void;

  // 타이머 제어
  startTimer: (
    duration?: number,
    timerType?: TimerType,
    todoId?: string
  ) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;

  // 세션 관리
  completeSession: () => Promise<void>;
  saveSession: (session: PomodoroSession) => Promise<void>;

  // 통계 관리
  refreshStats: () => void;
  getSessionsByDate: (date: string) => PomodoroSession[];
  getTodayStats: () => Partial<PomodoroStats>;

  // UI 상태 관리
  setSettingsOpen: (open: boolean) => void;
  setStatsOpen: (open: boolean) => void;
  setShowNotifications: (show: boolean) => void;

  // 할일 연동
  connectTodo: (todoId: string) => void;
  disconnectTodo: () => void;

  // 반복 할일 연동
  connectRecurringTodo: (parentTodoId: string, occurrenceDate: string, title?: string) => void;
  disconnectRecurringTodo: () => void;
  getConnectedRecurrenceInfo: () => { parentTodoId: string; occurrenceDate: string; title?: string } | null;

  // 스토어 초기화
  reset: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  soundEnabled: true,
  soundVolume: 50,
  notificationsEnabled: true,
};

const DEFAULT_STATS: PomodoroStats = {
  totalSessions: 0,
  completedSessions: 0,
  totalFocusTime: 0,
  averageSessionLength: 0,
  longestStreak: 0,
  currentStreak: 0,
  todaySessions: 0,
  weekSessions: 0,
};

/**
 * 포모도로 스토어 생성
 */
export const usePomodoroStore = createStore<PomodoroStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    timerState: {
      isRunning: false,
      isPaused: false,
      remainingTime: 0,
      elapsed: 0,
      progress: 0,
      duration: 0,
      timerType: "POMODORO",
      sessionId: null,
      status: "idle",
    },
    settings: DEFAULT_SETTINGS,
    sessions: [],
    currentSession: null,
    stats: DEFAULT_STATS,
    isSettingsOpen: false,
    isStatsOpen: false,
    showNotifications: true,
    connectedTodoId: null,
    connectedRecurrenceInfo: null,

    /**
     * 설정 업데이트
     */
    updateSettings: (newSettings: Partial<TimerSettings>) => {
      logStoreAction("PomodoroStore", "updateSettings", newSettings);

      set((state: PomodoroStoreState) => {
        state.settings = { ...state.settings, ...newSettings };
      });
    },

    /**
     * 타이머 시작
     */
    startTimer: createAsyncAction(
      async (
        duration?: number,
        timerType: TimerType = "POMODORO",
        todoId?: string
      ) => {
        logStoreAction("PomodoroStore", "startTimer", {
          duration,
          timerType,
          todoId,
        });

        const { settings } = get();

        // 지속 시간 결정
        let timerDuration = duration;
        if (!timerDuration) {
          switch (timerType) {
            case "POMODORO":
              timerDuration = settings.pomodoroDuration * 60 * 1000; // 분을 밀리초로
              break;
            case "SHORT_BREAK":
              timerDuration = settings.shortBreakDuration * 60 * 1000;
              break;
            case "LONG_BREAK":
              timerDuration = settings.longBreakDuration * 60 * 1000;
              break;
          }
        }

        // 새 세션 생성
        const sessionId = crypto.randomUUID();
        const newSession: PomodoroSession = {
          id: sessionId,
          todoId: todoId || get().connectedTodoId || undefined,
          timerType,
          duration: timerDuration,
          startTime: Date.now(),
          completed: false,
          interrupted: false,
        };

        set((state: PomodoroStoreState) => {
          state.currentSession = newSession;
          state.timerState = {
            ...state.timerState,
            isRunning: true,
            isPaused: false,
            status: "running",
            duration: timerDuration,
            remainingTime: timerDuration,
            elapsed: 0,
            progress: 0,
            timerType,
            sessionId,
          };
          if (todoId) {
            state.connectedTodoId = todoId;
          }
        });
      }
    ),

    /**
     * 타이머 일시정지
     */
    pauseTimer: createAsyncAction(async () => {
      logStoreAction("PomodoroStore", "pauseTimer");

      set((state: PomodoroStoreState) => {
        state.timerState = {
          ...state.timerState,
          isPaused: true,
          status: "paused",
        };
      });
    }),

    /**
     * 타이머 재개
     */
    resumeTimer: createAsyncAction(async () => {
      logStoreAction("PomodoroStore", "resumeTimer");

      set((state: PomodoroStoreState) => {
        state.timerState = {
          ...state.timerState,
          isPaused: false,
          status: "running",
        };
      });
    }),

    /**
     * 타이머 정지
     */
    stopTimer: createAsyncAction(async () => {
      logStoreAction("PomodoroStore", "stopTimer");

      const currentSession = get().currentSession;
      if (currentSession && !currentSession.completed) {
        // 중단된 세션으로 표시
        const interruptedSession: PomodoroSession = {
          ...currentSession,
          endTime: Date.now(),
          interrupted: true,
        };

        set((state: PomodoroStoreState) => {
          state.sessions.push(interruptedSession);
          state.currentSession = null;
          state.timerState = {
            isRunning: false,
            isPaused: false,
            remainingTime: 0,
            elapsed: 0,
            progress: 0,
            duration: 0,
            timerType: "POMODORO",
            sessionId: null,
            status: "idle",
          };
        });
      } else {
        set((state: PomodoroStoreState) => {
          state.currentSession = null;
          state.timerState = {
            isRunning: false,
            isPaused: false,
            remainingTime: 0,
            elapsed: 0,
            progress: 0,
            duration: 0,
            timerType: "POMODORO",
            sessionId: null,
            status: "idle",
          };
        });
      }

      get().refreshStats();
    }),

    /**
     * 세션 완료
     */
    completeSession: createAsyncAction(async () => {
      logStoreAction("PomodoroStore", "completeSession");

      const currentSession = get().currentSession;
      if (currentSession) {
        const completedSession: PomodoroSession = {
          ...currentSession,
          endTime: Date.now(),
          completed: true,
        };

        await get().saveSession(completedSession);

        set((state: PomodoroStoreState) => {
          state.currentSession = null;
          state.timerState = {
            ...state.timerState,
            status: "completed",
            isRunning: false,
            progress: 1,
            remainingTime: 0,
          };
        });

        get().refreshStats();
      }
    }),

    /**
     * 세션 저장
     */
    saveSession: createAsyncAction(async (session: PomodoroSession) => {
      logStoreAction("PomodoroStore", "saveSession", session);

      set((state: PomodoroStoreState) => {
        // 중복 방지
        const existingIndex = state.sessions.findIndex(
          (s: any) => s.id === session.id
        );
        if (existingIndex >= 0) {
          state.sessions[existingIndex] = session;
        } else {
          state.sessions.push(session);
        }

        // 최근 100개 세션만 유지
        if (state.sessions.length > 100) {
          state.sessions = state.sessions.slice(-100);
        }
      });
    }),

    /**
     * 통계 새로고침
     */
    refreshStats: () => {
      const { sessions } = get();

      const totalSessions = sessions.length;
      const completedSessions = sessions.filter((s: any) => s.completed).length;
      const focusSessions = sessions.filter(
        (s: any) => s.timerType === "POMODORO" && s.completed
      );
      const totalFocusTime = focusSessions.reduce(
        (total: any, session: any) => total + session.duration / (60 * 1000),
        0
      );

      // 오늘 세션 수
      const today = new Date().toDateString();
      const todaySessions = sessions.filter(
        (s: any) =>
          new Date(s.startTime).toDateString() === today && s.completed
      ).length;

      // 이번 주 세션 수
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekSessions = sessions.filter(
        (s: any) => new Date(s.startTime) >= weekStart && s.completed
      ).length;

      // 연속 완료 기록 계산
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // 최근 세션부터 역순으로 확인
      const sortedSessions = [...sessions]
        .sort((a, b) => b.startTime - a.startTime)
        .filter((s) => s.timerType === "POMODORO");

      for (const session of sortedSessions) {
        if (session.completed) {
          tempStreak++;
          if (currentStreak === 0) {
            currentStreak = tempStreak;
          }
        } else {
          if (currentStreak === 0) {
            currentStreak = 0;
          }
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      const stats: PomodoroStats = {
        totalSessions,
        completedSessions,
        totalFocusTime,
        averageSessionLength:
          completedSessions > 0 ? totalFocusTime / completedSessions : 0,
        longestStreak,
        currentStreak,
        todaySessions,
        weekSessions,
      };

      set((state: PomodoroStoreState) => {
        state.stats = stats;
      });
    },

    /**
     * 특정 날짜의 세션 조회
     */
    getSessionsByDate: (date: string) => {
      const { sessions } = get();
      return sessions.filter(
        (session: any) =>
          new Date(session.startTime).toDateString() ===
          new Date(date).toDateString()
      );
    },

    /**
     * 오늘 통계 조회
     */
    getTodayStats: () => {
      const today = new Date().toDateString();
      const { sessions } = get();
      const todaySessions = sessions.filter(
        (s: any) => new Date(s.startTime).toDateString() === today
      );

      const completedToday = todaySessions.filter(
        (s: any) => s.completed
      ).length;
      const focusTimeToday = todaySessions
        .filter((s: any) => s.timerType === "POMODORO" && s.completed)
        .reduce(
          (total: any, session: any) => total + session.duration / (60 * 1000),
          0
        );

      return {
        todaySessions: completedToday,
        totalFocusTime: focusTimeToday,
      };
    },

    /**
     * 설정 모달 상태 관리
     */
    setSettingsOpen: (open: boolean) => {
      set((state: PomodoroStoreState) => {
        state.isSettingsOpen = open;
      });
    },

    /**
     * 통계 모달 상태 관리
     */
    setStatsOpen: (open: boolean) => {
      set((state: PomodoroStoreState) => {
        state.isStatsOpen = open;
      });
    },

    /**
     * 알림 표시 상태 관리
     */
    setShowNotifications: (show: boolean) => {
      set((state: PomodoroStoreState) => {
        state.showNotifications = show;
      });
    },

    /**
     * 할일 연동
     */
    connectTodo: (todoId: string) => {
      logStoreAction("PomodoroStore", "connectTodo", { todoId });

      set((state: PomodoroStoreState) => {
        state.connectedTodoId = todoId;
      });
    },

    /**
     * 할일 연동 해제
     */
    disconnectTodo: () => {
      logStoreAction("PomodoroStore", "disconnectTodo");

      set((state: PomodoroStoreState) => {
        state.connectedTodoId = null;
      });
    },

    /**
     * 반복 할일 인스턴스 연동
     * @param parentTodoId - 반복 할일의 부모 ID
     * @param occurrenceDate - 특정 발생 날짜 (YYYY-MM-DD)
     * @param title - 할일 제목 (UI 표시용)
     */
    connectRecurringTodo: (parentTodoId: string, occurrenceDate: string, title?: string) => {
      logStoreAction("PomodoroStore", "connectRecurringTodo", {
        parentTodoId,
        occurrenceDate,
        title,
      });

      set((state: PomodoroStoreState) => {
        state.connectedRecurrenceInfo = {
          parentTodoId,
          occurrenceDate,
          title,
        };
        // 일반 할일 ID도 parentTodoId로 설정 (기존 로직 호환)
        state.connectedTodoId = parentTodoId;
      });
    },

    /**
     * 반복 할일 연동 해제
     */
    disconnectRecurringTodo: () => {
      logStoreAction("PomodoroStore", "disconnectRecurringTodo");

      set((state: PomodoroStoreState) => {
        state.connectedRecurrenceInfo = null;
        state.connectedTodoId = null;
      });
    },

    /**
     * 연동된 반복 할일 정보 조회
     */
    getConnectedRecurrenceInfo: () => {
      return get().connectedRecurrenceInfo;
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      set((state: PomodoroStoreState) => {
        state.timerState = {
          isRunning: false,
          isPaused: false,
          remainingTime: 0,
          elapsed: 0,
          progress: 0,
          duration: 0,
          timerType: "POMODORO",
          sessionId: null,
          status: "idle",
        };
        state.settings = DEFAULT_SETTINGS;
        state.sessions = [];
        state.currentSession = null;
        state.stats = DEFAULT_STATS;
        state.isSettingsOpen = false;
        state.isStatsOpen = false;
        state.showNotifications = true;
        state.connectedTodoId = null;
        state.connectedRecurrenceInfo = null;
      });
    },
  }),
  {
    name: "pomodoro-store",
    devtools: true,
    persist: {
      name: "daystep-pomodoro",
      version: 1,
      blacklist: [
        "timerState",
        "currentSession",
        "isSettingsOpen",
        "isStatsOpen",
        "showNotifications",
      ],
    },
  }
);
