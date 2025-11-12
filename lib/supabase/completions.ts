import { format } from 'date-fns';
import { queryRLSTableWithJWT } from './core';

/**
 * 특정 날짜 범위의 완료 상태 로드
 */
export async function loadCompletionsForDateRange(
  rangeStart: Date,
  rangeEnd: Date,
  userId: string
): Promise<{ todo_id: string; completion_date: string }[]> {
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
      select: 'todo_id, completion_date'
    });

    return completions.map((c: any) => ({
      todo_id: c.todo_id,
      completion_date: c.completion_date
    }));
  } catch (error) {
    console.error('❌ 완료 상태 로드 실패:', error);
    return [];
  }
}
