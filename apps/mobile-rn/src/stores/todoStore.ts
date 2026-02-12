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
  priority?: string;
  icon?: string;
  color?: string;
  importance?: boolean;
  urgency?: boolean;
  is_reluctant_must_do?: boolean;
  recurrence_pattern?: string;
  recurrence_days_of_week?: number[];
  project_ids?: string[];
}

interface TodoState {
  // 데이터
  todos: Todo[];
  selectedDate: string; // ISO date string (YYYY-MM-DD)

  // 로딩 상태
  loading: boolean;
  error: string | null;

  // 오프라인 큐
  offlineQueue: OfflineAction[];

  // 액션
  fetchTodosForDate: (date: string) => Promise<void>;
  createTodo: (input: CreateTodoInput) => Promise<Todo | null>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<boolean>;
  deleteTodo: (id: string) => Promise<boolean>;
  toggleTodoCompletion: (id: string) => Promise<boolean>;
  setSelectedDate: (date: string) => void;
  updateRecurringTodo: (
    id: string,
    updates: Partial<Todo>,
    updateType: 'this' | 'future' | 'all',
    occurrenceDate: string,
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
                // 매일 반복
                `and(recurrence_pattern.eq.daily,start_time.lte.${dayEnd})`,
                // 주간 반복 (해당 요일)
                `and(recurrence_pattern.eq.weekly,recurrence_days_of_week.cs.[${dayOfWeek}],start_time.lte.${dayEnd})`,
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

          set({
            todos: filteredData.map(parseTodo),
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

        return get().updateTodo(id, {
          completed: !todo.completed,
        } as Partial<Todo>);
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

      clearError: () => set({error: null}),
    }),
    {
      name: 'todo-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        todos: state.todos,
        selectedDate: state.selectedDate,
        offlineQueue: state.offlineQueue,
      }),
    },
  ),
);
