/**
 * Supabase Subtasks - JWT 기반 서브태스크 관리
 * Electron 환경에서 RLS 테이블 접근을 위한 함수들
 */

import { queryRLSTableWithJWT, createWithJWT, updateWithJWT, deleteWithJWT } from './core';

/**
 * JWT 방식으로 서브태스크 목록 조회
 */
export async function fetchSubtasksWithJWT(
  userId: string,
  parentTodoId: string
): Promise<any[]> {
  console.log('📋 JWT 방식으로 서브태스크 목록 조회:', { userId, parentTodoId });

  try {
    const result = await queryRLSTableWithJWT('todos', [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'parent_todo_id', operator: 'eq', value: parentTodoId },
      { column: 'recurrence_pattern', operator: 'eq', value: 'none' }
    ], {
      select: '*',
      order: 'order_index.asc'
    });

    console.log('✅ JWT 서브태스크 목록 조회 성공:', { count: result?.length || 0 });
    return result || [];
  } catch (error) {
    console.error('❌ JWT 서브태스크 목록 조회 실패:', error);
    throw error;
  }
}

/**
 * 서브태스크 생성 데이터 타입
 */
interface SubtaskCreateData {
  title: string;
  user_id: string;
  parent_todo_id: string;
  recurrence_pattern: 'none';
  schedule_type: 'anytime';
  order_index: number;
  completed: boolean;
  start_time?: string | null;
  project_id?: string | null;
}

/**
 * JWT 방식으로 서브태스크 생성
 */
export async function createSubtaskWithJWT(
  subtaskData: SubtaskCreateData
): Promise<any> {
  console.log('📋 JWT 방식으로 서브태스크 생성:', { parentTodoId: subtaskData.parent_todo_id });

  try {
    const result = await createWithJWT('todos', subtaskData);

    console.log('✅ JWT 서브태스크 생성 성공:', { subtaskId: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 서브태스크 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 서브태스크 완료 상태 업데이트
 */
export async function updateSubtaskCompletionWithJWT(
  subtaskId: string,
  completed: boolean
): Promise<any> {
  console.log('📋 JWT 방식으로 서브태스크 완료 상태 업데이트:', { subtaskId, completed });

  try {
    const result = await updateWithJWT('todos', [
      { column: 'id', operator: 'eq', value: subtaskId }
    ], {
      completed,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 서브태스크 완료 상태 업데이트 성공');
    return result;
  } catch (error) {
    console.error('❌ JWT 서브태스크 완료 상태 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 부모 할일 완료 상태 업데이트
 */
export async function updateParentTodoCompletionWithJWT(
  parentTodoId: string,
  completed: boolean
): Promise<any> {
  console.log('📋 JWT 방식으로 부모 할일 완료 상태 업데이트:', { parentTodoId, completed });

  try {
    const result = await updateWithJWT('todos', [
      { column: 'id', operator: 'eq', value: parentTodoId }
    ], {
      completed,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 부모 할일 완료 상태 업데이트 성공');
    return result;
  } catch (error) {
    console.error('❌ JWT 부모 할일 완료 상태 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 서브태스크 삭제
 */
export async function deleteSubtaskWithJWT(
  subtaskId: string
): Promise<boolean> {
  console.log('📋 JWT 방식으로 서브태스크 삭제:', { subtaskId });

  try {
    await deleteWithJWT('todos', [
      { column: 'id', operator: 'eq', value: subtaskId }
    ]);

    console.log('✅ JWT 서브태스크 삭제 성공');
    return true;
  } catch (error) {
    console.error('❌ JWT 서브태스크 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 서브태스크 업데이트
 */
export async function updateSubtaskWithJWT(
  subtaskId: string,
  updates: Record<string, any>
): Promise<any> {
  console.log('📋 JWT 방식으로 서브태스크 업데이트:', { subtaskId, updates });

  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const result = await updateWithJWT('todos', [
      { column: 'id', operator: 'eq', value: subtaskId }
    ], updateData);

    console.log('✅ JWT 서브태스크 업데이트 성공');
    return result;
  } catch (error) {
    console.error('❌ JWT 서브태스크 업데이트 실패:', error);
    throw error;
  }
}
