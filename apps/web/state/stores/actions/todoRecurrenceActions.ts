import { Todo } from "@/entities/todo/Todo";
import { CreateTodoInput, UpdateTodoInput } from "@/types";
import { supabase } from "@/lib/supabase";
import { TodoService } from "@/services/todo/TodoService";
import { TodoCompletionsService } from "@/services/todo-completions.service";
import {
  applyCompletionStatusToInstances,
  isRecurrenceInstanceCompleted
} from "@/lib/recurrence-utils";
import { isCapacitorEnvironment } from "@/lib/supabase/core";
import {
  createAsyncAction,
  logStoreAction,
} from "../../utils/storeUtils";

// TodoService 인스턴스 생성
const todoService = new TodoService();

/**
 * 반복 일정과 함께 새 할일 생성
 */
export const createTodoWithRecurrenceAction = createAsyncAction(
  async (input: CreateTodoInput) => {
    logStoreAction("TodoStore", "createTodoWithRecurrence", input);

    try {
      // 현재 사용자 ID 가져오기
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("사용자 인증이 필요합니다.");
      }

      // TodoService를 통한 반복 일정 생성
      const inputWithUser = { ...input, user_id: userId };
      const createdTodos = await todoService.createWithRecurrence(inputWithUser);

      return createdTodos;
    } catch (error) {
      console.error("반복 할일 생성 오류:", error);
      throw error;
    }
  }
);

/**
 * 반복 일정 할일 업데이트
 */
export const updateRecurringTodoAction = createAsyncAction(
  async (
    id: string,
    updates: Partial<CreateTodoInput>,
    updateType: "this" | "future" | "all",
    occurrenceDate?: Date
  ) => {
    logStoreAction("TodoStore", "updateRecurringTodo", {
      id,
      updates,
      updateType,
      occurrenceDate,
    });

    try {
      // TodoService를 통한 실제 업데이트
      const updateInput: UpdateTodoInput = { id, ...updates };
      await todoService.updateRecurringTodo(id, updateInput, updateType, occurrenceDate);

      return true;
    } catch (error) {
      console.error("반복 할일 업데이트 실패:", error);
      throw error;
    }
  }
);

/**
 * 반복 할일 삭제
 */
export const deleteRecurringTodoAction = async (
  id: string, 
  deleteType: 'this' | 'future' | 'all', 
  excludedDate?: string
) => {
  logStoreAction("TodoStore", "deleteRecurringTodo", { id, deleteType, excludedDate });

  try {
    await todoService.deleteRecurringTodo(id, deleteType);
    
    return true;
  } catch (error) {
    console.error("반복 할일 삭제 실패:", error);
    throw error;
  }
};

/**
 * 날짜 범위 내 반복 할일 완료 기록 로드
 */
export const loadCompletionsForDateRangeAction = async (startDate: Date, endDate: Date) => {
  try {
    // 🔑 사용자 ID 획득 (Capacitor 백업 패턴)
    let userId: string | null = null;
    
    // 먼저 일반 세션에서 사용자 ID 시도
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
        console.log("🔑 완료 기록 로드 - 세션에서 사용자 ID 획득:", {
          userId: userId?.substring(0, 8),
        });
      }
    } catch (sessionError) {
      console.log("⚠️ 완료 기록 로드 - 세션 조회 실패:", sessionError);
    }

    // Capacitor 백업 시도
    if (!userId && isCapacitorEnvironment()) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' });
        
        if (sessionDataStr.value) {
          const sessionData = JSON.parse(sessionDataStr.value);
          if (sessionData.user?.id) {
            userId = sessionData.user.id;
            console.log("🔑 완료 기록 로드 - Capacitor 저장소에서 사용자 ID 획득:", {
              userId: userId?.substring(0, 8),
            });
          }
        }
      } catch (capacitorError) {
        console.log("⚠️ 완료 기록 로드 - Capacitor 백업 사용자 ID 로드 실패:", capacitorError);
      }
    }

    if (!userId) {
      console.warn("⚠️ 완료 기록 로드: 사용자 인증 필요");
      return [];
    }

    // 완료 기록 조회
    const completions = await TodoCompletionsService.getCompletionsByDateRange(
      userId, 
      startDate, 
      endDate
    );

    console.log('✅ 완료 기록 로드 성공:', {
      userId: userId.substring(0, 8),
      completionsCount: completions.length,
      dateRange: `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`
    });

    return completions;
  } catch (error) {
    console.error('❌ 완료 기록 로드 오류:', error);
    return [];
  }
};

