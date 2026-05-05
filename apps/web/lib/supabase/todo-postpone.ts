/**
 * Todo Postpone - 반복 할일 미루기 처리 통합 모듈
 *
 * 새 아키텍처 (2025.01):
 * - todo_overrides 테이블 삭제됨
 * - 대신 exclusion + 독립 할일 방식으로 처리
 * - 독립 할일은 todos 테이블에 parent_recurring_todo_id, occurrence_date 컬럼으로 연결
 */

import { createTodoExclusionWithJWT, deleteTodoExclusionWithJWT } from './todo-exclusions';
import { queryRLSTableWithJWT, updateWithJWT, type QueryCondition } from './core';
import { createTodoWithJWT, deleteTodoWithJWT } from './todos';
import type { PostponeParams, AnytimeInboxItem } from '@/types';

/**
 * HH:mm 시간을 특정 날짜 기준 ISO string으로 변환
 */
function convertToISOTime(occurrenceDate: string, time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const dateObj = new Date(occurrenceDate + 'T00:00:00'); // 사용자 기기 로컬 자정
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj.toISOString();
}

/**
 * 미루기 처리 통합 함수
 *
 * 새 아키텍처:
 * - reschedule: exclusion 생성 + 새 시간의 독립 할일 생성
 * - anytime: exclusion 생성 + schedule_type='anytime'인 독립 할일 생성
 * - start_now: DB 변경 없음 (타이머만 시작)
 *
 * @param params.action - 'reschedule' | 'anytime' | 'start_now'
 * @param params.recordPostponement - 미룸 기록 여부 (exclusion 생성)
 * @param params.newTime - HH:mm (reschedule인 경우)
 * @returns 생성된 독립 할일의 ID (start_now인 경우 null)
 */
