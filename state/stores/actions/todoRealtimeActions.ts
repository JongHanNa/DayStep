import { Todo } from "@/entities/todo/Todo";
import { supabase } from "@/lib/supabase";
import {
  createRealtimeManager,
  createConflictResolver,
  logStoreAction,
  type RealtimeConnectionState,
  type RealtimeSyncState,
} from "../../utils/storeUtils";

// 실시간 관리자 및 충돌 해결자 인스턴스
const realtimeManager = createRealtimeManager();
const conflictResolver = createConflictResolver<Todo>();

/**
 * 실시간 구독 시작
 */
export const subscribeToRealtimeUpdates = (
  onStateUpdate: (updater: (state: any) => void) => void,
  getCurrentState: () => any
) => {
  const currentState = getCurrentState();
  if (currentState.isSubscribed) {
    return;
  }

  logStoreAction("TodoStore", "subscribe");

  // 연결 상태를 'connecting'으로 업데이트
  onStateUpdate((state: any) => {
    state.realtimeConnection = realtimeManager.updateConnectionState({
      status: "connecting",
    });
  });

  const channel = supabase
    .channel("todos-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "todos" },
      (payload) => {
        const newTodo = Todo.fromDatabase(payload.new as any);

        onStateUpdate((state: any) => {
          // 낙관적 업데이트 중인 아이템이 아닌 경우에만 추가
          const isOptimistic =
            state.optimisticState.pendingOperations.some(
              (op: any) =>
                op.type === "create" &&
                op.data.title === newTodo.title
            );

          if (!isOptimistic) {
            // 충돌 감지 및 해결
            const existingTodo = state.todos.find(
              (t: any) => t.id === newTodo.id
            );
            if (existingTodo) {
              const resolved = conflictResolver.resolveConflict(
                existingTodo,
                newTodo
              );
              const index = state.todos.findIndex(
                (t: any) => t.id === newTodo.id
              );
              state.todos[index] = resolved;
              state.realtimeSync.conflictCount++;
            } else {
              state.todos.unshift(newTodo);
            }

            state.todos.sort(
              (a: any, b: any) => a.orderIndex - b.orderIndex
            );
            state.refreshStats();
            state.realtimeSync.lastSyncTime = new Date();
          }
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "todos" },
      (payload) => {
        const updatedTodo = Todo.fromDatabase(payload.new as any);

        onStateUpdate((state: any) => {
          // 낙관적 업데이트 중인 아이템이 아닌 경우에만 업데이트
          const isOptimistic =
            state.optimisticState.pendingOperations.some(
              (op: any) =>
                op.id === updatedTodo.id && op.type === "update"
            );

          if (!isOptimistic) {
            const existingTodo = state.todos.find(
              (t: any) => t.id === updatedTodo.id
            );
            if (existingTodo) {
              // 충돌 감지 및 해결
              if (
                conflictResolver.detectConflict(existingTodo, updatedTodo)
              ) {
                const resolved = conflictResolver.resolveConflict(
                  existingTodo,
                  updatedTodo
                );
                const index = state.todos.findIndex(
                  (t: any) => t.id === updatedTodo.id
                );
                if (index !== -1) {
                  state.todos[index] = resolved;
                }
                state.realtimeSync.conflictCount++;
              } else {
                // 충돌 없음, 그냥 업데이트
                const index = state.todos.findIndex(
                  (t: any) => t.id === updatedTodo.id
                );
                if (index !== -1) {
                  state.todos[index] = updatedTodo;
                }
              }
            } else {
              // 새 아이템으로 추가
              state.todos.push(updatedTodo);
            }

            state.todos.sort(
              (a: any, b: any) => a.orderIndex - b.orderIndex
            );
            state.refreshStats();
            state.realtimeSync.lastSyncTime = new Date();
          }
        });
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "todos" },
      (payload) => {
        const deletedId = (payload.old as any).id;

        onStateUpdate((state: any) => {
          // 낙관적 업데이트 중인 아이템이 아닌 경우에만 삭제
          const isOptimistic =
            state.optimisticState.pendingOperations.some(
              (op: any) => op.id === deletedId && op.type === "delete"
            );

          if (!isOptimistic) {
            state.todos = state.todos.filter(
              (t: any) => t.id !== deletedId
            );
            state.refreshStats();
            state.realtimeSync.lastSyncTime = new Date();
          }
        });
      }
    )
    .subscribe((status) => {
      onStateUpdate((state: any) => {
        switch (status) {
          case "SUBSCRIBED":
            const { connectionState, syncState } =
              realtimeManager.handleConnectionSuccess();
            state.realtimeConnection = connectionState;
            state.realtimeSync = {
              ...syncState,
              isInitialSyncComplete: true,
            };
            state.isSubscribed = true;
            state.channel = channel;
            break;

          case "CLOSED":
          case "CHANNEL_ERROR":
            const { connectionState: errorConnectionState } =
              realtimeManager.handleConnectionError(status);
            state.realtimeConnection = errorConnectionState;
            state.isSubscribed = false;
            
            // 재연결 시도 (최대 횟수 내에서)
            if (state.realtimeConnection.retryCount < state.realtimeConnection.maxRetries) {
              setTimeout(() => {
                subscribeToRealtimeUpdates(onStateUpdate, getCurrentState);
              }, state.realtimeConnection.retryDelay * Math.pow(2, state.realtimeConnection.retryCount));
            }
            break;

          default:
            break;
        }
      });
    });

  return channel;
};

/**
 * 실시간 구독 해제
 */
export const unsubscribeFromRealtimeUpdates = (
  onStateUpdate: (updater: (state: any) => void) => void,
  getCurrentState: () => any
) => {
  const currentState = getCurrentState();
  if (!currentState.isSubscribed) {
    return;
  }

  logStoreAction("TodoStore", "unsubscribe");

  onStateUpdate((state: any) => {
    // 채널 구독 해제
    if (state.channel) {
      state.channel.unsubscribe();
    }

    state.isSubscribed = false;
    state.channel = null;
    state.realtimeConnection = {
      status: "disconnected" as const,
      lastConnected: null,
      retryCount: 0,
      maxRetries: 5,
      retryDelay: 1000,
      error: null,
    };
    state.realtimeSync = {
      isInitialSyncComplete: false,
      lastSyncTime: null,
      pendingChanges: 0,
      conflictCount: 0,
      isRealtime: false,
    };
  });

  console.log("실시간 구독 해제됨");
};

/**
 * 강제 재연결
 */
export const forceReconnectRealtime = (
  unsubscribeFn: () => void,
  subscribeFn: () => void
) => {
  logStoreAction("TodoStore", "forceReconnect");

  // 기존 연결 해제
  unsubscribeFn();

  // 짧은 지연 후 재연결
  setTimeout(() => {
    subscribeFn();
  }, 1000);
};

/**
 * 연결 상태 반환
 */
export const getConnectionStatus = (realtimeConnection: RealtimeConnectionState): string => {
  if (
    realtimeConnection.status === "connected" &&
    realtimeConnection.lastConnected &&
    Date.now() - realtimeConnection.lastConnected.getTime() > 30000
  ) {
    return "stale"; // 30초 이상 된 연결은 stale로 간주
  }

  return realtimeConnection.status;
};

/**
 * 동기화 상태 반환
 */
export const getSyncStatus = (realtimeSync: RealtimeSyncState): RealtimeSyncState => {
  return { ...realtimeSync };
};

/**
 * 실시간 상태 초기값 생성
 */
export const createInitialRealtimeState = () => {
  return {
    realtimeConnection: {
      status: "disconnected" as const,
      lastConnected: null,
      retryCount: 0,
      maxRetries: 5,
      retryDelay: 1000,
      error: null,
    },
    realtimeSync: {
      isInitialSyncComplete: false,
      lastSyncTime: null,
      pendingChanges: 0,
      conflictCount: 0,
      isRealtime: false,
    },
    isSubscribed: false,
    channel: null,
  };
};