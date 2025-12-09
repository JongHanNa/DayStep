/**
 * Todos CRUD 도구
 *
 * 할일 관리 (반복, 일정 타입, 명료화 포함)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type {
  CreateTodoInput,
  ListTodosInput,
  GetTodoInput,
  UpdateTodoInput,
  DeleteTodoInput,
  CompleteTodoInput,
  RescheduleTodoInput,
  SetTodoClarificationInput,
  RecurrenceConfig,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate, resolveDateTime, toKSTMidnight, addDays } from '../utils/date.ts';
import {
  createSuccessResult,
  createErrorResult,
  createListResult,
  createConfirmationRequired,
  getStatusEmoji,
  getPriorityEmoji,
  formatDateKorean,
  formatTimeKorean,
} from '../utils/response.ts';

// ============================================================================
// 포맷터
// ============================================================================

interface TodoRow {
  id: string;
  title: string;
  completed: boolean;
  schedule_type: string;
  start_time?: string;
  priority?: string;
  recurrence_pattern: string;
  clarification: string;
}

function formatTodo(todo: TodoRow): string {
  const check = todo.completed ? '✅' : '⬜';
  const priority = getPriorityEmoji(todo.priority);
  const time = todo.start_time ? ` (${formatTimeKorean(todo.start_time)})` : '';
  const recur = todo.recurrence_pattern !== 'none' ? ' 🔄' : '';
  return `${check} ${priority} ${todo.title}${time}${recur} (ID: ${todo.id})`;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

/**
 * 반복 설정을 DB 컬럼으로 변환
 */
function recurrenceToDbColumns(recurrence: RecurrenceConfig | null | undefined): Record<string, unknown> {
  if (!recurrence || recurrence.pattern === 'none') {
    return {
      recurrence_pattern: 'none',
      recurrence_interval: 1,
      recurrence_days_of_week: null,
      recurrence_day_of_month: null,
      recurrence_end_date: null,
      recurrence_count: null,
    };
  }

  return {
    recurrence_pattern: recurrence.pattern,
    recurrence_interval: recurrence.interval || 1,
    recurrence_days_of_week: recurrence.days_of_week || null,
    recurrence_day_of_month: recurrence.day_of_month || null,
    recurrence_end_date: recurrence.end_date || null,
    recurrence_count: recurrence.count || null,
  };
}

// ============================================================================
// CRUD 구현
// ============================================================================

/**
 * 할일 생성
 */
export async function createTodo(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTodoInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const {
    title,
    schedule_type,
    start_time,
    end_time,
    priority,
    project_ids,
    recurrence,
    clarification,
    is_today_highlight,
    icon,
    color,
    anytime_duration,
  } = input;

  if (!title) {
    return createErrorResult('title은 필수입니다.');
  }

  // 시간 처리
  let resolvedStartTime: string | null = null;
  let resolvedEndTime: string | null = null;
  const finalScheduleType = schedule_type || 'none';

  if (start_time) {
    if (finalScheduleType === 'timed') {
      // timed: 날짜 + 시간
      resolvedStartTime = typeof start_time === 'string' && start_time.includes('T')
        ? start_time
        : resolveDateTime(start_time, dateContext);
    } else if (finalScheduleType === 'anytime' || finalScheduleType === 'all_day') {
      // anytime/all_day: 날짜만 (자정)
      const dateOnly = resolveDate(start_time, dateContext);
      resolvedStartTime = dateOnly ? toKSTMidnight(dateOnly) : null;
    } else {
      // none: 날짜만
      const dateOnly = resolveDate(start_time, dateContext);
      resolvedStartTime = dateOnly ? toKSTMidnight(dateOnly) : null;
    }
  }

  if (end_time && finalScheduleType === 'timed') {
    resolvedEndTime = end_time;
  }

  // 반복 설정
  const recurrenceColumns = recurrenceToDbColumns(recurrence);

  // 최대 order_index 조회
  const { data: maxOrder } = await supabase
    .from('todos')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('todos')
    .insert({
      user_id: userId,
      title,
      schedule_type: finalScheduleType,
      start_time: resolvedStartTime,
      end_time: resolvedEndTime,
      priority: priority || 'medium',
      clarification: clarification || 'none',
      is_today_highlight: is_today_highlight || false,
      icon: icon || null,
      color: color || '#DBAC6C',
      anytime_duration: anytime_duration || null,
      order_index: newOrderIndex,
      completed: false,
      ...recurrenceColumns,
    })
    .select()
    .single();

  if (error) {
    return createErrorResult(`생성 실패: ${error.message}`);
  }

  // 프로젝트 연결
  if (project_ids && project_ids.length > 0) {
    const projectLinks = project_ids.map((projectId) => ({
      todo_id: data.id,
      project_id: projectId,
      user_id: userId,
    }));

    await supabase.from('todo_projects').insert(projectLinks);
  }

  const timeStr = resolvedStartTime ? ` (${formatDateKorean(resolvedStartTime)})` : '';
  const recurStr = recurrence && recurrence.pattern !== 'none' ? ' [반복]' : '';

  return createSuccessResult(`할일 "${title}"${timeStr}${recurStr}이(가) 생성되었습니다.`, {
    id: data.id,
    title: data.title,
    schedule_type: data.schedule_type,
    start_time: data.start_time,
  });
}