export async function postponeTodoInstance(params: PostponeParams): Promise<string | null> {
  const {
    parentTodoId,
    occurrenceDate,
    userId,
    action,
    recordPostponement,
    newTime,
    originalStartTime,
  } = params;

  console.log('🔄 반복 할일 미루기 처리:', {
    parentTodoId,
    occurrenceDate,
    action,
    recordPostponement,
    newTime,
  });

  try {
    // 2. 원본 할일 정보 조회 (exclusion 생성 전에 먼저 조회 - reschedule 목적지 시간 계산용)
    const parentTodos = await queryRLSTableWithJWT('todos', [
      { column: 'id', operator: 'eq', value: parentTodoId }
    ], {
      select: 'id, title, icon, color, start_time, end_time, anytime_duration'
    });

    if (!parentTodos || parentTodos.length === 0) {
      throw new Error(`원본 할일을 찾을 수 없습니다: ${parentTodoId}`);
    }

    const parentTodo = parentTodos[0];

    // 1. 원본 반복 할일에서 해당 날짜 제외 (exclusion 생성)
    // reschedule 액션일 때만 목적지 시간 포함
    if (recordPostponement) {
      let postponedToStartTime: string | undefined;
      let postponedToEndTime: string | undefined;

      // reschedule 액션이고 newTime이 있을 때만 목적지 시간 계산
      if (action === 'reschedule' && newTime) {
        postponedToStartTime = convertToISOTime(occurrenceDate, newTime);

        // end_time 계산 (원본 duration 유지)
        if (parentTodo.start_time && parentTodo.end_time) {
          const originalStart = new Date(parentTodo.start_time);
          const originalEnd = new Date(parentTodo.end_time);
          const durationMs = originalEnd.getTime() - originalStart.getTime();
          const newStartDate = new Date(postponedToStartTime);
          postponedToEndTime = new Date(newStartDate.getTime() + durationMs).toISOString();
        }
      }

      await createTodoExclusionWithJWT({
        parent_todo_id: parentTodoId,
        excluded_date: occurrenceDate,
        user_id: userId,
        exclusion_reason: 'postponed',
        postponed_to_start_time: postponedToStartTime,
        postponed_to_end_time: postponedToEndTime,
      });
      console.log('✅ 미룸 기록(exclusion) 생성 완료', {
        hasDestinationTime: !!(postponedToStartTime && postponedToEndTime)
      });
    }

    // 3. 독립 할일 데이터 구성
    const newTodoData: Record<string, any> = {
      title: parentTodo.title,
      icon: parentTodo.icon,
      color: parentTodo.color,
      anytime_duration: parentTodo.anytime_duration,
      recurrence_pattern: 'none', // 독립 할일은 반복 없음
      parent_recurring_todo_id: parentTodoId, // 원본 반복 할일 연결
      occurrence_date: occurrenceDate, // 분리된 인스턴스의 발생 날짜
    };

    // 원본 시간 저장 (모든 액션에서 공통)
    if (parentTodo.start_time) {
      newTodoData.original_start_time = parentTodo.start_time;
    }
    if (parentTodo.end_time) {
      newTodoData.original_end_time = parentTodo.end_time;
    }

    if (action === 'start_now') {
      // start_now: 현재 시간으로 즉시 시작 (exclusion + 독립 할일 생성)
      const now = new Date();
      newTodoData.schedule_type = 'timed';
      newTodoData.start_time = now.toISOString();

      // end_time 계산 (원본 duration 유지)
      if (parentTodo.start_time && parentTodo.end_time) {
        const originalStart = new Date(parentTodo.start_time);
        const originalEnd = new Date(parentTodo.end_time);
        const durationMs = originalEnd.getTime() - originalStart.getTime();
        newTodoData.end_time = new Date(now.getTime() + durationMs).toISOString();
      }

      console.log('⏱️ start_now 독립 할일 생성 중...', { startTime: newTodoData.start_time });
    } else if (action === 'anytime') {
      // anytime: schedule_type='anytime', 원래 시간 저장
      newTodoData.schedule_type = 'anytime';
      newTodoData.start_time = null;
      newTodoData.end_time = null;

      // originalStartTime 파라미터로 덮어쓰기 (제공된 경우)
      if (originalStartTime) {
        newTodoData.original_start_time = convertToISOTime(occurrenceDate, originalStartTime);
      }

      console.log('⏳ anytime 독립 할일 생성 중...');
    } else if (action === 'reschedule' && newTime) {
      // reschedule: 새 시간으로 timed 할일 생성
      newTodoData.schedule_type = 'timed';
      newTodoData.start_time = convertToISOTime(occurrenceDate, newTime);

      // end_time 계산 (원본 start_time, end_time 차이로 duration 계산)
      if (parentTodo.start_time && parentTodo.end_time) {
        const originalStart = new Date(parentTodo.start_time);
        const originalEnd = new Date(parentTodo.end_time);
        const durationMs = originalEnd.getTime() - originalStart.getTime();

        const newStartDate = new Date(newTodoData.start_time);
        newTodoData.end_time = new Date(newStartDate.getTime() + durationMs).toISOString();
      }

      console.log('📅 reschedule 독립 할일 생성 중...', { newTime });
    }

    // 4. 독립 할일 생성
    const newTodo = await createTodoWithJWT(newTodoData, userId);

    console.log('✅ 반복 할일 미루기 처리 완료:', { newTodoId: newTodo.id });
    return newTodo.id;

  } catch (error) {
    console.error('❌ 반복 할일 미루기 처리 실패:', error);
    throw error;
  }
}

/**
 * 시간 미정(anytime) 할일 목록 조회
 *
 * 새 아키텍처:
 * - todos 테이블에서 schedule_type='anytime' AND parent_recurring_todo_id IS NOT NULL 조회
 *
 * @param userId - 사용자 ID
 * @param date - 조회할 날짜 (YYYY-MM-DD) - 해당 날짜의 anytime 할일만
 * @returns AnytimeInboxItem 배열
 */
