import { format } from 'date-fns';
import { queryRLSTableWithJWT } from './core';

/**
 * 완료 기록 타입 (실제 수행 시간 포함)
 */
export interface CompletionRecord {
  todo_id: string;
  completion_date: string;
  actual_start_time: string | null;  // 실제 수행 시작 시간 (ISO 8601)
  actual_end_time: string | null;    // 실제 수행 종료 시간 (ISO 8601)
}

/**
 * 특정 날짜 범위의 완료 상태 로드 (실제 수행 시간 포함)
 */
export async function loadCompletionsForDateRange(
  rangeStart: Date,
  rangeEnd: Date,
  userId: string
): Promise<CompletionRecord[]> {
  try {
    const startDate = format(rangeStart, 'yyyy-MM-dd');
    const endDate = format(rangeEnd, 'yyyy-MM-dd');

    const completions = await queryRLSTableWithJWT('todo_completions', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'completion_date',
        operator: 'gte',
        value: startDate
      },
      {
        column: 'completion_date',
        operator: 'lte',
        value: endDate
      }
    ], {
      // 실제 수행 시간 필드 추가 (2026-01-19)
      select: 'todo_id, completion_date, actual_start_time, actual_end_time'
    });

    return completions.map((c: any) => ({
      todo_id: c.todo_id,
      completion_date: c.completion_date,
      actual_start_time: c.actual_start_time || null,
      actual_end_time: c.actual_end_time || null,
    }));
  } catch (error) {
    console.error('❌ 완료 상태 로드 실패:', error);
    return [];
  }
}
