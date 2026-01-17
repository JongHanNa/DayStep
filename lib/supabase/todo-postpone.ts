/**
 * Todo Postpone - 반복 할일 미루기 처리 통합 모듈
 */

import { createTodoExclusionWithJWT } from './todo-exclusions';
import {
  createTimeOverrideWithJWT,
  updateTimeOverrideWithJWT,
  queryTimeOverridesWithJWT,
  deleteTimeOverrideWithJWT
} from './time-overrides';
import { queryRLSTableWithJWT } from './core';
import type { PostponeParams, AnytimeInboxItem } from '@/types';

/**
 * 미루기 처리 통합 함수
 *
 * @param params.action - 'reschedule' | 'anytime' | 'start_now'
 * @param params.recordPostponement - 미룸 기록 여부
 * @param params.newTime - HH:mm (reschedule인 경우)
 */
export async function postponeTodoInstance(params: PostponeParams): Promise<void> {
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
    // 1. 미룸 기록 (선택적)
    if (recordPostponement) {
      await createTodoExclusionWithJWT({
        parent_todo_id: parentTodoId,
        excluded_date: occurrenceDate,
        user_id: userId,
        exclusion_reason: 'postponed',
      });
      console.log('✅ 미룸 기록 생성 완료');
    }

    // 2. 시간 변경 (action에 따라)
    if (action === 'reschedule' && newTime) {
      // 특정 시간으로 변경
      await createOrUpdateTimeOverride({
        parentTodoId,
        occurrenceDate,
        userId,
        newTime,
      });
      console.log('✅ 시간 override 생성 완료:', newTime);
    } else if (action === 'anytime') {
      // anytime으로 변경 (시간 null + 메타데이터)
      await createAnytimeOverride({
        parentTodoId,
        occurrenceDate,
        userId,
        originalStartTime,
      });
      console.log('✅ anytime override 생성 완료');
    }
    // 'start_now'는 타이머 시작만 (별도 처리 - 호출 측에서 라우터 이동)

    console.log('✅ 반복 할일 미루기 처리 완료');
  } catch (error) {
    console.error('❌ 반복 할일 미루기 처리 실패:', error);
    throw error;
  }
}

/**
 * 시간 override 생성 또는 업데이트
 */
async function createOrUpdateTimeOverride(params: {
  parentTodoId: string;
  occurrenceDate: string;
  userId: string;
  newTime: string; // HH:mm
}): Promise<void> {
  const { parentTodoId, occurrenceDate, userId, newTime } = params;

  // HH:mm을 ISO string으로 변환 (해당 날짜 기준)
  const [hours, minutes] = newTime.split(':').map(Number);
  const dateObj = new Date(occurrenceDate);
  dateObj.setHours(hours, minutes, 0, 0);
  const isoStartTime = dateObj.toISOString();

  // 기존 override가 있는지 확인
  const existingOverrides = await queryTimeOverridesWithJWT(
    parentTodoId,
    userId,
    { start: occurrenceDate, end: occurrenceDate }
  );

  if (existingOverrides.length > 0) {
    // 업데이트
    await updateTimeOverrideWithJWT(parentTodoId, occurrenceDate, {
      start_time: isoStartTime,
    });
  } else {
    // 생성
    await createTimeOverrideWithJWT({
      parent_todo_id: parentTodoId,
      user_id: userId,
      override_date: occurrenceDate,
      start_time: isoStartTime,
    });
  }
}

/**
 * Anytime override 생성 (시간 미정)
 *
 * schedule_type을 'anytime'으로 변경하고 원래 시간을 메타데이터로 저장
 */
async function createAnytimeOverride(params: {
  parentTodoId: string;
  occurrenceDate: string;
  userId: string;
  originalStartTime?: string;
}): Promise<void> {
  const { parentTodoId, occurrenceDate, userId, originalStartTime } = params;

  // 기존 override가 있는지 확인
  const existingOverrides = await queryTimeOverridesWithJWT(
    parentTodoId,
    userId,
    { start: occurrenceDate, end: occurrenceDate }
  );

  // anytime override: start_time을 null로 설정하고 schedule_type 변경 효과
  // 실제로는 todo_overrides 테이블에 is_anytime 플래그 또는 start_time null로 처리
  // 여기서는 start_time을 특수 값으로 설정하여 anytime 표시
  // -> 실제 구현: start_time을 null 또는 'anytime' 마커로 처리

  const anytimeTitle = originalStartTime ? `__anytime__${originalStartTime}` : '__anytime__';

  if (existingOverrides.length > 0) {
    await updateTimeOverrideWithJWT(parentTodoId, occurrenceDate, {
      start_time: undefined, // anytime을 위해 시간 제거
      title: anytimeTitle,
    });
  } else {
    // anytime: start_time 없이 생성 (undefined로 처리)
    await createTimeOverrideWithJWT({
      parent_todo_id: parentTodoId,
      user_id: userId,
      override_date: occurrenceDate,
      // start_time 생략 = anytime
      title: anytimeTitle,
    });
  }
}

