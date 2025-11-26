import { fetchWithJWT } from './core';
import type {
  NextActionContextItem,
  CreateNextActionContextInput,
  UpdateNextActionContextInput
} from '@/types';

/**
 * 기본 다음행동상황 항목 목록
 */
export const DEFAULT_NEXT_ACTION_CONTEXTS = [
  { title: '집중할 때', display_order: 0 },
  { title: '틈날 때', display_order: 1 },
  { title: '지칠 때', display_order: 2 },
  { title: '모바일 작업', display_order: 3 },
  { title: 'PC 작업', display_order: 4 },
  { title: '집에서', display_order: 5 },
  { title: '밖에서', display_order: 6 },
  { title: '어디서나', display_order: 7 },
  { title: '사무실', display_order: 8 },
  { title: '나중에', display_order: 9 },
];

/**
 * 사용자의 모든 다음행동상황 조회
 */
export async function fetchNextActionContexts(userId: string): Promise<NextActionContextItem[]> {
  try {
    const result = await fetchWithJWT(
      `/next_action_contexts?user_id=eq.${userId}&order=display_order.asc`,
      { method: 'GET' }
    );

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result as NextActionContextItem[];
  } catch (error) {
    console.error('Error fetching next action contexts:', error);
    return [];
  }
}

/**
 * 새 다음행동상황 생성
 */
export async function createNextActionContext(
  userId: string,
  data: CreateNextActionContextInput
): Promise<NextActionContextItem | null> {
  try {
    // display_order가 없으면 마지막 순서로 설정
    let displayOrder = data.display_order;
    if (displayOrder === undefined) {
      const existing = await fetchNextActionContexts(userId);
      displayOrder = existing.length > 0
        ? Math.max(...existing.map(c => c.display_order)) + 1
        : 0;
    }

    const result = await fetchWithJWT('/next_action_contexts', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        title: data.title,
        display_order: displayOrder,
      }),
      headers: {
        'Prefer': 'return=representation',
      },
    });

    if (Array.isArray(result) && result.length > 0) {
      return result[0] as NextActionContextItem;
    }

    return result as NextActionContextItem;
  } catch (error) {
    console.error('Error creating next action context:', error);
    return null;
  }
}

/**
 * 다음행동상황 수정
 */
export async function updateNextActionContext(
  data: UpdateNextActionContextInput
): Promise<NextActionContextItem | null> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.display_order !== undefined) {
      updateData.display_order = data.display_order;
    }

    const result = await fetchWithJWT(
      `/next_action_contexts?id=eq.${data.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: {
          'Prefer': 'return=representation',
        },
      }
    );

    if (Array.isArray(result) && result.length > 0) {
      return result[0] as NextActionContextItem;
    }

    return result as NextActionContextItem;
  } catch (error) {
    console.error('Error updating next action context:', error);
    return null;
  }
}

/**
 * 삭제된 next_action_context ID를 모든 todos에서 제거
 * @param userId - 사용자 ID
 * @param contextId - 삭제된 다음행동상황 ID
 */
async function cleanupDeletedContextFromTodos(
  userId: string,
  contextId: string
): Promise<void> {
  // 1. 해당 contextId를 포함하는 todos 조회
  const todos = await fetchWithJWT(
    `/todos?user_id=eq.${userId}&next_action_context_ids=cs.{${contextId}}&select=id,next_action_context_ids`
  );

  if (!Array.isArray(todos) || todos.length === 0) {
    return;
  }

  // 2. 각 todo에서 contextId 제거
  for (const todo of todos) {
    const updatedIds = (todo.next_action_context_ids || []).filter(
      (id: string) => id !== contextId
    );

    await fetchWithJWT(`/todos?id=eq.${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        next_action_context_ids: updatedIds.length > 0 ? updatedIds : null,
      }),
    });
  }
}

/**
 * 다음행동상황 삭제
 * @param id - 삭제할 다음행동상황 ID
 * @param userId - 사용자 ID (todos 테이블 정리용)
 */
export async function deleteNextActionContext(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    // 1. todos 테이블에서 먼저 해당 ID 정리
    await cleanupDeletedContextFromTodos(userId, id);

    // 2. next_action_contexts 테이블에서 삭제
    await fetchWithJWT(`/next_action_contexts?id=eq.${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error deleting next action context:', error);
    return false;
  }
}

/**
 * 순서 일괄 업데이트
 */
export async function reorderNextActionContexts(
  items: { id: string; display_order: number }[]
): Promise<boolean> {
  try {
    // 각 항목의 순서를 개별적으로 업데이트
    await Promise.all(
      items.map(item =>
        fetchWithJWT(`/next_action_contexts?id=eq.${item.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ display_order: item.display_order }),
        })
      )
    );
    return true;
  } catch (error) {
    console.error('Error reordering next action contexts:', error);
    return false;
  }
}

/**
 * 사용자의 기본 다음행동상황 항목 생성 (신규 사용자용)
 */
export async function ensureDefaultNextActionContexts(userId: string): Promise<boolean> {
  try {
    // 기존 항목 확인
    const existing = await fetchNextActionContexts(userId);

    // 이미 항목이 있으면 스킵
    if (existing.length > 0) {
      return true;
    }

    // 기본 항목 일괄 생성
    const insertData = DEFAULT_NEXT_ACTION_CONTEXTS.map(item => ({
      user_id: userId,
      title: item.title,
      display_order: item.display_order,
    }));

    await fetchWithJWT('/next_action_contexts', {
      method: 'POST',
      body: JSON.stringify(insertData),
    });

    return true;
  } catch (error) {
    console.error('Error creating default next action contexts:', error);
    return false;
  }
}

/**
 * Todo의 다음행동상황 ID 배열 업데이트
 */
export async function updateTodoNextActionContextIds(
  todoId: string,
  contextIds: string[]
): Promise<boolean> {
  try {
    await fetchWithJWT(`/todos?id=eq.${todoId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        next_action_context_ids: contextIds.length > 0 ? contextIds : null,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error updating todo next action context ids:', error);
    return false;
  }
}
