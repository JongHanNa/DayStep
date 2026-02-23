/**
 * Todo Store (Zustand + MMKV)
 * 웹앱 todoStore 패턴의 RN 네이티브 구현
 * - CRUD, optimistic update, 날짜별 필터링
 * - 오프라인 큐 (MMKV 기반)
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase, fetchWithJWT} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {Todo} from '@daystep/shared-core';
import {
  startOfDay,
  endOfDay,
  format,
  getDay,
} from 'date-fns';

// ============================================
// Types
// ============================================

interface CreateTodoInput {
  title: string;
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
}

interface TodoCompletion {
  id: string;
  todo_id: string;
  user_id: string;
  completion_date: string;
}

type PostponeAction = 'reschedule' | 'anytime' | 'start_now';

interface TodoState {
  // 데이터
  todos: Todo[];
  completions: TodoCompletion[]; // 반복할일 날짜별 완료 기록
  selectedDate: string; // ISO date string (YYYY-MM-DD)

  // 로딩 상태
  loading: boolean;
  error: string | null;

  // 오프라인 큐
  offlineQueue: OfflineAction[];

  // 액션
  fetchTodosForDate: (date: string) => Promise<void>;
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

// ============================================
// Store
// ============================================

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],
      completions: [],
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      loading: false,
      error: null,
      offlineQueue: [],

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
                // 시간 지정 할일 (해당 날짜)
                `and(schedule_type.eq.timed,start_time.gte.${dayStart},start_time.lte.${dayEnd})`,
                // 매일 반복 (종료일 필터 포함)
                `and(recurrence_pattern.eq.daily,start_time.lte.${dayEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${date}))`,
                // 주간 반복 (해당 요일, 종료일 필터 포함)
                `and(recurrence_pattern.eq.weekly,recurrence_days_of_week.cs.[${dayOfWeek}],start_time.lte.${dayEnd},or(recurrence_end_date.is.null,recurrence_end_date.gt.${date}))`,
                // anytime (시간 미지정)
                `and(schedule_type.eq.anytime,start_time.gte.${dayStart},start_time.lte.${dayEnd})`,
              ].join(','),
            )
            .order('order_index', {ascending: true});

          if (error) throw error;

          let filteredData = data ?? [];

          // 반복 할일 exclusions 필터링
          const recurringIds = filteredData
            .filter(t => t.recurrence_pattern && t.recurrence_pattern !== 'none')
            .map(t => t.id);

          if (recurringIds.length > 0) {
            const {data: exclusions} = await supabase
              .from('todo_exclusions')
              .select('parent_todo_id, exclusion_reason')
              .eq('excluded_date', date)
              .in('parent_todo_id', recurringIds);

            if (exclusions && exclusions.length > 0) {
              const excludedIds = new Set(
                exclusions
                  .filter(e => e.exclusion_reason === 'deleted' || e.exclusion_reason === 'postponed')
                  .map(e => e.parent_todo_id),
              );
              filteredData = filteredData.filter(t => !excludedIds.has(t.id));
            }
          }

          // 반복할일 날짜별 완료 상태 조회
          let completionData: TodoCompletion[] = [];
          // exclusion 필터 후 남은 반복할일 재계산
          const remainingRecurringIds = filteredData
            .filter(t => t.recurrence_pattern && t.recurrence_pattern !== 'none')
            .map(t => t.id);

          if (remainingRecurringIds.length > 0) {
            const {data: completions} = await supabase
              .from('todo_completions')
              .select('id, todo_id, user_id, completion_date')
              .eq('completion_date', date)
              .eq('user_id', userId)
              .in('todo_id', remainingRecurringIds);
            completionData = (completions ?? []) as TodoCompletion[];
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

          set({
            todos: enrichedData.map(parseTodo),
            completions: completionData,
            selectedDate: date,
          });
        } catch (err: any) {
          console.error('[TodoStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch todos'});
        } finally {
          set({loading: false});
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
          }));

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
        try {
          // Optimistic update
          set(state => ({
            todos: state.todos.map(t =>
              t.id === id ? {...t, ...updates, updated_at: new Date().toISOString()} : t,
            ),
          }));

          const {error} = await supabase
            .from('todos')
            .update({...updates, updated_at: new Date().toISOString()})
            .eq('id', id);

          if (error) throw error;
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
        try {
          // Optimistic delete
          set(state => ({
            todos: state.todos.filter(t => t.id !== id),
          }));

          const {error} = await supabase
            .from('todos')
            .delete()
            .eq('id', id);

          if (error) throw error;
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
              }));
              break;
            }
            case 'future': {
              // 부모 ID 찾기
              const parentId = (todo as any).parent_todo_id || id;
              const {error} = await supabase
                .from('todos')
                .update({...updates, updated_at: new Date().toISOString()})
                .or(`id.eq.${parentId},parent_todo_id.eq.${parentId}`)
                .gte('start_time', new Date(occurrenceDate).toISOString());

              if (error) throw error;

              // 로컬 상태 업데이트
              set(state => ({
                todos: state.todos.map(t =>
                  t.id === id ? {...t, ...updates, updated_at: new Date().toISOString()} : t,
                ),
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
              }));
              break;
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
              return get().updateTodo(id, {
                schedule_type: 'anytime',
                start_time: null,
                end_time: null,
              } as any);
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
          }

          return true;
        } catch (err: any) {
          console.error('[TodoStore] postponeTodo error:', err);
          set({error: err.message ?? 'Failed to postpone todo'});
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

      clearError: () => set({error: null}),
    }),
    {
      name: 'todo-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        todos: state.todos,
        completions: state.completions,
        selectedDate: state.selectedDate,
        offlineQueue: state.offlineQueue,
      }),
    },
  ),
);
