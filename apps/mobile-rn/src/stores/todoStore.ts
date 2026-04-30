/**
 * Todo Store (Zustand + MMKV)
 * 웹앱 todoStore 패턴의 RN 네이티브 구현
 * - CRUD, optimistic update, 날짜별 필터링
 * - 오프라인 큐 (MMKV 기반)
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase, fetchWithJWT} from '@/lib/supabase';
import {syncWidgetData} from '@/lib/widgetBridge';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {Todo} from '@daystep/shared-core';
import {
  startOfDay,
  endOfDay,
  format,
  getDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  subMonths,
  addMonths,
} from 'date-fns';

// ============================================
// Types
// ============================================

interface CreateTodoInput {
  title: string;
  content?: string | null;
  schedule_type?: string;
  start_time?: string;
  end_time?: string;
  icon?: string;
  color?: string;
  importance?: boolean;
  urgency?: boolean;
  is_reluctant_must_do?: boolean;
  recurrence_pattern?: string;
  recurrence_days_of_week?: number[];
  project_ids?: string[];
  alarm_offset_minutes?: number | null;
}

interface TodoCompletion {
  id: string;
  todo_id: string;
  user_id: string;
  completion_date: string;
}

type PostponeAction = 'reschedule' | 'anytime' | 'start_now';

export interface MonthTodoSummary {
  id: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  schedule_type: string;
  recurrence_pattern: string;
  recurrence_days_of_week: number[] | null;
  recurrence_end_date: string | null;
  color: string | null;
}

interface LinkedMotivation {
  id: string;
  title: string;
  content: string;
}

interface TodoState {
  // 데이터
  todos: Todo[];
  completions: TodoCompletion[]; // 반복할일 날짜별 완료 기록
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  motivationMap: Record<string, LinkedMotivation[]>; // todoId → linked motivations

  // 로딩 상태
  loading: boolean;
  error: string | null;

  // 월간 뷰
  monthViewData: Record<string, MonthTodoSummary[]> | null;
  monthViewLoading: boolean;

  /** 모든 todo mutation에서 +1. 각 화면이 useEffect dep으로 listen해 자동 reload. */
  dataVersion: number;

  // 오프라인 큐
  offlineQueue: OfflineAction[];

  // 액션
  /** 모든 todo mutation에서 호출 — 각 화면 useEffect dep으로 자동 reload trigger */
  bumpDataVersion: () => void;
  fetchTodosForDate: (date: string) => Promise<void>;
  fetchTodosForDateRange: (startDate: string, endDate: string) => Promise<Record<string, Todo[]>>;
  fetchTodosForMonthView: (year: number, month: number) => Promise<void>;
  /** 위젯에 3개월 풀셋을 직접 DB에서 쿼리해서 동기화 (연/월 미지정 시 오늘 기준) */
  syncWidget: (year?: number, month?: number) => Promise<void>;
  fetchMotivationsForTodos: (todoIds: string[]) => Promise<void>;
  fetchAllTodos: (userId: string, days?: number) => Promise<Todo[]>;
  createTodo: (input: CreateTodoInput) => Promise<Todo | null>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleTodoCompletion: (id: string) => Promise<boolean>;
  toggleRecurringCompletion: (todoId: string, date: string) => Promise<boolean>;
  setSelectedDate: (date: string) => void;
  updateRecurringTodo: (
    id: string,
    updates: Partial<Todo>,
    updateType: 'this' | 'future' | 'all',
    occurrenceDate: string,
  ) => Promise<boolean>;
  postponeTodo: (
    id: string,
    action: PostponeAction,
    newTime?: string,
  ) => Promise<boolean>;
  skipTodo: (id: string, reason: 'not_needed' | 'missed') => Promise<boolean>;
  unskipTodo: (id: string) => Promise<boolean>;
  restoreDeferredTodo: (todoId: string) => Promise<boolean>;
  processOfflineQueue: () => Promise<void>;
  clearError: () => void;
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  payload: any;
  timestamp: number;
}

// ============================================
// Helpers
// ============================================

/** snake_case DB 레코드 → 그대로 사용 (shared-core Todo 타입이 snake_case) */
function parseTodo(record: any): Todo {
  return record as Todo;
}

/** 현재 로그인한 사용자 ID */
async function getCurrentUserId(): Promise<string | null> {
  const {data: {session}} = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * 위젯 payload 빌드 + 동기화 (3개월 범위: 전월/당월/익월)
 * 인메모리 todos 스냅샷 기준 — mutation 직후 호출 시 DB 재쿼리 없이 반영
 */
function buildAndSyncWidget(todos: Todo[], year: number, month: number): void {
  const monthAnchor = new Date(year, month - 1, 1);
  const prevMonthStart = startOfMonth(subMonths(monthAnchor, 1));
  const nextMonthEnd = endOfMonth(addMonths(monthAnchor, 1));

  const filterTodosForDay = (dateStr: string, dayOfWeek: number) => {
    return todos.filter((todo: any) => {
      if (todo.recurrence_pattern === 'daily') {
        if (!todo.start_time) return false;
        const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
        if (startDate > dateStr) return false;
        if (todo.recurrence_end_date && todo.recurrence_end_date <= dateStr) return false;
        return true;
      }
      if (todo.recurrence_pattern === 'weekly') {
        if (!todo.start_time) return false;
        const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
        if (startDate > dateStr) return false;
        if (todo.recurrence_end_date && todo.recurrence_end_date <= dateStr) return false;
        return todo.recurrence_days_of_week?.includes(dayOfWeek) ?? false;
      }
      if (todo.start_time) {
        const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
        if (startDate === dateStr) return true;
        if (todo.end_time && todo.schedule_type === 'timed') {
          const endDate = format(parseISO(todo.end_time), 'yyyy-MM-dd');
          if (startDate < dateStr && endDate >= dateStr) return true;
        }
      }
      return false;
    });
  };

  const allDays = eachDayOfInterval({start: prevMonthStart, end: nextMonthEnd});
  const widgetDays = allDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTodos = filterTodosForDay(dateStr, getDay(day));
    return {
      date: dateStr,
      todos: dayTodos.slice(0, 5).map((t: any) => ({
        title: t.title,
        color: t.color || '#3B82F6',
      })),
    };
  });

  syncWidgetData({year, month, days: widgetDays}).catch(() => {/* 위젯 실패는 조용히 */});
}

