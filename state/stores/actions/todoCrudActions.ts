import { Todo } from "@/entities/todo/Todo";
import { CreateTodoInput, UpdateTodoInput } from "@/types";
import { supabase } from "@/lib/supabase";
import { TodoService } from "@/services/todo/TodoService";
import { integratedNotificationService } from "@/services/integrated-notification.service";
import { widgetSyncService } from "@/services/widget-sync.service";
import { isCapacitorEnvironment } from "@/lib/supabaseWebViewHelper";
import {
  createAsyncAction,
  createRetryableAction,
  logStoreAction,
} from "../../utils/storeUtils";

// TodoService 인스턴스 생성
const todoService = new TodoService();

/**
 * 할일 생성 액션 (CRUD)
 */
export const createTodoAction = createAsyncAction(async (data: CreateTodoInput) => {
  console.log("🔥🔥🔥 [DEBUG] createTodo 함수 시작됨");
  console.log(
    "🔥🔥🔥 [DEBUG] 입력 데이터:",
    JSON.stringify(data, null, 2)
  );

  logStoreAction("TodoStore", "createTodo", data);

  // 사용자 ID 추출 (Capacitor/웹 환경 공통)
  let userId: string | null = null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      userId = session.user.id;
      console.log("🔑 createTodo - 세션에서 사용자 ID 획득:", {
        userId: userId?.substring(0, 8),
      });
    }
  } catch (sessionError) {
    console.log("⚠️ createTodo - 세션 조회 실패:", sessionError);
  }

  // Capacitor 백업 시도
  if (!userId && isCapacitorEnvironment()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({
        key: "supabase_auth_session",
      });
      if (value) {
        const sessionData = JSON.parse(value);
        if (sessionData.user?.id) {
          userId = sessionData.user.id;
          console.log("🔑 createTodo - Capacitor 저장소에서 사용자 ID 획득:", {
            userId: userId?.substring(0, 8),
          });
        }
      }
    } catch (capacitorError) {
      console.log(
        "⚠️ createTodo - Capacitor 백업 사용자 ID 로드 실패:",
        capacitorError
      );
    }
  }

  if (!userId) {
    throw new Error("사용자 인증이 필요합니다.");
  }

  const todoData = {
    ...data,
    user_id: userId,
    title: data.title || data.content,
    schedule_type: data.schedule_type || "anytime",
    recurrence_pattern: data.recurrence_pattern || "none",
  };

  console.log(
    "🔥🔥🔥 [DEBUG] 최종 저장할 데이터:",
    JSON.stringify(todoData, null, 2)
  );

  // TodoService를 사용한 할일 생성
  const retryableCreate = createRetryableAction(
    async () => {
      console.log("🔥🔥🔥 [DEBUG] TodoService를 통한 할일 생성 시작");

      // TodoService.create 호출 (새로운 스키마 지원)
      const createdTodos = await todoService.create(todoData);
      const created = Array.isArray(createdTodos)
        ? createdTodos[0]
        : createdTodos;

      console.log("🔥🔥🔥 [DEBUG] TodoService 응답:");
      console.log(
        "🔥🔥🔥 [DEBUG] - created:",
        JSON.stringify(created, null, 2)
      );

      if (!created) {
        throw new Error("할일 생성에 실패했습니다.");
      }

      console.log("🔥🔥🔥 [DEBUG] TodoService를 통한 할일 생성 완료");

      return created;
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      onRetry: (attempt, error) => {
        logStoreAction("TodoStore", "createTodo:retry", {
          attempt,
          error: error.message,
        });
      },
      onError: (error, attempt) => {
        logStoreAction("TodoStore", "createTodo:failed", {
          error: error.message,
          attempt,
        });
      },
    }
  );

  const newTodo = await retryableCreate();

  return newTodo;
});

/**
 * 할일 업데이트 액션 (CRUD)
 */
export const updateTodoAction = createAsyncAction(
  async (id: string, data: Partial<CreateTodoInput>) => {
    logStoreAction("TodoStore", "updateTodo", { id, data });

    const retryableUpdate = createRetryableAction(
      async () => {
        const updatedTodo = await todoService.update(id, data);
        if (!updatedTodo) {
          throw new Error("할일 업데이트에 실패했습니다.");
        }
        return updatedTodo;
      },
      {
        maxRetries: 3,
        retryDelay: 1000,
        onRetry: (attempt, error) => {
          logStoreAction("TodoStore", "updateTodo:retry", {
            id,
            attempt,
            error: error.message,
          });
        },
        onError: (error, attempt) => {
          logStoreAction("TodoStore", "updateTodo:failed", {
            id,
            error: error.message,
            attempt,
          });
        },
      }
    );

    const finalTodo = await retryableUpdate();

    // 통합 알림 시스템에 브로드캐스트 - 실패해도 중단하지 않음
    try {
      // TODO: broadcastTodoUpdate 메서드가 구현되면 주석 해제
      // await integratedNotificationService.broadcastTodoUpdate(finalTodo);
    } catch (broadcastError) {
      console.warn("⚠️ Broadcast 발송 실패:", broadcastError);
    }

    return finalTodo;
  }
);

/**
 * 할일 삭제 액션 (CRUD)
 */
export const deleteTodoAction = createAsyncAction(async (id: string) => {
  logStoreAction("TodoStore", "deleteTodo", { id });

  const retryableDelete = createRetryableAction(
    async () => {
      await todoService.delete(id);
      return true;
    },
    {
      maxRetries: 3,
      retryDelay: 1000,
      onRetry: (attempt, error) => {
        logStoreAction("TodoStore", "deleteTodo:retry", {
          id,
          attempt,
          error: error.message,
        });
      },
      onError: (error, attempt) => {
        logStoreAction("TodoStore", "deleteTodo:failed", {
          id,
          error: error.message,
          attempt,
        });
      },
    }
  );

  await retryableDelete();

  return true;
});

/**
 * 할일 조회 액션 (READ)
 */
export const fetchTodoByIdAction = async (id: string) => {
  logStoreAction("TodoStore", "fetchTodoById", { id });

  try {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return Todo.fromDatabase(data);
  } catch (error) {
    console.error("할일 조회 실패:", error);
    return null;
  }
};

/**
 * 할일 완료 상태 토글
 */
export const toggleTodoCompletion = async (id: string, todos: Todo[], newCompletedState?: boolean) => {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return false;

  // 새로운 완료 상태가 명시적으로 전달된 경우 사용, 그렇지 않으면 현재 상태의 반대 사용
  const targetCompletedState = newCompletedState !== undefined ? newCompletedState : !todo.completed;

  const updatedTodo = await updateTodoAction(id, { completed: targetCompletedState });
  return updatedTodo !== null;
};

/**
 * 여러 할일의 완료 상태 일괄 변경
 */
export const toggleMultipleTodos = async (ids: string[], completed: boolean) => {
  try {
    const updatePromises = ids.map(id => updateTodoAction(id, { completed }));
    const results = await Promise.allSettled(updatePromises);
    
    const successes = results.filter(result => result.status === 'fulfilled');
    return successes.length === ids.length;
  } catch (error) {
    console.error("일괄 완료 상태 변경 실패:", error);
    return false;
  }
};