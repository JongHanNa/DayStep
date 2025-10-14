import { Todo } from "@/entities/todo/Todo";
import { CreateTodoInput, ScheduleType } from "@/types";
import { supabase } from "@/lib/supabase";
// import { integratedNotificationService } from "@/services/integrated-notification.service";
// import { widgetSyncService } from "@/services/widget-sync.service";
import {
  createStore,
  createOptimisticManager,
  createRealtimeManager,
  createConflictResolver,
  createFilterHelpers,
  logStoreAction,
} from "../utils/storeUtils";

// 분리된 타입들 import
import type { TodoStoreState } from "./types/todoStoreTypes";

// 분리된 액션들 import
import {
  createTodoAction,
  updateTodoAction,
  deleteTodoAction,
  fetchTodoByIdAction,
  toggleTodoCompletion,
  toggleMultipleTodos,
} from "./actions/todoCrudActions";

import {
  createTodoWithRecurrenceAction,
  updateRecurringTodoAction,
  deleteRecurringTodoAction,
  loadCompletionsForDateRangeAction,
  toggleRecurrenceCompletionAction,
  isRecurrenceCompletedAction,
  updateRecurringGroups,
} from "./actions/todoRecurrenceActions";

import {
  subscribeToRealtimeUpdates,
  unsubscribeFromRealtimeUpdates,
  forceReconnectRealtime,
  getConnectionStatus,
  getSyncStatus,
  createInitialRealtimeState,
} from "./actions/todoRealtimeActions";

import {
  fetchTodosForCurrentViewAction,
  fetchTodosForDateAction,
  isDataStale,
  shouldRefreshData,
  resetLoadState,
  fetchTodosIfNeeded,
  updateCacheKey,
  createInitialLoadState,
  updateLoadStateOnSuccess,
} from "./actions/todoCacheActions";

/**
 * 할일 스토어 생성
 */
