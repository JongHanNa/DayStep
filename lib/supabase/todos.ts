/**
 * Supabase Todos - 할일 관리
 */

import { fetchWithJWT, queryRLSTableWithJWT, createWithJWT, updateWithJWT, deleteWithJWT, getMaxOrderIndexWithJWT, QueryOptions } from './core';

/**
 * 특정 날짜 범위의 할일 목록 조회 (성능 최적화)
 */
export async function fetchTodosForDateRange(
  userId: string,
  utcStart: Date,
  utcEnd: Date,
  options: QueryOptions = {},
  isRetry: boolean = false
): Promise<any[]> {
  console.log('📅 날짜별 할일 목록 조회:', {
    userId,
    utcStart: utcStart.toISOString(),
    utcEnd: utcEnd.toISOString(),
    options,
    isRetry
  });

  try {
    // 🚨 중요: 조회 대상 날짜를 YYYY-MM-DD 형식으로 변환 (반복 종료일 비교용)
    const currentDateString = utcStart.toISOString().split('T')[0];

    // 조회 대상 날짜의 요일 계산 (KST 기준, 0=일요일, 1=월요일, ..., 6=토요일)
    const targetDayOfWeek = new Date(utcStart.getTime() + (9 * 60 * 60 * 1000)).getDay();

    // 날짜 범위 필터링을 위한 쿼리 파라미터 구성
    const orConditions = [
      // 시간 지정 할일: start_time이 범위 내에 있고 반복이 아닌 경우만
      `and(schedule_type.eq.timed,start_time.gte.${utcStart.toISOString()},start_time.lte.${utcEnd.toISOString()},recurrence_pattern.eq.none)`,
      // 언제든지 할일: created_at이 범위 내에 있는 경우
      `and(schedule_type.eq.anytime,created_at.gte.${utcStart.toISOString()},created_at.lte.${utcEnd.toISOString()})`,
      // 하루종일 할일: created_at이 범위 내에 있는 경우
      `and(schedule_type.eq.all_day,created_at.gte.${utcStart.toISOString()},created_at.lte.${utcEnd.toISOString()})`,
      // 🔄 매일 반복 할일: 종료일 체크만
      `and(recurrence_pattern.eq.daily,or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}))`,
      // 🔄 주간 반복 할일: 종료일 체크 + 조회 날짜의 요일에 해당하는 것만
      `and(recurrence_pattern.eq.weekly,or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}),recurrence_days_of_week.cs.[${targetDayOfWeek}])`,
      // 🔄 기타 반복 할일: 종료일 체크만 (monthly 등)
      `and(recurrence_pattern.not.in.(none,daily,weekly),or(recurrence_end_date.is.null,recurrence_end_date.gt.${currentDateString}))`
    ];

    const queryParams = [
      `user_id=eq.${userId}`,
      `or=(${orConditions.join(',')})`,
      `select=*`
    ];

    // order 파라미터 추가
    if (options.order) {
      queryParams.push(`order=${options.order}`);
    }

    const path = `/todos?${queryParams.join('&')}`;

    const rawTodos = await fetchWithJWT(path);

    // 🔥 중요: raw JSON 데이터를 Todo 클래스로 변환 (camelCase 변환)
    const { Todo } = await import('../../entities/todo/Todo');
    const todos = (rawTodos || []).map((rawTodo: any) => Todo.fromDatabase(rawTodo));

    console.log('✅ 날짜별 할일 목록 조회 성공:', { count: todos?.length || 0, isRetry });
    return todos;
  } catch (error) {
    console.error('❌ 날짜별 할일 목록 조회 실패:', error);

    // 이미 재시도 중이라면 무한 재귀 방지를 위해 빈 배열 반환
    if (isRetry) {
      console.warn('🚫 재시도 중 실패 - 빈 배열 반환하여 무한 루프 방지');
      return [];
    }

    // 첫 번째 실패 시만 폴백 시도
    try {
      console.log('🔄 폴백: 넓은 범위로 할일 목록 조회');
      const farPast = new Date('2020-01-01');
      const farFuture = new Date('2030-12-31');
      return await fetchTodosForDateRange(userId, farPast, farFuture, options, true);
    } catch (fallbackError) {
      console.error('❌ 폴백 조회도 실패:', fallbackError);
      return [];
    }
  }
}

/**
 * JWT 방식으로 할일 생성
 */
export async function createTodoWithJWT(todoData: Record<string, any>): Promise<any> {
  console.log('📋 JWT 방식으로 할일 생성:', { todoData });

  try {
    const result = await createWithJWT('todos', todoData);
    console.log('✅ JWT 할일 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 할일 업데이트
 */
export async function updateTodoWithJWT(todoId: string, todoData: Record<string, any>): Promise<any> {
  console.log('📋 JWT 방식으로 할일 업데이트:', { todoId, todoData });

  try {
    const result = await updateWithJWT('todos', {
      column: 'id',
      operator: 'eq',
      value: todoId
    }, todoData);

    console.log('✅ JWT 할일 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 할일 삭제
 */
export async function deleteTodoWithJWT(todoId: string): Promise<any> {
  console.log('📋 JWT 방식으로 할일 삭제:', { todoId });

  try {
    const result = await deleteWithJWT('todos', {
      column: 'id',
      operator: 'eq',
      value: todoId
    });

    console.log('✅ JWT 할일 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 할일 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 모든 할일 조회 (할일 연결 모달용)
 * 날짜 필터링 없이 모든 할일을 내림차순으로 조회
 */
export async function fetchAllTodosWithJWT(
  userId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📋 JWT 방식으로 모든 할일 조회:', { userId, options });

  try {
    const todos = await queryRLSTableWithJWT('todos', {
      column: 'user_id',
      operator: 'eq',
      value: userId
    }, {
      select: '*',
      order: 'created_at.desc',
      ...options
    });

    console.log('✅ JWT 모든 할일 조회 성공:', { todosCount: todos.length });
    return todos || [];
  } catch (error) {
    console.error('❌ JWT 모든 할일 조회 실패:', error);
    return [];
  }
}

// getMaxOrderIndexWithJWT는 core.ts에 있으므로 재export
export { getMaxOrderIndexWithJWT } from './core';