/** 특정 할일 기준으로 위젯 동기화 대상 월을 결정 */
function getWidgetMonthForTodo(todo: any, fallbackDate: string): {year: number; month: number} {
  const dateStr = todo?.start_time
    ? format(parseISO(todo.start_time), 'yyyy-MM-dd')
    : fallbackDate;
  const d = parseISO(dateStr);
  return {year: d.getFullYear(), month: d.getMonth() + 1};
}

/**
 * 위젯용 3개월(전월~익월) 범위 Supabase 쿼리
 * fetchTodosForMonthView와 syncWidgetForMonth에서 공용
 */
async function fetchWidgetTodosRange(
  userId: string,
  year: number,
  month: number,
): Promise<MonthTodoSummary[]> {
  const monthAnchor = new Date(year, month - 1);
  const prevMonthStart = startOfMonth(subMonths(monthAnchor, 1));
  const nextMonthEnd = endOfMonth(addMonths(monthAnchor, 1));
  const rangeStartISO = prevMonthStart.toISOString();
  const rangeEndISO = nextMonthEnd.toISOString();
  const rangeStartDate = format(prevMonthStart, 'yyyy-MM-dd');

  const {data, error} = await supabase
    .from('todos')
    .select('id, title, start_time, end_time, schedule_type, recurrence_pattern, recurrence_days_of_week, recurrence_end_date, color')
    .eq('user_id', userId)
    .or(
      [
        `and(schedule_type.eq.timed,start_time.gte.${rangeStartISO},start_time.lte.${rangeEndISO})`,
        `and(schedule_type.eq.anytime,start_time.gte.${rangeStartISO},start_time.lte.${rangeEndISO})`,
        `and(recurrence_pattern.eq.daily,start_time.lte.${rangeEndISO},or(recurrence_end_date.is.null,recurrence_end_date.gt.${rangeStartDate}))`,
        `and(recurrence_pattern.eq.weekly,start_time.lte.${rangeEndISO},or(recurrence_end_date.is.null,recurrence_end_date.gt.${rangeStartDate}))`,
      ].join(','),
    );

  if (error) throw error;
  return (data ?? []) as MonthTodoSummary[];
}

/**
 * 특정 월 기준 3개월 풀셋을 DB에서 쿼리해 위젯에 동기화
 * mutation 후 호출 — state.todos가 1일치만 있어도 위젯은 풀셋 유지
 */
async function syncWidgetForMonth(year: number, month: number): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const rangeTodos = await fetchWidgetTodosRange(userId, year, month);
    buildAndSyncWidget(rangeTodos as unknown as Todo[], year, month);
  } catch {
    /* 위젯 동기화 실패는 조용히 */
  }
}