/**
 * 할일 목록 조회
 */
export async function listTodos(
  supabase: SupabaseClient,
  userId: string,
  input: ListTodosInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { date, date_range, completed, priority, clarification, project_id, schedule_type, limit = 50, offset = 0 } = input;

  let query = supabase
    .from('todos')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: true, nullsFirst: false })
    .order('order_index', { ascending: true });

  // 날짜 필터
  if (date) {
    const resolvedDate = resolveDate(date, dateContext);
    if (resolvedDate) {
      const dayStart = toKSTMidnight(resolvedDate);
      const dayEnd = toKSTMidnight(addDays(resolvedDate, 1));
      query = query.gte('start_time', dayStart).lt('start_time', dayEnd);
    }
  } else if (date_range) {
    const startDate = resolveDate(date_range.start, dateContext);
    const endDate = resolveDate(date_range.end, dateContext);
    if (startDate) {
      query = query.gte('start_time', toKSTMidnight(startDate));
    }
    if (endDate) {
      query = query.lt('start_time', toKSTMidnight(addDays(endDate, 1)));
    }
  }

  if (completed !== undefined) {
    query = query.eq('completed', completed);
  }
  if (priority) {
    query = query.eq('priority', priority);
  }
  if (clarification) {
    query = query.eq('clarification', clarification);
  }
  if (schedule_type) {
    query = query.eq('schedule_type', schedule_type);
  }

  // 프로젝트 필터 (별도 조회 필요)
  if (project_id) {
    const { data: todoProjects } = await supabase
      .from('todo_projects')
      .select('todo_id')
      .eq('project_id', project_id);

    const todoIds = todoProjects?.map((tp) => tp.todo_id) || [];
    if (todoIds.length === 0) {
      return createListResult([], formatTodo, {
        title: '📋 할일 목록',
        emptyMessage: '할일이 없습니다.',
      });
    }
    query = query.in('id', todoIds);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  let titleStr = '📋 할일 목록';
  if (date) {
    const resolvedDate = resolveDate(date, dateContext);
    titleStr = `📋 ${formatDateKorean(resolvedDate)} 할일`;
  }

  return createListResult(data || [], formatTodo, {
    title: titleStr,
    emptyMessage: '할일이 없습니다.',
  });
}

/**
 * 할일 상세 조회
 */
