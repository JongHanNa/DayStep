/**
 * 할일 서비스 인터페이스 정의
 */

import { Todo } from '@/entities/todo/Todo';
import { TodoInsert, TodoUpdate, CreateTodoInput, UpdateTodoInput, ScheduleType, RecurrencePattern } from '@/types';

/**
 * 할일 기본 저장소 인터페이스
 */
export interface TodoRepository {
  findById(id: string): Promise<Todo | null>;
  findByUserId(userId: string): Promise<Todo[]>;
  findCompletedByUserId(userId: string): Promise<Todo[]>;
  findPendingByUserId(userId: string): Promise<Todo[]>;
  create(todoData: TodoInsert): Promise<Todo>;
  update(id: string, todoData: TodoUpdate): Promise<Todo>;
  delete(id: string): Promise<void>;
  reorderTodos(userId: string, todoIds: string[]): Promise<void>;
  countByUserId(userId: string): Promise<number>;
  countCompletedByUserId(userId: string): Promise<number>;
  
  // 새로운 스키마 지원 메서드들
  createWithRecurrence(input: CreateTodoInput): Promise<Todo[]>;
  getTodosByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Todo[]>;
  getTodosByScheduleType(userId: string, scheduleType: ScheduleType): Promise<Todo[]>;
  getRecurringTodos(userId: string): Promise<Todo[]>;
  updateRecurringTodo(id: string, updates: UpdateTodoInput, updateType: 'this' | 'future' | 'all'): Promise<void>;
  deleteRecurringTodo(id: string, deleteType: 'this' | 'future' | 'all'): Promise<void>;
}

/**
 * 할일 도메인 서비스 인터페이스
 */
export interface TodoService {
  // 새로운 스키마 지원 메서드들
  createTodoWithSchedule(input: CreateTodoInput): Promise<Todo[]>;
  updateTodoSchedule(id: string, scheduleData: {
    scheduleType: ScheduleType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Todo>;
  updateRecurrence(id: string, recurrenceData: {
    pattern: RecurrencePattern;
    endDate?: Date;
    count?: number;
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }): Promise<void>;
  getTodosForTimeline(userId: string, startDate: Date, endDate: Date): Promise<Todo[]>;
  getScheduledTodos(userId: string, date: Date): Promise<{
    allDay: Todo[];
    timed: Todo[];
    anytime: Todo[];
  }>;
  
  // 기존 메서드들
  getTodoStats(userId: string): Promise<{
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    completionRate: number;
    averageCompletionTime: number;
    oldestPendingTodo: Date | null;
    todayCompleted: number;
    weekCompleted: number;
  }>;
  
  getCompletionTrend(userId: string): Promise<Array<{
    date: string;
    completed: number;
    created: number;
    completionRate: number;
  }>>;
  
  searchTodos(userId: string, query: string): Promise<Todo[]>;
  suggestCleanup(userId: string): Promise<{
    oldTodos: Todo[];
    duplicates: Todo[][];
    suggestions: string[];
  }>;
  
  archiveToRepository(todoId: string, category?: string): Promise<void>;
  restoreFromRepository(repositoryItemId: string): Promise<Todo>;
  bulkOperation(todoIds: string[], operation: 'complete' | 'delete' | 'archive'): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }>;
  
  exportTodos(userId: string, format: 'json' | 'csv'): Promise<string>;
  importTodos(userId: string, data: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }>;
}