// ============================================
// Store
// ============================================

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      completions: [],
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      motivationMap: {},
      loading: false,
      error: null,
      offlineQueue: [],
      monthViewData: null,
      monthViewLoading: false,
      dataVersion: 0,

      bumpDataVersion: () => set(s => ({dataVersion: s.dataVersion + 1})),

      setSelectedDate: (date: string) => {
        set({selectedDate: date});
        get().fetchTodosForDate(date);
      },

      fetchTodosForDate: async (date: string) => {
        try {
          set({loading: true, error: null});

          const userId = await getCurrentUserId();
          if (!userId) {
            set({loading: false, error: 'Not authenticated'});
            return;
          }

          const dayStart = startOfDay(new Date(date)).toISOString();
          const dayEnd = endOfDay(new Date(date)).toISOString();
          const dayOfWeek = getDay(new Date(date));

          // Supabase SDK 쿼리 사용 (RLS 자동 적용)
          const {data, error} = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .or(
              [
                // 시간 지정 할일 (해당 날짜에 시작)
                `and(schedule_type.eq.timed,start_time.gte.${dayStart},start_time.lte.${dayEnd},recurrence_pattern.eq.none)`,
                // 크로스데이 시간 지정 (전날 시작했지만 이 날짜까지 걸침)
                `and(schedule_type.eq.timed,start_time.lt.${dayStart},end_time.gt.${dayStart},recurrence_pattern.eq.none)`,
                // 종일 할일 (해당 날짜에 시작) — 단일·다일 모두 시작일에서 매치
                `and(schedule_type.eq.all_day,start_time.gte.${dayStart},start_time.lte.${dayEnd},recurrence_pattern.eq.none)`,
                // 크로스데이 종일 (전날 이전 시작, end_time이 이 날짜 안까지 — inclusive end 23:59:59.999 저장 가정)
                `and(schedule_type.eq.all_day,start_time.lt.${dayStart},end_time.gt.${dayStart},recurrence_pattern.eq.none)`,
                // 매일 반복 (종료일 필터 포함)
                `and(recurrence_pattern.eq.daily,start_time.lte.${dayEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${date}))`,
                // 주간 반복 (해당 요일, 종료일 필터 포함)
                `and(recurrence_pattern.eq.weekly,recurrence_days_of_week.cs.[${dayOfWeek}],start_time.lte.${dayEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${date}))`,
                // anytime (시간 미지정)
                `and(schedule_type.eq.anytime,start_time.gte.${dayStart},start_time.lte.${dayEnd})`,
                // 반복 할일에서 파생된 미룸 (occurrence_date로 날짜 매칭)
                `and(parent_recurring_todo_id.not.is.null,occurrence_date.eq.${date})`,
                // 비반복 미룸 (original_start_time으로 날짜 매칭)
                `and(schedule_type.eq.anytime,start_time.is.null,original_start_time.gte.${dayStart},original_start_time.lte.${dayEnd})`,
              ].join(','),
            )
            .order('order_index', {ascending: true});

          if (error) throw error;

          let filteredData = data ?? [];

          // 반복 할일 exclusions 필터링
          const recurringIds = filteredData
            .filter(t => t.recurrence_pattern && t.recurrence_pattern !== 'none')
            .map(t => t.id);

          let completionData: TodoCompletion[] = [];

          if (recurringIds.length > 0) {
            // exclusions + completions 병렬 실행 (네트워크 대기 시간 절감)
            const [exclusionsResult, completionsResult] = await Promise.all([
              supabase
                .from('todo_exclusions')
                .select('parent_todo_id, exclusion_reason')
                .eq('excluded_date', date)
                .in('parent_todo_id', recurringIds),
              supabase
                .from('todo_completions')
                .select('id, todo_id, user_id, completion_date')
                .eq('completion_date', date)
                .eq('user_id', userId)
                .in('todo_id', recurringIds),
            ]);

            const exclusions = exclusionsResult.data;
            const completions = completionsResult.data;

            // deleted/postponed exclusion 빌드
            const excludedIds = new Set(
              (exclusions ?? [])
                .filter(e => e.exclusion_reason === 'deleted' || e.exclusion_reason === 'postponed')
                .map(e => e.parent_todo_id),
            );
            filteredData = filteredData.filter(t => !excludedIds.has(t.id));

            // not_needed/missed → todo_exclusions 기준으로 skip_status 결정
            const skipMap = new Map<string, string>();
            (exclusions ?? [])
              .filter(e => e.exclusion_reason === 'not_needed' || e.exclusion_reason === 'missed')
              .forEach(e => skipMap.set(e.parent_todo_id, e.exclusion_reason));

            filteredData = filteredData.map(t => {
              const isRecurring = t.recurrence_pattern && t.recurrence_pattern !== 'none';
              if (!isRecurring) return t;
              return {...t, skip_status: skipMap.get(t.id) ?? null};
            });

            // excluded된 할일의 completion은 제외
            completionData = ((completions ?? []) as TodoCompletion[])
              .filter(c => !excludedIds.has(c.todo_id));
          }

          // 반복할일의 completed 필드를 날짜별 상태로 덮어씀
          const completedTodoIds = new Set(completionData.map(c => c.todo_id));
          const enrichedData = filteredData.map(t => {
            const isRecurring = t.recurrence_pattern && t.recurrence_pattern !== 'none';
            if (isRecurring) {
              return {...t, completed: completedTodoIds.has(t.id)};
            }
            return t;
          });

          // 반복할일 시간 정규화: 원본 시간대(hour:min)를 조회 날짜에 맞춤
          const normalizedData = enrichedData.map(t => {
            const isRecurring = t.recurrence_pattern && t.recurrence_pattern !== 'none';
            if (!isRecurring || !t.start_time) return t;

            const originalStart = new Date(t.start_time);
            const viewDate = new Date(date + 'T00:00:00');

            const normalizedStart = new Date(viewDate);
            normalizedStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds());

            let normalizedEnd: string | null = null;
            if (t.end_time) {
              const originalEnd = new Date(t.end_time);
              const endDate = new Date(viewDate);
              endDate.setHours(originalEnd.getHours(), originalEnd.getMinutes(), originalEnd.getSeconds());
              normalizedEnd = endDate.toISOString();
            }

            return {
              ...t,
              start_time: normalizedStart.toISOString(),
              end_time: normalizedEnd,
            };
          });

          set({
            todos: normalizedData.map(parseTodo),
            completions: completionData,
            selectedDate: date,
            loading: false,
          });
        } catch (err: any) {
          console.error('[TodoStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch todos', loading: false});
        }
      },

      fetchTodosForDateRange: async (startDate: string, endDate: string) => {
        try {
          const userId = await getCurrentUserId();
          if (!userId) return {};

          const rangeStart = startOfDay(new Date(startDate)).toISOString();
          const rangeEnd = endOfDay(new Date(endDate)).toISOString();

          const {data, error} = await supabase
            .from('todos')
            .select('id, title, start_time, end_time, completed, color, schedule_type, recurrence_pattern, recurrence_days_of_week, recurrence_end_date')
            .eq('user_id', userId)
            .or(
              [
                // 시간 지정: 범위 내 시작 또는 범위에 걸침
                `and(schedule_type.eq.timed,start_time.gte.${rangeStart},start_time.lte.${rangeEnd},recurrence_pattern.eq.none)`,
                `and(schedule_type.eq.timed,start_time.lt.${rangeStart},end_time.gt.${rangeStart},recurrence_pattern.eq.none)`,
                // 종일: 범위 내 시작 또는 범위에 걸침 (다일 종일 포함)
                `and(schedule_type.eq.all_day,start_time.gte.${rangeStart},start_time.lte.${rangeEnd},recurrence_pattern.eq.none)`,
                `and(schedule_type.eq.all_day,start_time.lt.${rangeStart},end_time.gt.${rangeStart},recurrence_pattern.eq.none)`,
                `and(schedule_type.eq.anytime,start_time.gte.${rangeStart},start_time.lte.${rangeEnd})`,
                `and(recurrence_pattern.eq.daily,start_time.lte.${rangeEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${startDate}))`,
                `and(recurrence_pattern.eq.weekly,start_time.lte.${rangeEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${startDate}))`,
              ].join(','),
            );

          if (error) throw error;

          const todos = (data ?? []) as Todo[];

          // 반복 할일 exclusions 조회 — "지금 반복" 등으로 분리된 occurrence를 부모로부터 숨기기 위함
          const recurringIds = todos
            .filter(t => t.recurrence_pattern && t.recurrence_pattern !== 'none')
            .map(t => t.id);

          const exclusionMap = new Map<string, Set<string>>();
          if (recurringIds.length > 0) {
            const {data: exclusions} = await supabase
              .from('todo_exclusions')
              .select('parent_todo_id, excluded_date, exclusion_reason')
              .gte('excluded_date', startDate)
              .lte('excluded_date', endDate)
              .in('parent_todo_id', recurringIds);

            for (const e of exclusions ?? []) {
              if (e.exclusion_reason !== 'deleted' && e.exclusion_reason !== 'postponed') continue;
              const set = exclusionMap.get(e.excluded_date) ?? new Set<string>();
              set.add(e.parent_todo_id);
              exclusionMap.set(e.excluded_date, set);
            }
          }

          const result: Record<string, Todo[]> = {};

          // 범위 내 각 날짜별 할일 매핑
          const days = eachDayOfInterval({
            start: new Date(startDate),
            end: new Date(endDate),
          });

          for (const day of days) {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayOfWeek = getDay(day);
            const excludedForDay = exclusionMap.get(dateStr);

            result[dateStr] = todos.filter(todo => {
              // 해당 날짜에 deleted/postponed 처리된 반복 할일은 숨김
              if (excludedForDay && excludedForDay.has(todo.id)) return false;

              if (todo.recurrence_pattern === 'daily') {
                if (!todo.start_time) return false;
                const todoStartDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                if (todoStartDate > dateStr) return false;
                if ((todo as any).recurrence_end_date && (todo as any).recurrence_end_date <= dateStr) return false;
                return true;
              }
              if (todo.recurrence_pattern === 'weekly') {
                if (!todo.start_time) return false;
                const todoStartDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                if (todoStartDate > dateStr) return false;
                if ((todo as any).recurrence_end_date && (todo as any).recurrence_end_date <= dateStr) return false;
                return (todo as any).recurrence_days_of_week?.includes(dayOfWeek) ?? false;
              }
              // 다일 종일·시간 지정 — dateStr이 [start_date, end_date] 범위 안이면 매치 (inclusive)
              if (
                (todo.schedule_type === 'all_day' || todo.schedule_type === 'timed') &&
                todo.start_time &&
                todo.end_time
              ) {
                const startStr = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                const endStr = format(parseISO(todo.end_time), 'yyyy-MM-dd');
                if (startStr !== endStr) {
                  return dateStr >= startStr && dateStr <= endStr;
                }
              }
              // 단일/기본
              if (todo.start_time) {
                return format(parseISO(todo.start_time), 'yyyy-MM-dd') === dateStr;
              }
              return false;
            });
          }

          return result;
        } catch (err) {
          console.error('[TodoStore] fetchTodosForDateRange error:', err);
          return {};
        }
      },

      createTodo: async (input) => {
        try {
          set({loading: true, error: null});

          const userId = await getCurrentUserId();
          if (!userId) throw new Error('Not authenticated');

          const todoData = {
            ...input,
            user_id: userId,
            completed: false,
            order_index: get().todos.length,
            schedule_type: input.schedule_type ?? 'timed',
            recurrence_pattern: input.recurrence_pattern ?? 'none',
          };

          // Optimistic: 로컬에 먼저 추가
          const tempId = `temp_${Date.now()}`;
          const optimisticTodo = {
            ...todoData,
            id: tempId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Todo;

          set(state => ({
            todos: [...state.todos, optimisticTodo],
          }));

          // 서버에 저장
          const {data, error} = await supabase
            .from('todos')
            .insert(todoData)
            .select()
            .single();

          if (error) {
            // 롤백
            set(state => ({
              todos: state.todos.filter(t => t.id !== tempId),
            }));
            throw error;
          }

          // 임시 ID를 실제 ID로 교체
          set(state => ({
            todos: state.todos.map(t =>
              t.id === tempId ? parseTodo(data) : t,
            ),
            dataVersion: state.dataVersion + 1,
          }));

          // 위젯 동기화 (3개월 풀셋 재쿼리 — fire-and-forget)
          const {year, month} = getWidgetMonthForTodo(data, get().selectedDate);
          syncWidgetForMonth(year, month);

          return parseTodo(data);
        } catch (err: any) {
          console.error('[TodoStore] Create error:', err);
          set({error: err.message ?? 'Failed to create todo'});
          return null;
        } finally {
          set({loading: false});
        }
      },

      updateTodo: async (id, updates) => {
        const originalTodos = get().todos;
        const originalTodo = originalTodos.find(t => t.id === id);
        try {
          // Optimistic update
          set(state => ({
            todos: state.todos.map(t =>
              t.id === id ? {...t, ...updates, updated_at: new Date().toISOString()} : t,
            ),
            dataVersion: state.dataVersion + 1,
          }));

          const {error} = await supabase
            .from('todos')
            .update({...updates, updated_at: new Date().toISOString()})
            .eq('id', id);

          if (error) throw error;

          // 위젯 동기화: 변경 전/후 날짜가 다를 수 있으므로 양쪽 월 모두 갱신
          const updatedTodo = get().todos.find(t => t.id === id);
          const oldMonth = originalTodo
            ? getWidgetMonthForTodo(originalTodo, get().selectedDate)
            : null;
          const newMonth = updatedTodo
            ? getWidgetMonthForTodo(updatedTodo, get().selectedDate)
            : null;
          if (newMonth) syncWidgetForMonth(newMonth.year, newMonth.month);
          if (
            oldMonth &&
            (!newMonth || oldMonth.year !== newMonth.year || oldMonth.month !== newMonth.month)
          ) {
            syncWidgetForMonth(oldMonth.year, oldMonth.month);
          }

          return true;
        } catch (err: any) {
          // 롤백
          set({todos: originalTodos});
          console.error('[TodoStore] Update error:', err);
          set({error: err.message ?? 'Failed to update todo'});
          return false;
        }
      },

      deleteTodo: async (id) => {
        const originalTodos = get().todos;
        const deletedTodo = originalTodos.find(t => t.id === id);
        try {
          // Optimistic delete
          set(state => ({
            todos: state.todos.filter(t => t.id !== id),
            dataVersion: state.dataVersion + 1,
          }));

          const {error} = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // 위젯 동기화
          if (deletedTodo) {
            const {year, month} = getWidgetMonthForTodo(deletedTodo, get().selectedDate);
            syncWidgetForMonth(year, month);
          }

          return true;
        } catch (err: any) {
          // 롤백
          set({todos: originalTodos});
          console.error('[TodoStore] Delete error:', err);
          set({error: err.message ?? 'Failed to delete todo'});
          return false;
        }
      },

      toggleTodoCompletion: async (id) => {
        const todo = get().todos.find(t => t.id === id);
        if (!todo) return false;

        const isRecurring = (todo as any).recurrence_pattern && (todo as any).recurrence_pattern !== 'none';
        if (isRecurring) {
          return get().toggleRecurringCompletion(id, get().selectedDate);
        }

        // 비반복 할일: 기존 방식 유지
        return get().updateTodo(id, {
          completed: !todo.completed,
        } as Partial<Todo>);
      },

      toggleRecurringCompletion: async (todoId, date) => {
        const todo = get().todos.find(t => t.id === todoId);
        if (!todo) return false;

        const userId = await getCurrentUserId();
        if (!userId) return false;

        const existingCompletion = get().completions.find(
          c => c.todo_id === todoId && c.completion_date === date,
        );
        const newCompleted = !existingCompletion;

        // Optimistic update
        const originalTodos = get().todos;
        const originalCompletions = get().completions;
        set(state => ({
          todos: state.todos.map(t =>
            t.id === todoId ? {...t, completed: newCompleted} : t,
          ),
          completions: existingCompletion
            ? state.completions.filter(c => c.id !== existingCompletion.id)
            : [...state.completions, {
                id: `temp_${Date.now()}`,
                todo_id: todoId,
                user_id: userId,
                completion_date: date,
              }],
          dataVersion: state.dataVersion + 1,
        }));

        try {
          if (existingCompletion) {
            // 완료 → 미완료: DELETE
            const {error} = await supabase
              .from('todo_completions')
              .delete()
              .eq('id', existingCompletion.id);
            if (error) throw error;
          } else {
            // 미완료 → 완료: INSERT
            const {data, error} = await supabase
              .from('todo_completions')
              .insert({
                todo_id: todoId,
                user_id: userId,
                completion_date: date,
              })
              .select()
              .single();
            if (error) throw error;

            // 임시 ID를 실제 ID로 교체
            set(state => ({
              completions: state.completions.map(c =>
                c.todo_id === todoId && c.id.startsWith('temp_')
                  ? (data as TodoCompletion)
                  : c,
              ),
            }));
          }

          // 위젯 동기화: 토글된 날짜 기준 월
          const toggleDate = parseISO(date);
          syncWidgetForMonth(toggleDate.getFullYear(), toggleDate.getMonth() + 1);

          return true;
        } catch (err: any) {
          // 롤백
          set({todos: originalTodos, completions: originalCompletions});
          console.error('[TodoStore] toggleRecurringCompletion error:', err);
          set({error: err.message ?? 'Failed to toggle recurring completion'});
          return false;
        }
      },

      updateRecurringTodo: async (id, updates, updateType, occurrenceDate) => {
        try {
          const userId = await getCurrentUserId();
          if (!userId) throw new Error('Not authenticated');

          const todo = get().todos.find(t => t.id === id);
          if (!todo) throw new Error('Todo not found');

          switch (updateType) {
            case 'this': {
              // 1. exclusion 생성
              await supabase.from('todo_exclusions').insert({
                parent_todo_id: id,
                excluded_date: occurrenceDate,
                user_id: userId,
                exclusion_reason: 'deleted',
              });

              // 2. 원본 속성 복사 + updates 적용한 새 독립 할일 생성
              const newTodoData = {
                title: todo.title,
                start_time: todo.start_time,
                end_time: todo.end_time,
                schedule_type: todo.schedule_type || 'timed',
                icon: todo.icon,
                color: todo.color,
                user_id: userId,
                recurrence_pattern: 'none',
                completed: false,
                order_index: todo.order_index || 0,
                // 원본값 복사 (updates spread로 덮어쓸 수 있도록 전에 배치)
                importance: (todo as any).importance ?? null,
                urgency: (todo as any).urgency ?? null,
                is_reluctant_must_do: (todo as any).is_reluctant_must_do ?? false,
                // 분리 추적: 원본 반복 할일과의 관계
                parent_recurring_todo_id: id,
                occurrence_date: occurrenceDate,
                ...updates,
              };

              const {data: newTodo, error: createErr} = await supabase
                .from('todos')
                .insert(newTodoData)
                .select()
                .single();

              if (createErr) throw createErr;

              // 로컬 상태: 원본 제거 + 새 할일 추가
              set(state => ({
                todos: [
                  ...state.todos.filter(t => t.id !== id),
                  parseTodo(newTodo),
                ],
                dataVersion: state.dataVersion + 1,
              }));
              break;
            }
            case 'future': {
              // 매일/주간 반복은 한 부모 todo가 모든 occurrence를 표현하므로
              // (1) 부모의 recurrence_end_date를 occurrenceDate 직전 날로 단축
              // (2) occurrenceDate부터 새 시간으로 시작하는 새 반복 todo 생성
              const occDate = parseISO(occurrenceDate);
              const prevDate = new Date(occDate.getTime() - 86_400_000);
              const prevDateStr = format(prevDate, 'yyyy-MM-dd');

              const {error: updateErr} = await supabase
                .from('todos')
                .update({
                  recurrence_end_date: prevDateStr,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', id);
              if (updateErr) throw updateErr;

              // 새 반복 todo — occurrenceDate부터 시작, 새 시간/폭, 같은 recurrence 패턴
              const newTodoData: Record<string, any> = {
                title: todo.title,
                schedule_type: todo.schedule_type || 'timed',
                icon: (todo as any).icon ?? null,
                color: (todo as any).color ?? null,
                user_id: userId,
                completed: false,
                order_index: (todo as any).order_index ?? 0,
                importance: (todo as any).importance ?? null,
                urgency: (todo as any).urgency ?? null,
                is_reluctant_must_do: (todo as any).is_reluctant_must_do ?? false,
                recurrence_pattern: (todo as any).recurrence_pattern,
                recurrence_days_of_week: (todo as any).recurrence_days_of_week ?? null,
                recurrence_end_date: null,
                ...updates,
              };

              const {data: newTodo, error: createErr} = await supabase
                .from('todos')
                .insert(newTodoData)
                .select()
                .single();
              if (createErr) throw createErr;

              // 로컬 상태: 원본의 recurrence_end_date 갱신 + 새 todo 추가
              set(state => ({
                todos: [
                  ...state.todos.map(t =>
                    t.id === id
                      ? {
                          ...t,
                          recurrence_end_date: prevDateStr,
                          updated_at: new Date().toISOString(),
                        }
                      : t,
                  ),
                  parseTodo(newTodo),
                ],
                dataVersion: state.dataVersion + 1,
              }));
              break;
            }
            case 'all': {
              const parentId = (todo as any).parent_todo_id || id;
              const {error} = await supabase
                .from('todos')
                .update({...updates, updated_at: new Date().toISOString()})
                .or(`id.eq.${parentId},parent_todo_id.eq.${parentId}`);

              if (error) throw error;

              // 로컬 상태 업데이트
              set(state => ({
                todos: state.todos.map(t =>
                  t.id === id ? {...t, ...updates, updated_at: new Date().toISOString()} : t,
                ),
                dataVersion: state.dataVersion + 1,
              }));
              break;
            }
          }

          // 위젯 동기화: occurrenceDate 월 + 원본 start_time 월
          const occDate = parseISO(occurrenceDate);
          syncWidgetForMonth(occDate.getFullYear(), occDate.getMonth() + 1);
          if (todo.start_time) {
            const origDate = parseISO(todo.start_time);
            if (
              origDate.getFullYear() !== occDate.getFullYear() ||
              origDate.getMonth() !== occDate.getMonth()
            ) {
              syncWidgetForMonth(origDate.getFullYear(), origDate.getMonth() + 1);
            }
          }

          return true;
        } catch (err: any) {
          console.error('[TodoStore] updateRecurringTodo error:', err);
          set({error: err.message ?? 'Failed to update recurring todo'});
          return false;
        }
      },

      postponeTodo: async (id, action, newTime) => {
        try {
          const userId = await getCurrentUserId();
          if (!userId) throw new Error('Not authenticated');

          const todo = get().todos.find(t => t.id === id);
          if (!todo) throw new Error('Todo not found');

          const isRecurring =
            todo.recurrence_pattern &&
            todo.recurrence_pattern !== 'none';
          const selectedDate = get().selectedDate;

          if (action === 'start_now' && !isRecurring) {
            // 비반복 + start_now: DB 변경 없이 true 리턴 (FocusTimer 이동은 UI에서 처리)
            return true;
          }

          /** HH:mm → 해당 날짜의 ISO string */
          const toISO = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            const d = new Date(selectedDate + 'T00:00:00+09:00');
            d.setHours(h, m, 0, 0);
            return d.toISOString();
          };

          /** 원본 duration (ms) 계산 */
          const getDurationMs = () => {
            if (todo.start_time && todo.end_time) {
              return (
                new Date(todo.end_time).getTime() -
                new Date(todo.start_time).getTime()
              );
            }
            return 0;
          };

          if (!isRecurring) {
            // ── 비반복 할일 ──
            if (action === 'reschedule' && newTime) {
              const newStart = toISO(newTime);
              const durationMs = getDurationMs();
              const updates: any = {start_time: newStart};
              if (durationMs > 0) {
                updates.end_time = new Date(
                  new Date(newStart).getTime() + durationMs,
                ).toISOString();
              }
              return get().updateTodo(id, updates);
            }
            if (action === 'anytime') {
              const anytimeUpdates: any = {
                schedule_type: 'anytime',
                start_time: null,
                end_time: null,
              };
              if (todo.start_time && !(todo as any).original_start_time) {
                anytimeUpdates.original_start_time = todo.start_time;
              }
              if (todo.end_time && !(todo as any).original_end_time) {
                anytimeUpdates.original_end_time = todo.end_time;
              }
              return get().updateTodo(id, anytimeUpdates);
            }
          } else {
            // ── 반복 할일: exclusion + 독립 할일 생성 ──
            // 1. exclusion 생성
            await supabase.from('todo_exclusions').insert({
              parent_todo_id: id,
              excluded_date: selectedDate,
              user_id: userId,
              exclusion_reason: 'postponed',
            });

            // 2. 독립 할일 데이터 구성
            const newTodoData: Record<string, any> = {
              title: todo.title,
              icon: todo.icon,
              color: todo.color,
              user_id: userId,
              recurrence_pattern: 'none',
              completed: false,
              order_index: (todo as any).order_index || 0,
              importance: (todo as any).importance ?? null,
              urgency: (todo as any).urgency ?? null,
              is_reluctant_must_do: (todo as any).is_reluctant_must_do ?? false,
              parent_recurring_todo_id: id,
              occurrence_date: selectedDate,
              // 원본 시간 저장 (웹 todo-postpone.ts:116-121 참조)
              original_start_time: todo.start_time ?? null,
              original_end_time: todo.end_time ?? null,
            };

            if (action === 'reschedule' && newTime) {
              newTodoData.schedule_type = 'timed';
              newTodoData.start_time = toISO(newTime);
              const durationMs = getDurationMs();
              if (durationMs > 0) {
                newTodoData.end_time = new Date(
                  new Date(newTodoData.start_time).getTime() + durationMs,
                ).toISOString();
              }
            } else if (action === 'anytime') {
              newTodoData.schedule_type = 'anytime';
              newTodoData.start_time = null;
              newTodoData.end_time = null;
            } else if (action === 'start_now') {
              const now = new Date();
              newTodoData.schedule_type = 'timed';
              newTodoData.start_time = now.toISOString();
              const durationMs = getDurationMs();
              if (durationMs > 0) {
                newTodoData.end_time = new Date(
                  now.getTime() + durationMs,
                ).toISOString();
              }
            }

            const {data: newTodo, error: createErr} = await supabase
              .from('todos')
              .insert(newTodoData)
              .select()
              .single();

            if (createErr) throw createErr;

            // 로컬 상태: 원본 제거 + 새 할일 추가
            set(state => ({
              todos: [
                ...state.todos.filter(t => t.id !== id),
                parseTodo(newTodo),
              ],
            }));

            // 위젯 동기화: 새로 이동된 날짜 월
            const {year, month} = getWidgetMonthForTodo(newTodo, get().selectedDate);
            syncWidgetForMonth(year, month);
          }

          return true;
        } catch (err: any) {
          console.error('[TodoStore] postponeTodo error:', err);
          set({error: err.message ?? 'Failed to postpone todo'});
          return false;
        }
      },

      skipTodo: async (id, reason) => {
        const todo = get().todos.find(t => t.id === id);
        if (!todo) return false;

        const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

        if (isRecurring) {
          // 반복 할일: todo_exclusions에 날짜별 기록 (부모 레코드 수정 안 함)
          const userId = await getCurrentUserId();
          if (!userId) return false;

          const selectedDate = get().selectedDate;

          // Optimistic update
          set(state => ({
            todos: state.todos.map(t =>
              t.id === id ? {...t, skip_status: reason} : t,
            ),
          }));

          const {error} = await supabase
            .from('todo_exclusions')
            .insert({
              parent_todo_id: id,
              excluded_date: selectedDate,
              user_id: userId,
              exclusion_reason: reason,
            });

          if (error) {
            // 롤백
            set(state => ({
              todos: state.todos.map(t =>
                t.id === id ? {...t, skip_status: null} : t,
              ),
            }));
            console.error('[TodoStore] skipTodo error:', error);
            return false;
          }
          return true;
        } else {
          // 일반 할일: skip_status 직접 업데이트
          return get().updateTodo(id, {skip_status: reason} as any);
        }
      },

      unskipTodo: async (id) => {
        const todo = get().todos.find(t => t.id === id);
        if (!todo) return false;

        const previousStatus = (todo as any).skip_status;
        const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

        // Optimistic update
        set(state => ({
          todos: state.todos.map(t =>
            t.id === id ? {...t, skip_status: null} : t,
          ),
        }));

        if (isRecurring) {
          const userId = await getCurrentUserId();
          if (!userId) return false;
          const selectedDate = get().selectedDate;

          const {error} = await supabase
            .from('todo_exclusions')
            .delete()
            .eq('parent_todo_id', id)
            .eq('excluded_date', selectedDate)
            .in('exclusion_reason', ['missed', 'not_needed']);

          if (error) {
            set(state => ({
              todos: state.todos.map(t =>
                t.id === id ? {...t, skip_status: previousStatus} : t,
              ),
            }));
            console.error('[TodoStore] unskipTodo error:', error);
            return false;
          }
          return true;
        } else {
          return get().updateTodo(id, {skip_status: null} as any);
        }
      },

      // 미룸 복원: 독립 할일 삭제 + exclusion 삭제 → 원본 반복 할일 복원
      restoreDeferredTodo: async (todoId: string) => {
        try {
          // 1. 독립 할일 조회 (parent_recurring_todo_id, occurrence_date 필요)
          const {data: todo, error: fetchErr} = await supabase
            .from('todos')
            .select('id, parent_recurring_todo_id, occurrence_date')
            .eq('id', todoId)
            .single();

          if (fetchErr || !todo?.parent_recurring_todo_id || !todo?.occurrence_date) {
            console.error('[TodoStore] restoreDeferredTodo: 독립 할일 조회 실패', fetchErr);
            return false;
          }

          const userId = await getCurrentUserId();
          if (!userId) return false;

          // 2. 독립 할일 삭제
          const {error: deleteErr} = await supabase
            .from('todos')
            .delete()
            .eq('id', todoId);

          if (deleteErr) {
            console.error('[TodoStore] restoreDeferredTodo: 독립 할일 삭제 실패', deleteErr);
            return false;
          }

          // 3. exclusion 삭제 (원본 반복 할일 복원)
          await supabase
            .from('todo_exclusions')
            .delete()
            .eq('parent_todo_id', todo.parent_recurring_todo_id)
            .eq('excluded_date', todo.occurrence_date)
            .eq('exclusion_reason', 'postponed');

          // 4. 로컬 상태 업데이트 + 재조회
          set(state => ({
            todos: state.todos.filter(t => t.id !== todoId),
          }));
          await get().fetchTodosForDate(get().selectedDate);

          return true;
        } catch (err) {
          console.error('[TodoStore] restoreDeferredTodo error:', err);
          return false;
        }
      },

      processOfflineQueue: async () => {
        const queue = get().offlineQueue;
        if (queue.length === 0) return;

        const processed: string[] = [];

        for (const action of queue) {
          try {
            switch (action.type) {
              case 'create':
                await supabase.from(action.table).insert(action.payload);
                break;
              case 'update':
                await supabase
                  .from(action.table)
                  .update(action.payload.updates)
                  .eq('id', action.payload.id);
                break;
              case 'delete':
                await supabase
                  .from(action.table)
                  .delete()
                  .eq('id', action.payload.id);
                break;
            }
            processed.push(action.id);
          } catch (err) {
            console.warn('[TodoStore] Offline queue item failed:', action.id, err);
            break; // 순서 보장을 위해 실패 시 중단
          }
        }

        set(state => ({
          offlineQueue: state.offlineQueue.filter(
            a => !processed.includes(a.id),
          ),
        }));
      },

      fetchAllTodos: async (userId: string, days = 30) => {
        try {
          const since = new Date();
          since.setDate(since.getDate() - days);

          const {data, error} = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', since.toISOString())
            .order('created_at', {ascending: false});

          if (error) throw error;
          return (data ?? []) as Todo[];
        } catch (err: any) {
          console.error('[TodoStore] fetchAllTodos error:', err);
          return [];
        }
      },

      fetchMotivationsForTodos: async (todoIds: string[]) => {
        if (todoIds.length === 0) {
          set({motivationMap: {}});
          return;
        }
        try {
          // 1. todo_notes에서 motivation 카테고리 노트 링크 조회
          const {data: links, error: linkErr} = await supabase
            .from('todo_motivations')
            .select('todo_id, motivation_id')
            .in('todo_id', todoIds);

          if (linkErr || !links || links.length === 0) {
            set({motivationMap: {}});
            return;
          }

          // 2. 연결된 노트 ID로 motivation 노트만 조회
          const noteIds = [...new Set(links.map((l: any) => l.motivation_id))];
          const {data: notes, error: noteErr} = await supabase
            .from('motivations')
            .select('id, title, content, category')
            .in('id', noteIds)
            .eq('category', 'motivation');

          if (noteErr || !notes || notes.length === 0) {
            set({motivationMap: {}});
            return;
          }

          // 3. todoId → motivation notes 매핑 구성
          const motivationNoteMap = new Map(notes.map((n: any) => [n.id, n]));
          const map: Record<string, LinkedMotivation[]> = {};

          for (const link of links) {
            const note = motivationNoteMap.get(link.motivation_id);
            if (!note) continue;
            if (!map[link.todo_id]) map[link.todo_id] = [];
            map[link.todo_id].push({
              id: note.id,
              title: note.title || '',
              content: note.content || '',
            });
          }

          set({motivationMap: map});
        } catch (err) {
          console.error('[TodoStore] fetchMotivationsForTodos error:', err);
        }
      },

      fetchTodosForMonthView: async (year: number, month: number) => {
        try {
          set({monthViewLoading: true});

          const userId = await getCurrentUserId();
          if (!userId) {
            set({monthViewLoading: false});
            return;
          }

          const monthStart = startOfMonth(new Date(year, month - 1));
          const monthEnd = endOfMonth(new Date(year, month - 1));

          // 3개월 범위 쿼리 (전월~익월) — 위젯과 공용 헬퍼 재사용
          const todos = await fetchWidgetTodosRange(userId, year, month);

          // monthViewData: 현재 월만 (플래너용)
          const monthDays = eachDayOfInterval({start: monthStart, end: monthEnd});
          const result: Record<string, MonthTodoSummary[]> = {};

          const filterTodosForDay = (dateStr: string, dayOfWeek: number) => {
            return todos.filter(todo => {
              if (todo.recurrence_pattern === 'daily') {
                if (!todo.start_time) return false;
                const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                if (startDate > dateStr) return false;
                if (todo.recurrence_end_date && todo.recurrence_end_date <= dateStr) return false;
                return true;
              }
              if (todo.recurrence_pattern === 'weekly') {
                if (!todo.start_time) return false;
                const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                if (startDate > dateStr) return false;
                if (todo.recurrence_end_date && todo.recurrence_end_date <= dateStr) return false;
                return todo.recurrence_days_of_week?.includes(dayOfWeek) ?? false;
              }
              if (todo.start_time) {
                const startDate = format(parseISO(todo.start_time), 'yyyy-MM-dd');
                if (startDate === dateStr) return true;
                // 크로스데이: start_time < 오늘 && end_time >= 오늘
                if (todo.end_time && todo.schedule_type === 'timed') {
                  const endDate = format(parseISO(todo.end_time), 'yyyy-MM-dd');
                  if (startDate < dateStr && endDate >= dateStr) return true;
                }
              }
              return false;
            });
          };

          for (const day of monthDays) {
            const dateStr = format(day, 'yyyy-MM-dd');
            result[dateStr] = filterTodosForDay(dateStr, getDay(day));
          }

          set({monthViewData: result});

          // 위젯 동기화: 3개월 범위 (iOS + Android)
          buildAndSyncWidget(todos as unknown as Todo[], year, month);
        } catch (err: any) {
          console.error('[TodoStore] fetchTodosForMonthView error:', err);
        } finally {
          set({monthViewLoading: false});
        }
      },

      syncWidget: async (year, month) => {
        const now = new Date();
        const y = year ?? now.getFullYear();
        const m = month ?? now.getMonth() + 1;
        await syncWidgetForMonth(y, m);
      },

      clearError: () => set({error: null}),
    }),
    {
      name: 'todo-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        todos: state.todos,
        completions: state.completions,
        selectedDate: state.selectedDate,
        motivationMap: state.motivationMap,
        offlineQueue: state.offlineQueue,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const today = format(new Date(), 'yyyy-MM-dd');
          state.selectedDate = today;
        }
      },
    },
  ),
);