export async function queryAnytimeTodosWithJWT(
  userId: string,
  date?: string
): Promise<AnytimeInboxItem[]> {
  console.log('☁️ 시간 미정 할일 조회:', { userId, date });

  try {
    // todos 테이블에서 anytime 독립 할일 조회
    const conditions: QueryCondition[] = [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'schedule_type', operator: 'eq', value: 'anytime' },
      { column: 'parent_recurring_todo_id', operator: 'not.is', value: null },
      { column: 'completed', operator: 'eq', value: false },
    ];

    if (date) {
      conditions.push({ column: 'occurrence_date', operator: 'eq', value: date });
    }

    const todos = await queryRLSTableWithJWT('todos', conditions, {
      select: 'id, title, icon, color, original_start_time, occurrence_date, parent_recurring_todo_id, created_at',
      order: 'created_at.desc',
    });

    // AnytimeInboxItem 형태로 변환
    const result: AnytimeInboxItem[] = todos.map((todo: any) => ({
      id: todo.id,
      parentTodoId: todo.parent_recurring_todo_id,
      occurrenceDate: todo.occurrence_date,
      title: todo.title,
      icon: todo.icon,
      color: todo.color,
      originalStartTime: todo.original_start_time?.slice(11, 16), // HH:mm 추출
      postponedAt: todo.created_at,
      hasPostponementRecord: true, // exclusion과 함께 생성되므로 항상 true
    }));

    console.log('✅ 시간 미정 할일 조회 성공:', { count: result.length });
    return result;
  } catch (error) {
    console.error('❌ 시간 미정 할일 조회 실패:', error);
    return [];
  }
}

/**
 * Anytime 상태 해제 (시간 지정으로 복원)
 *
 * 새 아키텍처:
 * - 독립 할일의 schedule_type을 'timed'로 변경
 * - start_time 설정
 */
export async function restoreFromAnytimeWithJWT(params: {
  todoId: string; // 독립 할일 ID
  userId: string;
  newTime: string; // HH:mm
}): Promise<void> {
  const { todoId, userId, newTime } = params;

  console.log('⏰ anytime에서 시간 지정으로 복원:', {
    todoId,
    newTime,
  });

  try {
    // 독립 할일 정보 조회 (occurrence_date 필요)
    const todos = await queryRLSTableWithJWT('todos', [
      { column: 'id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId },
    ], {
      select: 'id, occurrence_date, anytime_duration'
    });

    if (!todos || todos.length === 0) {
      throw new Error(`할일을 찾을 수 없습니다: ${todoId}`);
    }

    const todo = todos[0];
    const newStartTime = convertToISOTime(todo.occurrence_date, newTime);

    // end_time 계산
    let newEndTime: string | undefined;
    if (todo.anytime_duration) {
      const startDate = new Date(newStartTime);
      startDate.setMinutes(startDate.getMinutes() + todo.anytime_duration);
      newEndTime = startDate.toISOString();
    }

    // 할일 업데이트
    await updateWithJWT('todos',
      { column: 'id', operator: 'eq', value: todoId },
      {
        schedule_type: 'timed',
        start_time: newStartTime,
        end_time: newEndTime,
      }
    );

    console.log('✅ anytime에서 시간 지정으로 복원 완료');
  } catch (error) {
    console.error('❌ anytime 복원 실패:', error);
    throw error;
  }
}

/**
 * Anytime 독립 할일 삭제 (원래 반복 할일 복원)
 *
 * 새 아키텍처:
 * - 독립 할일 삭제
 * - exclusion 삭제 (원본 반복 복원)
 */
export async function removeAnytimeOverrideWithJWT(params: {
  todoId: string; // 독립 할일 ID
  parentTodoId: string; // 원본 반복 할일 ID
  occurrenceDate: string; // YYYY-MM-DD
  userId: string;
}): Promise<void> {
  const { todoId, parentTodoId, occurrenceDate, userId } = params;

  console.log('🗑️ anytime 독립 할일 삭제 (원본 복원):', {
    todoId,
    parentTodoId,
    occurrenceDate,
  });

  try {
    // 1. 독립 할일 삭제
    await deleteTodoWithJWT(todoId);
    console.log('✅ 독립 할일 삭제 완료');

    // 2. exclusion 삭제 (원본 반복 복원)
    await deleteTodoExclusionWithJWT(parentTodoId, occurrenceDate, userId);
    console.log('✅ exclusion 삭제 완료 (원본 반복 복원)');

    console.log('✅ anytime 독립 할일 삭제 및 원본 복원 완료');
  } catch (error) {
    console.error('❌ anytime 삭제 실패:', error);
    throw error;
  }
}