/**
 * 반복 할일 완료 상태 토글
 */
export const toggleRecurrenceCompletionAction = async (
  todoId: string, 
  targetDate: Date, 
  todoCompletions: { todo_id: string; completion_date: string }[]
): Promise<{ isCompleted: boolean; completions: { todo_id: string; completion_date: string }[] }> => {
  try {
    // 🔑 Capacitor 백업 세션 패턴으로 사용자 ID 획득
    let userId: string | null = null;
    
    // 먼저 일반 세션에서 사용자 ID 시도
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        userId = session.user.id;
        console.log("🔑 세션에서 사용자 ID 획득:", {
          userId: userId?.substring(0, 8),
        });
      }
    } catch (sessionError) {
      console.log("⚠️ 세션 조회 실패:", sessionError);
    }

    // Capacitor 백업 시도 (createTodo와 동일한 로직)
    if (!userId && typeof window !== 'undefined' && (window as any).Capacitor) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' }); // 🔑 올바른 key
        
        if (sessionDataStr.value) {
          const sessionData = JSON.parse(sessionDataStr.value);
          if (sessionData.user?.id) {
            userId = sessionData.user.id;
            console.log("🔑 Capacitor 저장소에서 사용자 ID 획득:", {
              userId: userId?.substring(0, 8),
            });
          }
        }
      } catch (capacitorError) {
        console.log("⚠️ Capacitor 백업 사용자 ID 로드 실패:", capacitorError);
      }
    }

    if (!userId) {
      console.warn("⚠️ 완료 토글: 사용자 인증 필요");
      throw new Error("사용자 인증이 필요합니다.");
    }

    // 현재 완료 상태 확인
    const isCurrentlyCompleted = isRecurrenceInstanceCompleted(
      todoId,
      targetDate,
      todoCompletions
    );

    // 완료 상태 토글
    const result = await TodoCompletionsService.toggleCompletion(
      todoId,
      userId,
      targetDate,
      isCurrentlyCompleted
    );

    // 로컬 완료 기록 업데이트
    const targetDateString = targetDate.toISOString().split('T')[0];
    let updatedCompletions = [...todoCompletions];
    
    if (result.isCompleted) {
      // 완료 추가
      const newCompletion = {
        todo_id: todoId,
        completion_date: targetDateString
      };
      updatedCompletions = [...updatedCompletions, newCompletion];
    } else {
      // 완료 제거
      updatedCompletions = updatedCompletions.filter(
        (completion) => 
          !(completion.todo_id === todoId && completion.completion_date === targetDateString)
      );
    }

    console.log('✅ 반복 할일 완료 토글 성공:', {
      todoId,
      targetDate: targetDate.toISOString().split('T')[0],
      isCompleted: result.isCompleted
    });

    return {
      isCompleted: result.isCompleted,
      completions: updatedCompletions
    };

  } catch (error) {
    console.error('❌ 반복 할일 완료 토글 오류:', error);
    throw error;
  }
};

/**
 * 특정 반복 할일의 날짜별 완료 상태 확인
 */
export const isRecurrenceCompletedAction = (
  todoId: string, 
  targetDate: Date, 
  todoCompletions: { todo_id: string; completion_date: string }[]
): boolean => {
  return isRecurrenceInstanceCompleted(todoId, targetDate, todoCompletions);
};

/**
 * 반복 할일 그룹 관리 유틸리티
 */
export const updateRecurringGroups = (
  recurringGroups: Map<string, Todo[]>,
  createdTodos: Todo[],
  recurrencePattern: string
): Map<string, Todo[]> => {
  const newGroups = new Map(recurringGroups);

  // 반복 일정 그룹 관리
  if (recurrencePattern !== "none" && createdTodos.length > 1) {
    const parent = createdTodos[0];
    const instances = createdTodos.slice(1);
    newGroups.set(parent.id, instances);

    instances.forEach((instance) => {
      if (instance.parentTodoId) {
        const existing = newGroups.get(instance.parentTodoId) || [];
        if (!existing.find((t: Todo) => t.id === instance.id)) {
          existing.push(instance);
          newGroups.set(instance.parentTodoId, existing);
        }
      }
    });
  }

  return newGroups;
};