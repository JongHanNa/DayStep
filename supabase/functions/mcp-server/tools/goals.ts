/**
 * Goals CRUD 도구
 *
 * 목표 관리 (연간/분기 목표 포함)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type {
  CreateGoalInput,
  ListGoalsInput,
  GetGoalInput,
  UpdateGoalInput,
  DeleteGoalInput,
  SetGoalStatusInput,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate, resolveYearGoal, resolveQuarterGoal, toKSTMidnight } from '../utils/date.ts';
import {
  createSuccessResult,
  createErrorResult,
  createListResult,
  createConfirmationRequired,
  getStatusEmoji,
  formatDateKorean,
} from '../utils/response.ts';

// ============================================================================
// 포맷터
// ============================================================================

interface GoalRow {
  id: string;
  title: string;
  status: string;
  year_goal?: number;
  quarter_goal?: string;
  start_date?: string;
  end_date?: string;
  icon?: string;
  color?: string;
}

function formatGoal(goal: GoalRow): string {
  const status = getStatusEmoji(goal.status);
  const period = goal.year_goal
    ? goal.quarter_goal
      ? `${goal.year_goal} ${goal.quarter_goal}`
      : `${goal.year_goal}년`
    : '';
  const periodStr = period ? ` [${period}]` : '';
  const endDate = goal.end_date ? ` (~${formatDateKorean(goal.end_date)})` : '';
  return `${status} ${goal.title}${periodStr}${endDate} (ID: ${goal.id})`;
}

// ============================================================================
// CRUD 구현
// ============================================================================

/**
 * 목표 생성
 */
export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: CreateGoalInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { title, year_goal, quarter_goal, area_resource_id, start_date, end_date, status, icon, color } = input;

  if (!title) {
    return createErrorResult('title은 필수입니다.');
  }

  // 동적 값 해결
  const resolvedYearGoal = resolveYearGoal(year_goal, dateContext);
  const resolvedQuarterGoal = resolveQuarterGoal(quarter_goal, dateContext);
  const resolvedStartDate = resolveDate(start_date, dateContext);
  const resolvedEndDate = resolveDate(end_date, dateContext);

  // 최대 order_index 조회
  const { data: maxOrder } = await supabase
    .from('goals')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      title,
      year_goal: resolvedYearGoal,
      quarter_goal: resolvedQuarterGoal,
      area_resource_id: area_resource_id || null,
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      status: status || 'not_started',
      icon: icon || 'lucide-Target',
      color: color || '#A8DADC',
      order_index: newOrderIndex,
    })
    .select()
    .single();

  if (error) {
    return createErrorResult(`생성 실패: ${error.message}`);
  }

  const periodStr = resolvedYearGoal
    ? resolvedQuarterGoal
      ? `(${resolvedYearGoal} ${resolvedQuarterGoal})`
      : `(${resolvedYearGoal}년)`
    : '';

  return createSuccessResult(`목표 "${title}" ${periodStr}이(가) 생성되었습니다.`, {
    id: data.id,
    title: data.title,
    year_goal: data.year_goal,
    quarter_goal: data.quarter_goal,
  });
}

/**
 * 목표 목록 조회
 */
export async function listGoals(
  supabase: SupabaseClient,
  userId: string,
  input: ListGoalsInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { status, year_goal, quarter_goal, area_resource_id, limit = 50, offset = 0 } = input;

  let query = supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('year_goal', { ascending: false, nullsFirst: false })
    .order('quarter_goal', { ascending: true })
    .order('order_index', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const resolvedYearGoal = resolveYearGoal(year_goal, dateContext);
  if (resolvedYearGoal) {
    query = query.eq('year_goal', resolvedYearGoal);
  }

  const resolvedQuarterGoal = resolveQuarterGoal(quarter_goal, dateContext);
  if (resolvedQuarterGoal) {
    query = query.eq('quarter_goal', resolvedQuarterGoal);
  }

  if (area_resource_id) {
    // 앱에서는 area_id(책임)와 resource_id(자원)를 별도 컬럼으로 사용
    query = query.or(`area_id.eq.${area_resource_id},resource_id.eq.${area_resource_id}`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  let titleStr = '🎯 목표 목록';
  if (resolvedYearGoal || resolvedQuarterGoal) {
    titleStr = `🎯 ${resolvedYearGoal || ''}년 ${resolvedQuarterGoal || ''} 목표 목록`;
  }

  return createListResult(data || [], formatGoal, {
    title: titleStr,
    emptyMessage: '목표가 없습니다.',
  });
}

/**
 * 목표 상세 조회
 */
export async function getGoal(
  supabase: SupabaseClient,
  userId: string,
  input: GetGoalInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, include_projects } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*, areas_resources(title)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createErrorResult('목표를 찾을 수 없습니다.');
  }

  // 연결된 프로젝트 조회
  let projectsStr = '';
  if (include_projects) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, status')
      .eq('goal_id', id)
      .order('order_index', { ascending: true });

    if (projects && projects.length > 0) {
      projectsStr = '\n\n📁 연결된 프로젝트:\n' + projects.map((p, i) => `  ${i + 1}. ${getStatusEmoji(p.status)} ${p.title}`).join('\n');
    } else {
      projectsStr = '\n\n📁 연결된 프로젝트: 없음';
    }
  }

  const periodStr = data.year_goal
    ? data.quarter_goal
      ? `${data.year_goal}년 ${data.quarter_goal}`
      : `${data.year_goal}년`
    : '미설정';

  const areaTitle = (data as any).areas_resources?.title || '없음';

  const details = `
🎯 목표 상세 정보

제목: ${data.title}
상태: ${getStatusEmoji(data.status)} ${data.status}
기간: ${periodStr}
시작일: ${formatDateKorean(data.start_date)}
종료일: ${formatDateKorean(data.end_date)}
연결된 책임/자원: ${areaTitle}
아이콘: ${data.icon || '없음'}
색상: ${data.color}
생성일: ${new Date(data.created_at).toLocaleDateString('ko-KR')}
ID: ${data.id}${projectsStr}
`.trim();

  return {
    content: [{ type: 'text', text: details }],
    isError: false,
  };
}

