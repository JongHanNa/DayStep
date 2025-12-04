/**
 * Time Overrides - 반복 할일 시간 override 관리
 */

import { createWithJWT, updateWithJWT, queryRLSTableWithJWT, deleteWithJWT, type QueryCondition } from './core';

/**
 * JWT 방식으로 반복 할일 시간/제목 override 생성
 */
export async function createTimeOverrideWithJWT(overrideData: {
  parent_todo_id: string;
  user_id: string;
  override_date: string; // YYYY-MM-DD 형식
  start_time?: string; // ISO string (선택적 - 제목만 변경할 수도 있음)
  end_time?: string; // ISO string
  title?: string; // 제목 override (선택적)
}): Promise<any> {
  console.log('⏰ JWT 방식으로 시간/제목 override 생성:', { overrideData });

  try {
    const result = await createWithJWT('todo_overrides', {
      ...overrideData,
      updated_at: new Date().toISOString()
    });
    console.log('✅ JWT 시간/제목 override 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간/제목 override 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 반복 할일 시간/제목 override 업데이트
 */
export async function updateTimeOverrideWithJWT(
  parentTodoId: string,
  overrideDate: string,
  updateData: {
    start_time?: string;
    end_time?: string;
    title?: string; // 제목 override (선택적)
  }
): Promise<any> {
  console.log('⏰ JWT 방식으로 시간/제목 override 업데이트:', {
    parentTodoId,
    overrideDate,
    updateData
  });

  try {
    const result = await updateWithJWT('todo_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'eq',
        value: overrideDate
      }
    ], {
      ...updateData,
      updated_at: new Date().toISOString()
    });

    console.log('✅ JWT 시간/제목 override 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간/제목 override 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 시간 override 조회
 */
export async function queryTimeOverridesWithJWT(
  parentTodoId: string,
  userId: string,
  dateRange?: { start: string; end: string } // YYYY-MM-DD 형식
): Promise<any[]> {
  console.log('🔍 JWT 방식으로 시간 override 조회:', {
    parentTodoId,
    userId,
    dateRange
  });

  try {
    const conditions: QueryCondition[] = [
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
    ];

    // 날짜 범위 필터 추가
    if (dateRange) {
      conditions.push(
        {
          column: 'override_date',
          operator: 'gte',
          value: dateRange.start
        },
        {
          column: 'override_date',
          operator: 'lte',
          value: dateRange.end
        }
      );
    }

    const overrides = await queryRLSTableWithJWT('todo_overrides', conditions, {
      select: '*',
      order: 'override_date.asc'
    });

    console.log('✅ JWT 시간 override 조회 성공:', {
      count: overrides.length,
      parentTodoId
    });
    return overrides;
  } catch (error) {
    console.error('❌ JWT 시간 override 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 날짜의 시간 override 삭제
 */
export async function deleteTimeOverrideWithJWT(
  parentTodoId: string,
  overrideDate: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 시간 override 삭제:', {
    parentTodoId,
    overrideDate,
    userId
  });

  try {
    const result = await deleteWithJWT('todo_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'eq',
        value: overrideDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);

    console.log('✅ JWT 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 시간 override 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 날짜 이후의 모든 시간 override 삭제 ("이후 모든 일정 업데이트" 기능용)
 */
export async function deleteTimeOverridesFromDateWithJWT(
  parentTodoId: string,
  fromDate: string, // YYYY-MM-DD 형식
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 특정 날짜 이후 시간 override 삭제:', {
    parentTodoId,
    fromDate,
    userId
  });

  try {
    const result = await deleteWithJWT('todo_overrides', [
      {
        column: 'parent_todo_id',
        operator: 'eq',
        value: parentTodoId
      },
      {
        column: 'override_date',
        operator: 'gte',
        value: fromDate
      },
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ]);

    console.log('✅ JWT 특정 날짜 이후 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 특정 날짜 이후 시간 override 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 모든 시간 override 삭제 ("모든 일정 업데이트" 기능용)
 */
export async function deleteAllTimeOverridesWithJWT(
  parentTodoId: string,
  userId: string
): Promise<any> {
  console.log('🗑️ JWT 방식으로 반복 할일의 모든 시간 override 삭제:', {
    parentTodoId,
    userId
  });

  try {
    const result = await deleteWithJWT('todo_overrides', [
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

    console.log('✅ JWT 반복 할일의 모든 시간 override 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 할일의 모든 시간 override 삭제 실패:', error);
    throw error;
  }
}