export const useTodoStore = createStore<TodoStoreState>(
  (set, get) => {
    // 낙관적 업데이트 매니저 인스턴스
    const optimisticManager = createOptimisticManager<Todo>();
    const filterHelpers = createFilterHelpers<Todo>();

    return {
      // === 초기 상태 ===
      todos: [],
      selectedTodo: null,
      loading: false,
      error: null,
      lastUpdated: null,

      // BaseStoreState 속성들
      initialized: false,
      version: 1,

      // 새로운 스키마 관련 상태
      recurringGroups: new Map(),
      todoCompletions: [],

      // 📦 전역 로드 상태 초기값
      loadState: createInitialLoadState(),

      // 필터 및 정렬 상태
      filters: {
        searchQuery: "",
        sortBy: "orderIndex",
        sortOrder: "asc" as const,
        completed: "all" as const,
        showCompleted: true,
        filters: {},
      },

      // 통계 정보
      stats: {
        totalCount: 0,
        completedCount: 0,
        pendingCount: 0,
        completionRate: 0,
        todayCompleted: 0,
      },

      // 드래그 앤 드롭 상태
      dragState: {
        isDragging: false,
        draggedTodo: null,
        dropTarget: null,
      },

      // 낙관적 업데이트 상태
      optimisticState: {
        pendingOperations: [],
        isProcessing: false,
        retryingOperations: new Set(),
      },

      // 실시간 동기화 상태
      ...createInitialRealtimeState(),

      // === 데이터 로드 액션들 ===
      fetchTodosForCurrentView: async () => {
        set((state: TodoStoreState) => {
          state.loading = true;
          state.error = null;
        });

        try {
          // 🔑 Capacitor 백업 인증 패턴
          let userId: string | null = null;
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              userId = session.user.id;
            }
          } catch {}

          if (!userId && typeof window !== 'undefined' && 'Capacitor' in window) {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            if (value) {
              userId = JSON.parse(value).user?.id;
            }
          }

          if (!userId) {
            throw new Error("사용자 인증이 필요합니다.");
          }

          const todos = await fetchTodosForCurrentViewAction(userId);

          set((state: TodoStoreState) => {
            state.todos = todos;
            state.loading = false;
            
            // 반복 할일 그룹 재구성
            const groups = new Map<string, Todo[]>();
            todos.forEach((todo: Todo) => {
              if (todo.parentTodoId) {
                const existing = groups.get(todo.parentTodoId) || [];
                existing.push(todo);
                groups.set(todo.parentTodoId, existing);
              }
            });
            state.recurringGroups = groups;

            state.refreshStats();
            updateLoadStateOnSuccess(set);

            console.log("✅ fetchTodosForCurrentView 완료:", {
              todosCount: todos.length,
              recurringGroupsCount: groups.size,
            });
          });
        } catch (error) {
          set((state: TodoStoreState) => {
            state.loading = false;
            state.error = `할일 목록 조회에 실패했습니다: ${(error as Error).message}`;
          });

          throw error;
        }
      },

      fetchTodosForDate: async (utcStart: Date, utcEnd: Date) => {
        set((state: TodoStoreState) => {
          state.loading = true;
        });

        try {
          // Capacitor 백업 인증 패턴
          let userId: string | null = null;
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
              userId = session.user.id;
            }
          } catch {}

          if (!userId && typeof window !== 'undefined' && 'Capacitor' in window) {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key: 'supabase_auth_session' });
            if (value) {
              userId = JSON.parse(value).user?.id;
            }
          }

          if (!userId) {
            throw new Error("사용자 인증이 필요합니다.");
          }

          const todos = await fetchTodosForDateAction(userId, utcStart, utcEnd);

          set((state: TodoStoreState) => {
            state.todos = todos;
            state.loading = false;
          });

          return todos;
        } catch (error) {
          set((state: TodoStoreState) => {
            state.loading = false;
            state.error = `날짜별 할일 조회에 실패했습니다: ${(error as Error).message}`;
          });
          throw error;
        }
      },

      fetchTodoById: async (id: string) => {
        return fetchTodoByIdAction(id);
      },

      // === CRUD 액션들 ===
      createTodo: async (data: CreateTodoInput) => {
        // 새 할일의 순서를 맨 위로 설정 (기존 패턴과 동일)
        const todos = get().todos;
        console.log('🔍 [TodoStore] 현재 todos:', todos.length, '개');
        console.log('🔍 [TodoStore] todos orderIndex 값들:', todos.map((t: Todo) => ({ 
          id: t.id, 
          orderIndex: t.orderIndex,
          rawData: t  // 전체 객체 확인
        })));
        
        const maxOrder = Math.max(
          ...todos.map((t: Todo) => t.orderIndex).filter((idx: number | undefined) => typeof idx === 'number' && !isNaN(idx)),
          -1  // ✅ 기존 코드와 동일: -1을 기본값으로 사용
        );
        console.log('🔍 [TodoStore] maxOrder 계산 결과:', maxOrder);
        
        const todoData = {
          ...data,
          order_index: data.order_index ?? maxOrder + 1,
        };
        console.log('🔍 [TodoStore] 최종 order_index:', todoData.order_index);

        // 낙관적 업데이트 - 임시 ID 생성
        const tempId = `temp-${Date.now()}`;
        const optimisticTodo = Todo.fromDatabase({
          id: tempId,
          content: data.content,
          completed: data.completed ?? false,
          order_index: todoData.order_index,
          priority: data.priority,
          schedule_type: todoData.schedule_type || "anytime",
          start_time: data.start_time,
          end_time: data.end_time,
          departure_location: data.departure_location,
          departure_time: data.departure_time,
          recurrence_pattern: todoData.recurrence_pattern || "none",
          recurrence_end_date: data.recurrence_end_date,
          recurrence_count: data.recurrence_count,
          recurrence_interval: data.recurrence_interval || 1,
          recurrence_days_of_week: data.recurrence_days_of_week,
          recurrence_day_of_month: data.recurrence_day_of_month,
          parent_todo_id: data.parent_todo_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);

        // 낙관적 업데이트 작업 등록
        optimisticManager.addOperation(
          tempId,
          "create",
          optimisticTodo
        );

        // UI 즉시 업데이트
        set((state: TodoStoreState) => {
          state.todos.unshift(optimisticTodo);
          const pendingOps = optimisticManager.getPendingOperations();
          // 안전한 상태 수정 패턴 적용
          state.optimisticState = {
            ...state.optimisticState,
            pendingOperations: pendingOps,
            isProcessing: true,
          };
          state.refreshStats();
        });

        try {
          const newTodo = await createTodoAction(todoData);

          // 성공 시 낙관적 업데이트를 실제 데이터로 교체
          optimisticManager.completeOperation(tempId);

          set((state: TodoStoreState) => {
            state.todos = state.todos.filter((t: Todo) => t.id !== tempId);
            state.todos.push(newTodo);

            // 반복 일정 그룹 관리 (기본 createTodo에서는 단일 아이템)
            if (newTodo.parentTodoId) {
              const existing = state.recurringGroups.get(newTodo.parentTodoId) || [];
              existing.push(newTodo);
              state.recurringGroups.set(newTodo.parentTodoId, existing);
            }

            state.todos.sort((a: Todo, b: Todo) => a.orderIndex - b.orderIndex);
            
            const pendingOps = optimisticManager.getPendingOperations();
            // 안전한 상태 수정 패턴 적용
            state.optimisticState = {
              ...state.optimisticState,
              pendingOperations: pendingOps,
              isProcessing: false,
            };
            state.refreshStats();
          });

          // 통합 알림 시스템에 브로드캐스트
          try {
            // TODO: broadcastTodoCreate 메서드가 구현되면 주석 해제
            // await integratedNotificationService.broadcastTodoCreate(newTodo);
          } catch (broadcastError) {
            console.warn("⚠️ Broadcast 발송 실패:", broadcastError);
          }

          return newTodo;
        } catch (error) {
          // 실패 시 원본 데이터로 롤백
          optimisticManager.failOperation(tempId);

          set((state: TodoStoreState) => {
            state.todos = state.todos.filter((t: Todo) => t.id !== tempId);
            const pendingOps = optimisticManager.getPendingOperations();
            const newRetryingOps = new Set(state.optimisticState.retryingOperations);
            newRetryingOps.delete(tempId);
            // 안전한 상태 수정 패턴 적용
            state.optimisticState = {
              ...state.optimisticState,
              pendingOperations: pendingOps,
              isProcessing: false,
              retryingOperations: newRetryingOps,
            };
            state.error = `할일 생성에 실패했습니다: ${(error as Error).message}`;
            state.refreshStats();
          });

          resetLoadState(get, set, "crud");
          throw error;
        }
      },

      updateTodo: async (id: string, data: Partial<CreateTodoInput>) => {
        const originalTodo = get().todos.find((t: Todo) => t.id === id);
        if (!originalTodo) {
          throw new Error("할일을 찾을 수 없습니다.");
        }

        // snake_case를 camelCase로 변환 (optimistic update용)
        const optimisticData: any = {
          ...data,
          // snake_case → camelCase 변환
          scheduleType: data.schedule_type || (data as any).scheduleType,
          startTime: data.start_time || (data as any).startTime,
          endTime: data.end_time || (data as any).endTime,
          departureLocation: data.departure_location || (data as any).departureLocation,
          departureTime: data.departure_time || (data as any).departureTime,
          recurrencePattern: data.recurrence_pattern || (data as any).recurrencePattern,
          recurrenceEndDate: data.recurrence_end_date || (data as any).recurrenceEndDate,
          recurrenceCount: data.recurrence_count || (data as any).recurrenceCount,
          recurrenceInterval: data.recurrence_interval || (data as any).recurrenceInterval,
          recurrenceDaysOfWeek: data.recurrence_days_of_week || (data as any).recurrenceDaysOfWeek,
          recurrenceDayOfMonth: data.recurrence_day_of_month || (data as any).recurrenceDayOfMonth,
          parentTodoId: data.parent_todo_id || (data as any).parentTodoId,
          userId: data.user_id || (data as any).userId,
          orderIndex: data.order_index || (data as any).orderIndex
        };


        // 낙관적 업데이트
        optimisticManager.addOperation(
          id,
          "update",
          { ...originalTodo, ...optimisticData },
          originalTodo
        );

        set((state: TodoStoreState) => {
          const index = state.todos.findIndex((t: Todo) => t.id === id);
          if (index !== -1) {
            const beforeUpdate = { ...state.todos[index] };
            state.todos[index] = { ...state.todos[index], ...optimisticData };
          }
          const pendingOps = optimisticManager.getPendingOperations();
          const newRetryingOps = new Set(state.optimisticState.retryingOperations);
          newRetryingOps.add(id);
          // 안전한 상태 수정 패턴 적용
          state.optimisticState = {
            ...state.optimisticState,
            pendingOperations: pendingOps,
            isProcessing: true,
            retryingOperations: newRetryingOps,
          };
          state.refreshStats();
        });

        try {
          const finalTodo = await updateTodoAction(id, data);

          optimisticManager.completeOperation(id);

          set((state: TodoStoreState) => {
            const index = state.todos.findIndex((t: Todo) => t.id === id);
            if (index !== -1) {
              state.todos[index] = finalTodo;
            }
            const pendingOps = optimisticManager.getPendingOperations();
            const newRetryingOps = new Set(state.optimisticState.retryingOperations);
            newRetryingOps.delete(id);
            // 안전한 상태 수정 패턴 적용
            state.optimisticState = {
              ...state.optimisticState,
              pendingOperations: pendingOps,
              isProcessing: false,
              retryingOperations: newRetryingOps,
            };
            state.refreshStats();
          });

          // 🔄 할일 수정 후 타임라인 새로고침
          console.log('🔄 [TodoStore] 할일 수정 완료, 타임라인 새로고침 중...');
          try {
            // 동적 import로 순환 의존성 방지
            const { useTimelineViewStore } = await import('./timelineViewStore');
            const timelineStore = useTimelineViewStore.getState();
            const updatedTodos = get().todos;
            const timelineTasks: any[] = []; // 필요시 추가

            // 🔍 TodoStore에서 TimelineStore로 전달할 데이터 확인
            console.log('🔍 [TodoStore] TimelineStore로 전달할 할일 데이터:', {
              총개수: updatedTodos.length,
              수정된할일ID: finalTodo.id,
              수정된할일데이터: updatedTodos.find((t: any) => t.id === finalTodo.id)
            });

            await timelineStore.loadItemsFromSources(updatedTodos, timelineTasks);
            console.log('✅ [TodoStore] 타임라인 새로고침 완료');
          } catch (refreshError) {
            console.warn('⚠️ [TodoStore] 타임라인 새로고침 실패:', refreshError);
          }

          return finalTodo;
        } catch (error) {

          // 먼저 데이터 상태를 초기화하고 새로고침
          resetLoadState(get, set, "crud");

          // 데이터 새로고침 후 롤백 수행
          try {
            // OptimisticManager에서 작업 실패 처리
            optimisticManager.failOperation(id);

            set((state: TodoStoreState) => {
              // 새로고침된 데이터에서 해당 할일 찾기
              const currentTodo = state.todos.find((t: Todo) => t.id === id);
              
              // 원본 데이터로 롤백 (서버에서 새로고침된 데이터가 우선)
              if (currentTodo && originalTodo) {
                const index = state.todos.findIndex((t: Todo) => t.id === id);
                if (index !== -1) {
                  // 현재 서버 데이터를 유지 (이미 새로고침됨)
                  state.todos[index] = currentTodo;
                }
              }
              
              const pendingOps = optimisticManager.getPendingOperations();
              const newRetryingOps = new Set(state.optimisticState.retryingOperations);
              newRetryingOps.delete(id);
              
              // 안전한 상태 수정 패턴 적용
              state.optimisticState = {
                ...state.optimisticState,
                pendingOperations: pendingOps,
                isProcessing: false,
                retryingOperations: newRetryingOps,
              };
              state.error = `할일 업데이트에 실패했습니다: ${(error as Error).message}`;
              state.refreshStats();
            });
          } catch (rollbackError) {
            console.error('롤백 과정에서 추가 에러 발생:', rollbackError);
          }
          throw error;
        }
      },

      deleteTodo: async (id: string) => {
        const todoToDelete = get().todos.find((t: Todo) => t.id === id);
        if (!todoToDelete) {
          throw new Error("할일을 찾을 수 없습니다.");
        }

        // 낙관적 업데이트 작업 등록
        optimisticManager.addOperation(
          id,
          "delete",
          todoToDelete,
          todoToDelete
        );

        // UI 즉시 업데이트
        set((state: TodoStoreState) => {
          state.todos = state.todos.filter((t: Todo) => t.id !== id);
          const pendingOps = optimisticManager.getPendingOperations();
          // 안전한 상태 수정 패턴 적용
          state.optimisticState = {
            ...state.optimisticState,
            pendingOperations: pendingOps,
            isProcessing: true,
          };
          state.refreshStats();
        });

        try {
          const success = await deleteTodoAction(id);

          optimisticManager.completeOperation(id);

          set((state: TodoStoreState) => {
            const pendingOps = optimisticManager.getPendingOperations();
            // 안전한 상태 수정 패턴 적용
            state.optimisticState = {
              ...state.optimisticState,
              pendingOperations: pendingOps,
              isProcessing: false,
            };
          });

          return success;
        } catch (error) {
          // 실패 시 원본 데이터로 복원
          optimisticManager.failOperation(id);

          set((state: TodoStoreState) => {
            if (todoToDelete) {
              state.todos.push(todoToDelete);
              state.todos.sort((a: Todo, b: Todo) => a.orderIndex - b.orderIndex);
            }
            const pendingOps = optimisticManager.getPendingOperations();
            // 안전한 상태 수정 패턴 적용
            state.optimisticState = {
              ...state.optimisticState,
              pendingOperations: pendingOps,
              isProcessing: false,
            };
            state.error = `할일 삭제에 실패했습니다: ${(error as Error).message}`;
            state.refreshStats();
          });

          resetLoadState(get, set, "crud");
          throw error;
        }
      },

      // === 반복 할일 액션들 ===
      createTodoWithRecurrence: async (input: CreateTodoInput) => {
        try {
          const createdTodos = await createTodoWithRecurrenceAction(input);

          // 상태 업데이트
          set((state: TodoStoreState) => {
            state.todos.push(...createdTodos);

            // 반복 일정 그룹 관리
            state.recurringGroups = updateRecurringGroups(
              state.recurringGroups,
              createdTodos,
              input.recurrence_pattern || "none"
            );

            state.todos.sort((a: Todo, b: Todo) => a.orderIndex - b.orderIndex);
            state.refreshStats();
          });

          return createdTodos;
        } catch (error) {
          resetLoadState(get, set, "crud");
          
          set((state: TodoStoreState) => {
            state.error = `반복 할일 생성에 실패했습니다: ${(error as Error).message}`;
          });
          throw error;
        }
      },

      updateRecurringTodo: async (
        id: string,
        updates: Partial<CreateTodoInput>,
        updateType: "this" | "future" | "all"
      ): Promise<Todo[]> => {
        const originalTodos = [...get().todos];

        try {
          // 낙관적 업데이트
          set((state: TodoStoreState) => {
            if (updateType === "this") {
              const index = state.todos.findIndex((t: Todo) => t.id === id);
              if (index !== -1) {
                state.todos[index] = { ...state.todos[index], ...updates } as Todo;
              }
            } else if (updateType === "all") {
              const todo = state.todos.find((t: Todo) => t.id === id);
              const parentId = todo?.parentTodoId || id;

              state.todos = state.todos.map((t: Todo) =>
                t.id === parentId || t.parentTodoId === parentId
                  ? { ...t, ...updates } as Todo
                  : t
              );
            }
          });

          await updateRecurringTodoAction(id, updates, updateType);

          // void 반환이므로 데이터를 다시 로드해야 함
          await get().fetchTodosForCurrentView();
          
          return get().todos;
        } catch (error) {
          resetLoadState(get, set, "crud");
          
          set((state: TodoStoreState) => {
            state.todos = originalTodos;
            state.error = `반복 할일 업데이트에 실패했습니다: ${(error as Error).message}`;
          });
          throw error;
        }
      },

      deleteRecurringTodo: async (
        id: string, 
        deleteType: 'this' | 'future' | 'all', 
        excludedDate?: string
      ) => {
        try {
          const success = await deleteRecurringTodoAction(id, deleteType, excludedDate);
          
          // 성공 시 데이터 새로고침
          await get().fetchTodosForCurrentView();
          
          return success;
        } catch (error) {
          resetLoadState(get, set, "crud");
          
          set((state: TodoStoreState) => {
            state.error = `반복 할일 삭제에 실패했습니다: ${(error as Error).message}`;
          });
          throw error;
        }
      },

      // === 완료 상태 관리 ===
      toggleTodo: async (id: string) => {
        const currentTodos = get().todos;
        const todo = currentTodos.find((t: Todo) => t.id === id);
        
        if (!todo) {
          console.error('❌ [todoStore] 할일을 찾을 수 없음:', id);
          return false;
        }

        const newCompletedState = !todo.completed;

        // 즉시 스토어 상태 업데이트 (Optimistic Update)
        set((state: TodoStoreState) => {
          const todoIndex = state.todos.findIndex((t: Todo) => t.id === id);
          if (todoIndex !== -1) {
            state.todos[todoIndex] = { ...state.todos[todoIndex], completed: newCompletedState } as Todo;
          }
        });

        try {
          const result = await toggleTodoCompletion(id, currentTodos, newCompletedState);
          return result;
        } catch (error) {
          console.error('❌ [todoStore] 백엔드 업데이트 실패:', error);
          // 실패 시 스토어 상태를 원래대로 되돌림
          set((state: TodoStoreState) => {
            const todoIndex = state.todos.findIndex((t: Todo) => t.id === id);
            if (todoIndex !== -1) {
              state.todos[todoIndex] = { ...state.todos[todoIndex], completed: !newCompletedState } as Todo;
            }
          });
          return false;
        }
      },

      toggleMultipleTodos: async (ids: string[], completed: boolean) => {
        return toggleMultipleTodos(ids, completed);
      },

      // === 반복 할일 완료 상태 관리 ===
      loadCompletionsForDateRange: async (startDate: Date, endDate: Date) => {
        try {
          const completions = await loadCompletionsForDateRangeAction(startDate, endDate);

          set((state: TodoStoreState) => {
            state.todoCompletions = completions;
          });
        } catch (error) {
          console.error('❌ 완료 기록 로드 실패:', error);
        }
      },

      toggleRecurrenceCompletion: async (todoId: string, targetDate: Date) => {
        try {
          const result = await toggleRecurrenceCompletionAction(
            todoId, 
            targetDate, 
            get().todoCompletions
          );

          // 로컬 상태 업데이트
          set((state: TodoStoreState) => {
            state.todoCompletions = result.completions;
            state.lastUpdated = new Date(); // 강제 리렌더링 트리거
          });

          // 🔄 실시간 UI 업데이트를 위한 완료 기록 재로드
          const startDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000); // 하루 전
          const endDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);   // 하루 후
          await get().loadCompletionsForDateRange(startDate, endDate);

          return result.isCompleted;
        } catch (error) {
          console.error('❌ 반복 할일 완료 토글 오류:', error);
          return false;
        }
      },

      isRecurrenceCompleted: (todoId: string, targetDate: Date) => {
        return isRecurrenceCompletedAction(todoId, targetDate, get().todoCompletions);
      },

      // === 실시간 구독 ===
      subscribe: () => {
        subscribeToRealtimeUpdates(set, get);
      },

      unsubscribe: () => {
        unsubscribeFromRealtimeUpdates(set, get);
      },

      forceReconnect: () => {
        forceReconnectRealtime(get().unsubscribe, get().subscribe);
      },

      getConnectionStatus: () => {
        return getConnectionStatus(get().realtimeConnection);
      },

      getSyncStatus: () => {
        return getSyncStatus(get().realtimeSync);
      },

      // === 캐시 및 로드 상태 관리 ===
      isDataStale: () => {
        return isDataStale(get().loadState);
      },

      shouldRefreshData: (dateKey?: string) => {
        return shouldRefreshData(get().loadState, dateKey);
      },

      resetLoadState: (reason = "manual") => {
        resetLoadState(get, set, reason);
      },

      fetchTodosIfNeeded: async (forceRefresh = false) => {
        await fetchTodosIfNeeded(get, set, get().fetchTodosForCurrentView, forceRefresh);
      },

      updateCacheKey: (dateKey: string) => {
        updateCacheKey(set, dateKey);
      },

      // === 나머지 유틸리티 함수들 ===
      // 순서 관리
      reorderTodos: async (draggedId: string, targetId: string, position: "before" | "after") => {
        // TODO: 구현 필요
        console.log('TODO: reorderTodos', { draggedId, targetId, position });
        return false;
      },

      moveToTop: async (id: string) => {
        // TODO: 구현 필요
        console.log('TODO: moveToTop', { id });
        return false;
      },

      moveToBottom: async (id: string) => {
        // TODO: 구현 필요
        console.log('TODO: moveToBottom', { id });
        return false;
      },

      // 필터링 및 검색
      setSearchQuery: (query: string) => {
        set((state: TodoStoreState) => {
          state.filters.searchQuery = query;
        });
      },

      setCompletedFilter: (completed: "all" | "pending" | "completed") => {
        set((state: TodoStoreState) => {
          state.filters.completed = completed;
        });
      },

      setShowCompleted: (show: boolean) => {
        set((state: TodoStoreState) => {
          state.filters.showCompleted = show;
        });
      },

      setSortBy: (sortBy: string, sortOrder: "asc" | "desc" = "asc") => {
        set((state: TodoStoreState) => {
          state.filters.sortBy = sortBy;
          state.filters.sortOrder = sortOrder;
        });
      },

      // 선택 상태 관리
      selectTodo: (todo: Todo | null) => {
        set((state: TodoStoreState) => {
          state.selectedTodo = todo;
        });
      },

      // 드래그 앤 드롭
      startDrag: (todo: Todo) => {
        set((state: TodoStoreState) => {
          state.dragState.isDragging = true;
          state.dragState.draggedTodo = todo;
        });
      },

      endDrag: () => {
        set((state: TodoStoreState) => {
          state.dragState.isDragging = false;
          state.dragState.draggedTodo = null;
          state.dragState.dropTarget = null;
        });
      },

      setDropTarget: (targetId: string | null) => {
        set((state: TodoStoreState) => {
          state.dragState.dropTarget = targetId;
        });
      },

      // 통계 및 유틸리티
      refreshStats: () => {
        const state = get();
        const todos = state.todos;
        
        const totalCount = todos.length;
        const completedCount = todos.filter((t: Todo) => t.completed).length;
        const pendingCount = totalCount - completedCount;
        
        // 오늘 완료된 할일 계산
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCompleted = todos.filter((t: Todo) => {
          if (!t.completed || !t.updatedAt) {
            return false;
          }
          const updatedDate = new Date(t.updatedAt);
          updatedDate.setHours(0, 0, 0, 0);
          return updatedDate.getTime() === today.getTime();
        }).length;

        const stats = {
          totalCount,
          completedCount,
          pendingCount,
          completionRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
          todayCompleted,
        };

        set((state: TodoStoreState) => {
          state.stats = stats;
        });
      },

      getFilteredTodos: () => {
        return filterHelpers.filterData(get().todos, get().filters);
      },

      getPendingTodos: () => {
        return get().todos.filter((t: Todo) => !t.completed);
      },

      getCompletedTodos: () => {
        return get().todos.filter((t: Todo) => t.completed);
      },

      // 새로운 스키마 관련 유틸리티
      getTodosByDateRange: (startDate: Date, endDate: Date) => {
        return get().todos.filter((todo: Todo) => {
          if (!todo.startTime) {
            return false;
          }
          const todoDate = new Date(todo.startTime);
          return todoDate >= startDate && todoDate <= endDate;
        });
      },

      getTodosByScheduleType: (type: ScheduleType) => {
        return get().todos.filter((todo: Todo) => todo.scheduleType === type);
      },

      getRecurringTodos: () => {
        return get().todos.filter((todo: Todo) => todo.recurrencePattern !== "none");
      },

      getRecurringInstances: (parentId: string) => {
        return get().recurringGroups.get(parentId) || [];
      },

      filterByScheduleType: (type: ScheduleType) => {
        return get().getTodosByScheduleType(type);
      },

      // 아카이브 기능 (TODO: 구현 필요)
      archiveTodo: async (id: string, category?: string) => {
        console.log('TODO: archiveTodo', { id, category });
        return false;
      },

      restoreFromRepository: async (repositoryItemId: string) => {
        console.log('TODO: restoreFromRepository', { repositoryItemId });
        return null;
      },

      // 일괄 작업 (TODO: 구현 필요)
      bulkComplete: async (ids: string[]) => {
        console.log('TODO: bulkComplete', { ids });
        return false;
      },

      bulkDelete: async (ids: string[]) => {
        console.log('TODO: bulkDelete', { ids });
        return false;
      },

      bulkArchive: async (ids: string[], category?: string) => {
        console.log('TODO: bulkArchive', { ids, category });
        return false;
      },

      // 스토어 초기화
      reset: () => {
        set((state: TodoStoreState) => {
          state.todos = [];
          state.selectedTodo = null;
          state.loading = false;
          state.error = null;
          state.lastUpdated = null;
          state.recurringGroups = new Map();
          state.todoCompletions = [];
          state.loadState = createInitialLoadState();
          state.filters = {
            searchQuery: "",
            sortBy: "orderIndex",
            sortOrder: "asc",
            completed: "all",
            showCompleted: true,
            filters: {},
          };
          state.stats = {
            totalCount: 0,
            completedCount: 0,
            pendingCount: 0,
            completionRate: 0,
            todayCompleted: 0,
          };
          state.dragState = {
            isDragging: false,
            draggedTodo: null,
            dropTarget: null,
          };
          const initialRealtimeState = createInitialRealtimeState();
          state.realtimeConnection = initialRealtimeState.realtimeConnection;
          state.realtimeSync = initialRealtimeState.realtimeSync;
          state.channel = initialRealtimeState.channel;
          state.isSubscribed = initialRealtimeState.isSubscribed;
        });
      },

      // 낙관적 업데이트 관리
      retryFailedOperation: async (operationId: string) => {
        // TODO: 구현 필요
        console.log('TODO: retryFailedOperation', { operationId });
      },

      clearFailedOperations: () => {
        set((state: TodoStoreState) => {
          state.optimisticState.pendingOperations = state.optimisticState.pendingOperations.filter(
            (op: any) => op.status !== "failed"
          );
        });
      },

      getPendingOperationsCount: () => {
        return get().optimisticState.pendingOperations.length;
      },

      // 상태 복원
      restoreTodoInstances: () => {
        const state = get();
        console.log("🔄 Todo 인스턴스 복원 시작");

        if (state.todos && Array.isArray(state.todos)) {
          const restoredTodos = state.todos
            .map((todoData: any) => {
              // 이미 Todo 인스턴스라면 그대로 반환
              if (
                todoData &&
                typeof todoData === "object" &&
                todoData.constructor?.name === "Todo"
              ) {
                return todoData;
              }

              // 일반 객체라면 Todo.fromDatabase()로 변환
              if (todoData && typeof todoData === "object") {
                try {
                  const restored = Todo.fromDatabase(todoData);
                  return restored;
                } catch (error) {
                  console.warn(`❌ Todo 복원 실패 (${todoData.id}):`, error);
                  return null;
                }
              }
              return null;
            })
            .filter(Boolean);

          console.log(`✅ Todo 인스턴스 복원 완료: ${restoredTodos.length}개`);
          set({ todos: restoredTodos });
        }
      },
    };
  },
  {
    name: "todo-store",
    devtools: true,
    persist: {
      name: "daystep-todos",
      version: 6,
      blacklist: [
        "loading",
        "error",
        "isSubscribed",
        "dragState",
        "optimisticState",
        "realtimeConnection",
        "realtimeSync",
        "channel",
        "recurringGroups", // 파생 데이터이므로 persist하지 않음
      ],
    } as any,
  }
);

// === Todo 인스턴스 복원 ===
// 스토어가 로드된 후 Todo 인스턴스를 복원
setTimeout(() => {
  if (typeof window !== "undefined") {
    useTodoStore.getState().restoreTodoInstances();
  }
}, 0);

export default useTodoStore;