export async function getTodo(
  supabase: SupabaseClient,
  userId: string,
  input: GetTodoInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, include_projects } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  // 연결된 프로젝트 조회
  let projectsStr = '';
  if (include_projects) {
    const { data: todoProjects } = await supabase
      .from('todo_projects')
      .select('projects(id, title)')
      .eq('todo_id', id);

    const projects = todoProjects?.map((tp: any) => tp.projects).filter(Boolean) || [];

    if (projects.length > 0) {
      projectsStr = '\n연결된 프로젝트: ' + projects.map((p: any) => p.title).join(', ');
    } else {
      projectsStr = '\n연결된 프로젝트: 없음';
    }
  }

  const check = data.completed ? '✅ 완료' : '⬜ 미완료';
  const recurrence = data.recurrence_pattern !== 'none'
    ? `\n반복: ${data.recurrence_pattern} (간격: ${data.recurrence_interval})`
    : '';

  const details = `
📋 할일 상세 정보

제목: ${data.title}
상태: ${check}
우선순위: ${getPriorityEmoji(data.priority)} ${data.priority}
일정 타입: ${data.schedule_type}
시작 시간: ${formatDateKorean(data.start_time)} ${data.start_time ? formatTimeKorean(data.start_time) : ''}
종료 시간: ${formatDateKorean(data.end_time)} ${data.end_time ? formatTimeKorean(data.end_time) : ''}
명료화: ${getStatusEmoji(data.clarification)} ${data.clarification}
오늘 하이라이트: ${data.is_today_highlight ? '예' : '아니오'}${recurrence}${projectsStr}
아이콘: ${data.icon || '없음'}
색상: ${data.color}
생성일: ${new Date(data.created_at).toLocaleDateString('ko-KR')}
ID: ${data.id}
`.trim();

  return {
    content: [{ type: 'text', text: details }],
    isError: false,
  };
}

/**
 * 할일 수정
 */
export async function updateTodo(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateTodoInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, ...updates } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  // 업데이트 준비
  const validUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) validUpdates.title = updates.title;
  if (updates.schedule_type !== undefined) validUpdates.schedule_type = updates.schedule_type;
  if (updates.priority !== undefined) validUpdates.priority = updates.priority;
  if (updates.completed !== undefined) validUpdates.completed = updates.completed;
  if (updates.clarification !== undefined) validUpdates.clarification = updates.clarification;
  if (updates.is_today_highlight !== undefined) validUpdates.is_today_highlight = updates.is_today_highlight;
  if (updates.icon !== undefined) validUpdates.icon = updates.icon;
  if (updates.color !== undefined) validUpdates.color = updates.color;
  if (updates.anytime_duration !== undefined) validUpdates.anytime_duration = updates.anytime_duration;

  if (updates.start_time !== undefined) {
    if (updates.start_time === null) {
      validUpdates.start_time = null;
    } else {
      const scheduleType = updates.schedule_type || existing.schedule_type;
      if (scheduleType === 'timed') {
        validUpdates.start_time = updates.start_time;
      } else {
        const dateOnly = resolveDate(updates.start_time, dateContext);
        validUpdates.start_time = dateOnly ? toKSTMidnight(dateOnly) : null;
      }
    }
  }

  if (updates.end_time !== undefined) {
    validUpdates.end_time = updates.end_time;
  }

  if (updates.recurrence !== undefined) {
    const recurrenceColumns = recurrenceToDbColumns(updates.recurrence);
    Object.assign(validUpdates, recurrenceColumns);
  }

  if (Object.keys(validUpdates).length === 0) {
    return createErrorResult('수정할 항목이 없습니다.');
  }

  validUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('todos')
    .update(validUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createErrorResult(`수정 실패: ${error.message}`);
  }

  return createSuccessResult(`할일 "${data.title}"이(가) 수정되었습니다.`);
}

/**
 * 할일 삭제
 */
export async function deleteTodo(
  supabase: SupabaseClient,
  userId: string,
  input: DeleteTodoInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, permanent } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title, completed')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  // 미완료 항목 삭제 확인
  if (!existing.completed && !permanent) {
    return createConfirmationRequired(
      `"${existing.title}"은(는) 아직 완료되지 않은 할일입니다.`,
      '정말 삭제하시겠습니까? permanent: true 옵션을 사용하여 다시 호출해주세요.'
    );
  }

  // 연결 해제
  await supabase.from('todo_projects').delete().eq('todo_id', id);
  await supabase.from('todo_notes').delete().eq('todo_id', id);
  await supabase.from('todo_completions').delete().eq('todo_id', id);

  // 삭제
  const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return createErrorResult(`삭제 실패: ${error.message}`);
  }

  return createSuccessResult(`할일 "${existing.title}"이(가) 삭제되었습니다.`);
}

