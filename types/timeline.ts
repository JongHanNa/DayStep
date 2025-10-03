// Timeline feature type definitions for DayStep app
import {
  TimelineTask,
  TimelineTaskInsert,
  TimelineTaskUpdate,
  PomodoroSession,
  PomodoroSessionInsert,
  PomodoroSessionUpdate,
  TaskTemplate,
  TaskTemplateInsert,
  TaskTemplateUpdate,
} from "./index";

// Enums for timeline tasks
export type TaskStatus = "planned" | "in-progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

// Extended interfaces with computed properties for UI
export interface TimelineTaskWithSession extends TimelineTask {
  sessions?: PomodoroSession[];
  totalWorkTime?: number; // computed from sessions
  completedSessions?: number; // count of completed sessions
}

export interface PomodoroSessionWithTask extends PomodoroSession {
  task?: TimelineTask;
}

export interface TaskTemplateWithUsage extends TaskTemplate {
  usageCount?: number; // how many times this template was used
  lastUsed?: string; // when was this template last used
}

// Timeline view types for different time periods
export interface TimelineDay {
  date: string; // YYYY-MM-DD format
  tasks: TimelineTaskWithSession[];
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number; // percentage
}

export interface TimelineWeek {
  weekStart: string; // YYYY-MM-DD format
  weekEnd: string; // YYYY-MM-DD format
  days: TimelineDay[];
  weeklyGoals?: string[];
  weeklyStats: {
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    productivityScore: number;
  };
}

export interface TimelineMonth {
  year: number;
  month: number; // 1-12
  weeks: TimelineWeek[];
  monthlyGoals?: string[];
  monthlyStats: {
    totalTasks: number;
    completedTasks: number;
    totalHours: number;
    averageDailyHours: number;
    mostProductiveDay: string;
  };
}

// Pomodoro timer related types
export interface PomodoroTimerState {
  isRunning: boolean;
  timeRemaining: number; // in seconds
  currentPhase: "work" | "short-break" | "long-break";
  currentSession?: PomodoroSession;
  currentTask?: TimelineTask;
  completedPomodoros: number;
  settings: PomodoroSettings;
}

export interface PomodoroSettings {
  workDuration: number; // in minutes, default 25
  shortBreakDuration: number; // in minutes, default 5
  longBreakDuration: number; // in minutes, default 15
  longBreakInterval: number; // every N pomodoros, default 4
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

// Calendar integration types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: TimelineTask;
  color?: string;
  editable?: boolean;
}

// Analytics and reporting types
export interface ProductivityStats {
  period: "day" | "week" | "month" | "year";
  startDate: string;
  endDate: string;
  metrics: {
    tasksCompleted: number;
    totalWorkHours: number;
    averageTaskDuration: number;
    pomodoroSessions: number;
    focusTime: number; // actual work time vs planned
    priorityDistribution: Record<TaskPriority, number>;
    statusDistribution: Record<TaskStatus, number>;
  };
  trends: {
    completionRate: number; // percentage change from previous period
    productivityScore: number; // 0-100
    consistency: number; // how consistent daily work hours are
  };
}

// Filter and search types
export interface TimelineFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: TaskStatus[];
  priority?: TaskPriority[];
  searchQuery?: string;
  hasPlannedTime?: boolean;
  hasSessions?: boolean;
}

export interface TimelineSortOptions {
  field:
    | "title"
    | "planned_start_time"
    | "planned_end_time"
    | "priority"
    | "status"
    | "created_at";
  direction: "asc" | "desc";
}

// Export/Import types
export interface TimelineExportData {
  tasks: TimelineTask[];
  sessions: PomodoroSession[];
  templates: TaskTemplate[];
  exportDate: string;
  version: string;
}

export interface TimelineImportResult {
  success: boolean;
  importedTasks: number;
  importedSessions: number;
  importedTemplates: number;
  errors?: string[];
  warnings?: string[];
}
