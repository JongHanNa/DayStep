// Pomodoro Timer Types

export type TimerType = 'POMODORO' | 'SHORT_BREAK' | 'LONG_BREAK';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  remainingTime: number;
  elapsed: number;
  progress: number;
  duration: number;
  timerType: TimerType;
  sessionId: string | null;
  status: TimerStatus;
}

export interface TimerSettings {
  pomodoroDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // after how many pomodoros
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  notificationsEnabled: boolean;
}

export interface PomodoroSession {
  id: string;
  todoId?: string;
  timerType: TimerType;
  duration: number;
  startTime: number;
  endTime?: number;
  completed: boolean;
  interrupted: boolean;
}

export interface PomodoroStats {
  totalSessions: number;
  completedSessions: number;
  totalFocusTime: number; // in minutes
  averageSessionLength: number; // in minutes
  longestStreak: number;
  currentStreak: number;
  todaySessions: number;
  weekSessions: number;
}

// Web Worker Message Types
export interface WorkerMessage {
  type: string;
  payload: any;
}

export interface TimerStartPayload {
  duration: number;
  timerType: TimerType;
  sessionId: string;
}

export interface TimerTickPayload {
  remainingTime: number;
  elapsed: number;
  progress: number;
  timestamp: number;
}

export interface TimerStatusPayload extends TimerState {
  timestamp: number;
}

export interface WorkerErrorPayload {
  message: string;
  filename?: string;
  lineno?: number;
  timestamp: number;
}