/**
 * 목표 수정
 */
export async function updateGoal(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateGoalInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, ...updates } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('목표를 찾을 수 없습니다.');
  }

  // 업데이트 준비
  const validUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) validUpdates.title = updates.title;
  if (updates.status !== undefined) validUpdates.status = updates.status;
  if (updates.icon !== undefined) validUpdates.icon = updates.icon;
  if (updates.color !== undefined) validUpdates.color = updates.color;

  if (updates.year_goal !== undefined) {
    validUpdates.year_goal = updates.year_goal;
  }
  if (updates.quarter_goal !== undefined) {
    validUpdates.quarter_goal = updates.quarter_goal;
  }
  if (updates.area_resource_id !== undefined) {
    validUpdates.area_resource_id = updates.area_resource_id;
  }

  if (updates.start_date !== undefined) {
    validUpdates.start_date = updates.start_date ? resolveDate(updates.start_date, dateContext) : null;
  }
  if (updates.end_date !== undefined) {
    validUpdates.end_date = updates.end_date ? resolveDate(updates.end_date, dateContext) : null;
  }

  if (Object.keys(validUpdates).length === 0) {
    return createErrorResult('수정할 항목이 없습니다.');
  }

  validUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('goals')
    .update(validUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createErrorResult(`수정 실패: ${error.message}`);
  }

  return createSuccessResult(`목표 "${data.title}"이(가) 수정되었습니다.`);
}

/**
 * 목표 삭제
 */
export async function deleteGoal(
  supabase: SupabaseClient,
  userId: string,
  input: DeleteGoalInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, force } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('goals')
    .select('title')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('목표를 찾을 수 없습니다.');
  }

  // 연결된 프로젝트 확인
  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('goal_id', id);

  if ((projectCount || 0) > 0 && !force) {
    return createConfirmationRequired(
      `"${existing.title}"에 연결된 프로젝트가 ${projectCount}개 있습니다.`,
      '삭제하면 프로젝트의 목표 연결이 해제됩니다. force: true 옵션을 사용하여 다시 호출해주세요.'
    );
  }

  // 연결 해제
  if ((projectCount || 0) > 0) {
    await supabase.from('projects').update({ goal_id: null }).eq('goal_id', id);
  }

  // 삭제
  const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return createErrorResult(`삭제 실패: ${error.message}`);
  }

  return createSuccessResult(`목표 "${existing.title}"이(가) 삭제되었습니다.`);
}

/**
 * 목표 상태 변경
 */
export async function setGoalStatus(
  supabase: SupabaseClient,
  userId: string,
  input: SetGoalStatusInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, status } = input;

  if (!id || !status) {
    return createErrorResult('id와 status는 필수입니다.');
  }

  const validStatuses = ['not_started', 'in_progress', 'paused', 'completed'];
  if (!validStatuses.includes(status)) {
    return createErrorResult(`유효하지 않은 상태입니다. 가능한 값: ${validStatuses.join(', ')}`);
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('goals')
    .select('title, status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('목표를 찾을 수 없습니다.');
  }

  if (existing.status === status) {
    return createErrorResult(`이미 "${status}" 상태입니다.`);
  }

  const { error } = await supabase
    .from('goals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`상태 변경 실패: ${error.message}`);
  }

  const statusLabels: Record<string, string> = {
    not_started: '시작 전',
    in_progress: '진행 중',
    paused: '일시 정지',
    completed: '완료',
  };

  return createSuccessResult(`목표 "${existing.title}"의 상태가 "${statusLabels[status]}"로 변경되었습니다.`);
}
