/**
 * Todo Exclusions - 반복 할일 제외 날짜 관리
 */

import { createWithJWT, queryRLSTableWithJWT, deleteWithJWT } from './core';

/** 제외 사유 타입
 * - 'deleted': 삭제됨
 * - 'skipped': 건너뛰기 (레거시)
 * - 'postponed': 미뤘음 (귀찮아서 안 함)
 * - 'not_needed': 오늘은 필요 없었음
 * - 'missed': 놓침 (시간이 지나서 못 함)
 */
export type ExclusionReason = 'deleted' | 'skipped' | 'postponed' | 'not_needed' | 'missed';

/** 제외 날짜 정보 타입 */
export interface TodoExclusionInfo {
  excluded_date: string;
  exclusion_reason: ExclusionReason;
  postponed_to_start_time?: string | null; // 미룸 목적지 시작 시간 (ISO string)
  postponed_to_end_time?: string | null; // 미룸 목적지 종료 시간 (ISO string)
}

/**
 * JWT 방식으로 반복 일정 제외 날짜 생성
 * @param exclusion_reason - 'deleted': 삭제, 'skipped': 건너뛰기 (기본값: 'deleted')
 */
export async function createTodoExclusionWithJWT(exclusionData: {
  parent_todo_id: string;
  excluded_date: string; // YYYY-MM-DD 형식
  user_id: string;
  exclusion_reason?: ExclusionReason;
  postponed_to_start_time?: string; // 미룸 목적지 시작 시간 (ISO string)
  postponed_to_end_time?: string; // 미룸 목적지 종료 시간 (ISO string)
}): Promise<any> {
  const dataWithReason = {
    ...exclusionData,
    exclusion_reason: exclusionData.exclusion_reason || 'deleted'
  };

  console.log('🚫 JWT 방식으로 반복 일정 제외 날짜 생성:', { dataWithReason });

  try {
    const result = await createWithJWT('todo_exclusions', dataWithReason);
    console.log('✅ JWT 반복 일정 제외 날짜 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 반복 할일의 제외 날짜들 조회
 * @returns 제외 날짜 문자열 배열 (기존 호환성 유지)
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
 * JWT 방식으로 특정 반복 할일의 제외 날짜들 상세 조회 (reason 포함)
 * @returns 제외 날짜 정보 배열 (날짜 + 사유)
 */
export async function queryTodoExclusionsDetailWithJWT(
  parentTodoId: string,
  userId: string
): Promise<TodoExclusionInfo[]> {
  console.log('📅 JWT 방식으로 반복 일정 제외 날짜 상세 조회:', { parentTodoId, userId });

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
      select: 'excluded_date, exclusion_reason, postponed_to_start_time, postponed_to_end_time',
      order: 'excluded_date.asc'
    });

    const result: TodoExclusionInfo[] = exclusions.map((e: any) => ({
      excluded_date: e.excluded_date,
      exclusion_reason: e.exclusion_reason || 'deleted',
      postponed_to_start_time: e.postponed_to_start_time || null,
      postponed_to_end_time: e.postponed_to_end_time || null
    }));

    console.log('✅ JWT 반복 일정 제외 날짜 상세 조회 성공:', {
      count: result.length,
      data: result
    });
    return result;
  } catch (error) {
    console.error('❌ JWT 반복 일정 제외 날짜 상세 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 건너뛴(skipped) 날짜만 조회
 */
export async function querySkippedDatesWithJWT(
  parentTodoId: string,
  userId: string
): Promise<string[]> {
  console.log('⏭️ JWT 방식으로 건너뛴 날짜 조회:', { parentTodoId, userId });

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
      },
      {
        column: 'exclusion_reason',
        operator: 'eq',
        value: 'skipped'
      }
    ], {
      select: 'excluded_date',
      order: 'excluded_date.asc'
    });

    const skippedDates = exclusions.map((e: any) => e.excluded_date);
    console.log('✅ JWT 건너뛴 날짜 조회 성공:', {
      count: skippedDates.length,
      dates: skippedDates
    });
    return skippedDates;
  } catch (error) {
    console.error('❌ JWT 건너뛴 날짜 조회 실패:', error);
    return [];
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