/**
 * 할일 완료 토글
 */
export async function completeTodo(
  supabase: SupabaseClient,
  userId: string,
  input: CompleteTodoInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, completed, completion_date } = input;

  if (!id || completed === undefined) {
    return createErrorResult('id와 completed는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title, recurrence_pattern')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  // 반복 할일의 특정 날짜 완료
  if (existing.recurrence_pattern !== 'none' && completion_date) {
    const resolvedDate = resolveDate(completion_date, dateContext);

    if (completed) {
      // todo_completions에 기록
      await supabase.from('todo_completions').upsert({
        todo_id: id,
        user_id: userId,
        completion_date: resolvedDate,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'todo_id,completion_date',
      });
    } else {
      // todo_completions에서 삭제
      await supabase
        .from('todo_completions')
        .delete()
        .eq('todo_id', id)
        .eq('completion_date', resolvedDate);
    }

    const statusText = completed ? '완료' : '미완료';
    return createSuccessResult(`"${existing.title}" (${formatDateKorean(resolvedDate)})이(가) ${statusText}로 변경되었습니다.`);
  }

  // 일반 할일 완료 토글
  const { error } = await supabase
    .from('todos')
    .update({ completed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`완료 상태 변경 실패: ${error.message}`);
  }

  const statusText = completed ? '✅ 완료' : '⬜ 미완료';
  return createSuccessResult(`"${existing.title}"이(가) ${statusText}로 변경되었습니다.`);
}

/**
 * 할일 일정 변경
 */
export async function rescheduleTodo(
  supabase: SupabaseClient,
  userId: string,
  input: RescheduleTodoInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, start_time, end_time, schedule_type } = input;

  if (!id || !start_time) {
    return createErrorResult('id와 start_time은 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title, schedule_type')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  const finalScheduleType = schedule_type || existing.schedule_type;
  let resolvedStartTime: string | null = null;

  if (finalScheduleType === 'timed') {
    resolvedStartTime = typeof start_time === 'string' && start_time.includes('T')
      ? start_time
      : resolveDateTime(start_time, dateContext);
  } else {
    const dateOnly = resolveDate(start_time, dateContext);
    resolvedStartTime = dateOnly ? toKSTMidnight(dateOnly) : null;
  }

  const updates: Record<string, unknown> = {
    start_time: resolvedStartTime,
    updated_at: new Date().toISOString(),
  };

  if (schedule_type) {
    updates.schedule_type = schedule_type;
  }
  if (end_time) {
    updates.end_time = end_time;
  }

  const { error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`일정 변경 실패: ${error.message}`);
  }

  return createSuccessResult(`"${existing.title}"의 일정이 ${formatDateKorean(resolvedStartTime)}(으)로 변경되었습니다.`);
}

/**
 * 할일 명료화 상태 변경
 */
export async function setTodoClarification(
  supabase: SupabaseClient,
  userId: string,
  input: SetTodoClarificationInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, clarification } = input;

  if (!id || !clarification) {
    return createErrorResult('id와 clarification은 필수입니다.');
  }

  const validClarifications = ['none', 'reminder', 'someday', 'waiting', 'next_action', 'schedule_clear'];
  if (!validClarifications.includes(clarification)) {
    return createErrorResult(`유효하지 않은 명료화 상태입니다. 가능한 값: ${validClarifications.join(', ')}`);
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  const { error } = await supabase
    .from('todos')
    .update({ clarification, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`명료화 변경 실패: ${error.message}`);
  }

  const clarificationLabels: Record<string, string> = {
    none: '없음',
    reminder: '리마인더',
    someday: '언젠가',
    waiting: '대기 중',
    next_action: '다음 행동',
    schedule_clear: '일정 확정',
  };

  return createSuccessResult(`"${existing.title}"의 명료화가 "${clarificationLabels[clarification]}"(으)로 변경되었습니다.`);
}
