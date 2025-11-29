import { Todo } from "@/entities/todo/Todo";
import {
  CreateTodoInput,
  UpdateTodoInput,
  ScheduleType,
  RecurrencePattern,
} from "@/types";
import type { BaseStoreState, FilterState } from "../../types";
import type {
  OptimisticOperation,
  RealtimeConnectionState,
  RealtimeSyncState,
} from "../../utils/storeUtils";

/**
 * 할일 스토어 상태 타입 정의
 */
export interface TodoStoreState extends BaseStoreState {
  // 데이터 상태
  todos: Todo[];
  selectedTodo: Todo | null;

  // API 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 새로운 스키마 관련 상태
  recurringGroups: Map<string, Todo[]>; // parent_todo_id -> instances

  // 반복 할일 완료 상태 관련
  todoCompletions: { todo_id: string; completion_date: string }[]; // 완료 기록 캐시

  // 📦 전역 로드 상태 관리 (중복 호출 방지)
  loadState: {
    hasInitiallyLoaded: boolean;
    lastFetchTime: number;
    cacheValidityPeriod: number; // 5분 (300,000ms)
    currentDateKey: string; // 날짜별 캐시 키
  };

  // 필터 및 정렬 상태
  filters: FilterState & {
    completed: "all" | "pending" | "completed";
    showCompleted: boolean;
  };

  // 실시간 구독 상태
  isSubscribed: boolean;
  channel: any;

  // 통계 정보
  stats: {
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    completionRate: number;
    todayCompleted: number;
  };

  // 드래그 앤 드롭 상태
  dragState: {
    isDragging: boolean;
    draggedTodo: Todo | null;
    dropTarget: string | null;
  };

  // 낙관적 업데이트 상태
  optimisticState: {
    pendingOperations: OptimisticOperation<Todo>[];
    isProcessing: boolean;
    retryingOperations: Set<string>;
  };

  // 실시간 동기화 상태
  realtimeConnection: RealtimeConnectionState;
  realtimeSync: RealtimeSyncState;

  // 액션들 (날짜 범위 기반으로 통일)
  fetchTodosForCurrentView: () => Promise<void>;
  fetchTodosForDate: (utcStart: Date, utcEnd: Date) => Promise<Todo[]>;
  fetchTodosByProjectId: (projectId: string) => Promise<any[]>;
  fetchAllTodos: () => Promise<void>; // 전체 할일 조회 (날짜 범위 제한 없음)
  fetchTodoById: (id: string) => Promise<Todo | null>;
  createTodo: (data: CreateTodoInput) => Promise<Todo | null>;
  createTodoWithRecurrence: (input: CreateTodoInput) => Promise<Todo[]>;
  updateTodo: (
    id: string,
    data: Partial<CreateTodoInput>
  ) => Promise<Todo | null>;
  updateRecurringTodo: (
    id: string,
    updates: Partial<CreateTodoInput>,
    updateType: "this" | "future" | "all",
    occurrenceDate?: Date
  ) => Promise<Todo[]>;
  deleteTodo: (id: string) => Promise<boolean>;
  deleteRecurringTodo: (id: string, deleteType: 'this' | 'future' | 'all', excludedDate?: string) => Promise<boolean>;

  // 완료 상태 관리
  toggleTodo: (id: string) => Promise<boolean>;
  toggleMultipleTodos: (ids: string[], completed: boolean) => Promise<boolean>;
  
  // 반복 할일 완료 상태 관리
  loadCompletionsForDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  toggleRecurrenceCompletion: (todoId: string, targetDate: Date) => Promise<boolean>;
  isRecurrenceCompleted: (todoId: string, targetDate: Date) => boolean;

  // 순서 관리
  reorderTodos: (
    draggedId: string,
    targetId: string,
    position: "before" | "after"
  ) => Promise<boolean>;
  moveToTop: (id: string) => Promise<boolean>;
  moveToBottom: (id: string) => Promise<boolean>;

  // 필터링 및 검색
  setSearchQuery: (query: string) => void;
  setCompletedFilter: (completed: "all" | "pending" | "completed") => void;
  setShowCompleted: (show: boolean) => void;
  setSortBy: (sortBy: string, sortOrder?: "asc" | "desc") => void;

  // 선택 상태 관리
  selectTodo: (todo: Todo | null) => void;

  // 드래그 앤 드롭
  startDrag: (todo: Todo) => void;
  endDrag: () => void;
  setDropTarget: (targetId: string | null) => void;

  // 실시간 구독
  subscribe: () => void;
  unsubscribe: () => void;

  // 통계 및 유틸리티
  refreshStats: () => void;
  getFilteredTodos: () => Todo[];
  getPendingTodos: () => Todo[];
  getCompletedTodos: () => Todo[];

  // 새로운 스키마 관련 유틸리티
  getTodosByDateRange: (startDate: Date, endDate: Date) => Todo[];
  getTodosByScheduleType: (type: ScheduleType) => Todo[];
  getRecurringTodos: () => Todo[];
  getRecurringInstances: (parentId: string) => Todo[];
  filterByScheduleType: (type: ScheduleType) => Todo[];

  // 아카이브 기능
  archiveTodo: (id: string, category?: string) => Promise<boolean>;
  restoreFromRepository: (repositoryItemId: string) => Promise<Todo | null>;

  // 일괄 작업
  bulkComplete: (ids: string[]) => Promise<boolean>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  bulkArchive: (ids: string[], category?: string) => Promise<boolean>;

  // 스토어 초기화
  reset: () => void;
  clearTodos: () => void; // 로그아웃 시 스토어 초기화

  // 낙관적 업데이트 관리
  retryFailedOperation: (operationId: string) => Promise<void>;
  clearFailedOperations: () => void;
  getPendingOperationsCount: () => number;

  // 실시간 동기화 관리
  forceReconnect: () => void;
  getConnectionStatus: () => string;
  getSyncStatus: () => RealtimeSyncState;

  // 📦 전역 로드 상태 관리 메서드들
  isDataStale: () => boolean;
  shouldRefreshData: (dateKey?: string) => boolean;
  resetLoadState: (reason?: "navigation" | "date" | "crud" | "manual") => void;
  fetchTodosIfNeeded: (forceRefresh?: boolean) => Promise<void>;
  updateCacheKey: (dateKey: string) => void;

  // 상태 복원
  restoreTodoInstances: () => void;
}

// 일반적으로 사용되는 타입들 export
export type TodoCompletion = { todo_id: string; completion_date: string };
export type DeleteType = 'this' | 'future' | 'all';
export type UpdateType = "this" | "future" | "all";
export type CompletedFilter = "all" | "pending" | "completed";
export type DragPosition = "before" | "after";
export type LoadStateReason = "navigation" | "date" | "crud" | "manual";