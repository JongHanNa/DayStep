/**
 * Todo Exclusions - 반복 할일 제외 날짜 관리
 */

import { createWithJWT, queryRLSTableWithJWT, deleteWithJWT } from './core';

/**
 * JWT 방식으로 반복 일정 제외 날짜 생성
 */
export async function createTodoExclusionWithJWT(exclusionData: {
  parent_todo_id: string;
  excluded_date: string; // YYYY-MM-DD 형식
  user_id: string;
}): Promise<any> {
  console.log('🚫 JWT 방식으로 반복 일정 제외 날짜 생성:', { exclusionData });

  try {
    const result = await createWithJWT('todo_exclusions', exclusionData);
    console.log('✅ JWT 반복 일정 제외 날짜 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 제외 날짜들 조회
 */
export async function queryTodoExclusionsWithJWT(
  parentTodoId: string,
  userId: string
): Promise<string[]> {
  console.log('📅 JWT 방식으로 반복 일정 제외 날짜 조회:', { parentTodoId, userId });

  try {
    const exclusions = await queryRLSTableWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: 'excluded_date',
      order: 'excluded_date.asc'
    });

    const excludedDates = exclusions.map((e: any) => e.excluded_date);
    console.log('✅ JWT 반복 일정 제외 날짜 조회 성공:', {
      count: excludedDates.length,
      dates: excludedDates
    });
    return excludedDates;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 조회 실패:', error);
    return []; // 실패 시 빈 배열 반환
  }
}

/**
 * JWT 방식으로 특정 제외 날짜 삭제 (취소 기능용)
 */
export async function deleteTodoExclusionWithJWT(
  parentTodoId: string,
  excludedDate: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 일정 제외 날짜 삭제:', {
    parentTodoId,
    excludedDate,
    userId
  });

  try {
    const result = await deleteWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'excluded_date',
        operator: 'eq',
        value: excludedDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);

    console.log('✅ JWT 반복 일정 제외 날짜 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 제외 날짜 삭제 (할일 삭제 시 사용)
 */
export async function deleteAllTodoExclusionsWithJWT(
  parentTodoId: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 할일의 모든 제외 날짜 삭제:', {
    parentTodoId,
    userId
  });

  try {
    const result = await deleteWithJWT('todo_exclusions', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);

    console.log('✅ JWT 반복 할일의 모든 제외 날짜 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 할일의 모든 제외 날짜 삭제 실패:', error);
    throw error;
  }
}