/**
 * 시간 미정(anytime) 할일 목록 조회
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
    // todo_overrides에서 anytime 항목 조회 (title이 '__anytime__'으로 시작)
    const overrides = await queryRLSTableWithJWT('todo_overrides', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId,
      },
      {
        column: 'title',
        operator: 'like',
        value: '__anytime__%',
      },
      ...(date ? [{
        column: 'override_date',
        operator: 'eq' as const,
        value: date,
      }] : []),
    ], {
      select: 'parent_todo_id, override_date, title, created_at',
      order: 'created_at.desc',
    });

    // parent_todo_id로 할일 정보 조회
    const todoIds = [...new Set(overrides.map((o: any) => o.parent_todo_id))];

    if (todoIds.length === 0) {
      return [];
    }

    // 할일 정보 조회
    const todos = await queryRLSTableWithJWT('todos', [
      {
        column: 'id',
        operator: 'in',
        value: `(${todoIds.map(id => `'${id}'`).join(',')})`,
      },
    ], {
      select: 'id, title, icon, color, start_time',
    });

    interface TodoInfo {
      id: string;
      title: string;
      icon?: string | null;
      color?: string | null;
      start_time?: string | null;
    }

    const todoMap = new Map<string, TodoInfo>(
      todos.map((t: TodoInfo) => [t.id, t])
    );

    // AnytimeInboxItem 형태로 변환
    const result: AnytimeInboxItem[] = overrides.map((override: any) => {
      const todo = todoMap.get(override.parent_todo_id);
      const originalTime = override.title?.replace('__anytime__', '') || undefined;

      return {
        parentTodoId: override.parent_todo_id,
        occurrenceDate: override.override_date,
        title: todo?.title || '알 수 없는 할일',
        icon: todo?.icon,
        color: todo?.color,
        originalStartTime: originalTime || todo?.start_time?.slice(11, 16),
        postponedAt: override.created_at,
        hasPostponementRecord: true, // 별도 조회 필요 시 추가
      };
    });

    console.log('✅ 시간 미정 할일 조회 성공:', { count: result.length });
    return result;
  } catch (error) {
    console.error('❌ 시간 미정 할일 조회 실패:', error);
    return [];
  }
}

/**
 * Anytime 상태 해제 (시간 지정으로 복원)
 */
export async function restoreFromAnytimeWithJWT(params: {
  parentTodoId: string;
  occurrenceDate: string;
  userId: string;
  newTime: string; // HH:mm
}): Promise<void> {
  const { parentTodoId, occurrenceDate, userId, newTime } = params;

  console.log('⏰ anytime에서 시간 지정으로 복원:', {
    parentTodoId,
    occurrenceDate,
    newTime,
  });

  // HH:mm을 ISO string으로 변환
  const [hours, minutes] = newTime.split(':').map(Number);
  const dateObj = new Date(occurrenceDate);
  dateObj.setHours(hours, minutes, 0, 0);
  const isoStartTime = dateObj.toISOString();

  await updateTimeOverrideWithJWT(parentTodoId, occurrenceDate, {
    start_time: isoStartTime,
    title: undefined, // anytime 마커 제거
  });

  console.log('✅ anytime에서 시간 지정으로 복원 완료');
}

/**
 * Anytime override 삭제 (원래 시간으로 복원)
 */
export async function removeAnytimeOverrideWithJWT(params: {
  parentTodoId: string;
  occurrenceDate: string;
  userId: string;
}): Promise<void> {
  const { parentTodoId, occurrenceDate, userId } = params;

  console.log('🗑️ anytime override 삭제:', {
    parentTodoId,
    occurrenceDate,
  });

  await deleteTimeOverrideWithJWT(parentTodoId, occurrenceDate, userId);

  console.log('✅ anytime override 삭제 완료');
}
