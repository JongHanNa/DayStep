/**
 * Projects CRUD 도구
 *
 * 프로젝트 관리
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type {
  CreateProjectInput,
  ListProjectsInput,
  GetProjectInput,
  UpdateProjectInput,
  DeleteProjectInput,
  CompleteProjectInput,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate } from '../utils/date.ts';
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

interface ProjectRow {
  id: string;
  title: string;
  status: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  icon?: string;
  color?: string;
}

function formatProject(project: ProjectRow): string {
  const status = getStatusEmoji(project.status);
  const endDate = project.end_date ? ` (~${formatDateKorean(project.end_date)})` : '';
  return `${status} ${project.title}${endDate} (ID: ${project.id})`;
}

// ============================================================================
// CRUD 구현
// ============================================================================

/**
 * 프로젝트 생성
 */
export async function createProject(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { title, goal_id, area_resource_id, description, start_date, end_date, status, icon, color } = input;

  if (!title) {
    return createErrorResult('title은 필수입니다.');
  }

  // 동적 날짜 해결
  const resolvedStartDate = resolveDate(start_date, dateContext);
  const resolvedEndDate = resolveDate(end_date, dateContext);

  // 최대 order_index 조회
  const { data: maxOrder } = await supabase
    .from('projects')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title,
      goal_id: goal_id || null,
      area_resource_id: area_resource_id || null,
      description: description || null,
      start_date: resolvedStartDate,
      end_date: resolvedEndDate,
      status: status || 'not_started',
      icon: icon || null,
      color: color || '#A8DADC',
      order_index: newOrderIndex,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    return createErrorResult(`생성 실패: ${error.message}`);
  }

  return createSuccessResult(`프로젝트 "${title}"이(가) 생성되었습니다.`, {
    id: data.id,
    title: data.title,
    status: data.status,
  });
}

/**
 * 프로젝트 목록 조회
 */
export async function listProjects(
  supabase: SupabaseClient,
  userId: string,
  input: ListProjectsInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { status, goal_id, area_resource_id, limit = 50, offset = 0 } = input;

  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }
  if (goal_id) {
    query = query.eq('goal_id', goal_id);
  }
  if (area_resource_id) {
    query = query.eq('area_resource_id', area_resource_id);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  return createListResult(data || [], formatProject, {
    title: '📁 프로젝트 목록',
    emptyMessage: '프로젝트가 없습니다.',
  });
}

/**
 * 프로젝트 상세 조회
 */
export async function getProject(
  supabase: SupabaseClient,
  userId: string,
  input: GetProjectInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, include_todos } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, goals(title), areas_resources(title)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 연결된 할일 조회
  let todosStr = '';
  if (include_todos) {
    const { data: todoProjects } = await supabase
      .from('todo_projects')
      .select('todos(id, title, completed, start_time)')
      .eq('project_id', id);

    const todos = todoProjects?.map((tp: any) => tp.todos).filter(Boolean) || [];

    if (todos.length > 0) {
      todosStr = '\n\n📋 연결된 할일:\n' + todos.map((t: any, i: number) => {
        const check = t.completed ? '✅' : '⬜';
        return `  ${i + 1}. ${check} ${t.title}`;
      }).join('\n');
    } else {
      todosStr = '\n\n📋 연결된 할일: 없음';
    }
  }

  const goalTitle = (data as any).goals?.title || '없음';
  const areaTitle = (data as any).areas_resources?.title || '없음';

  const details = `
📁 프로젝트 상세 정보

제목: ${data.title}
설명: ${data.description || '없음'}
상태: ${getStatusEmoji(data.status)} ${data.status}
시작일: ${formatDateKorean(data.start_date)}
종료일: ${formatDateKorean(data.end_date)}
연결된 목표: ${goalTitle}
연결된 책임/자원: ${areaTitle}
아이콘: ${data.icon || '없음'}
색상: ${data.color}
생성일: ${new Date(data.created_at).toLocaleDateString('ko-KR')}
ID: ${data.id}${todosStr}
`.trim();

  return {
    content: [{ type: 'text', text: details }],
    isError: false,
  };
}

/**
 * 프로젝트 수정
 */
export async function updateProject(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProjectInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, ...updates } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 업데이트 준비
  const validUpdates: Record<string, unknown> = {};

  if (updates.title !== undefined) validUpdates.title = updates.title;
  if (updates.description !== undefined) validUpdates.description = updates.description;
  if (updates.status !== undefined) validUpdates.status = updates.status;
  if (updates.icon !== undefined) validUpdates.icon = updates.icon;
  if (updates.color !== undefined) validUpdates.color = updates.color;
  if (updates.goal_id !== undefined) validUpdates.goal_id = updates.goal_id;
  if (updates.area_resource_id !== undefined) validUpdates.area_resource_id = updates.area_resource_id;

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
    .from('projects')
    .update(validUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createErrorResult(`수정 실패: ${error.message}`);
  }

  return createSuccessResult(`프로젝트 "${data.title}"이(가) 수정되었습니다.`);
}

/**
 * 프로젝트 삭제
 */
export async function deleteProject(
  supabase: SupabaseClient,
  userId: string,
  input: DeleteProjectInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, force } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('title')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 연결된 할일 확인
  const { count: todoCount } = await supabase
    .from('todo_projects')
    .select('id', { count: 'exact' })
    .eq('project_id', id);

  if ((todoCount || 0) > 0 && !force) {
    return createConfirmationRequired(
      `"${existing.title}"에 연결된 할일이 ${todoCount}개 있습니다.`,
      '삭제하면 할일과의 연결이 해제됩니다. force: true 옵션을 사용하여 다시 호출해주세요.'
    );
  }

  // 연결 해제
  if ((todoCount || 0) > 0) {
    await supabase.from('todo_projects').delete().eq('project_id', id);
  }

  // project_notes 연결 해제
  await supabase.from('project_notes').delete().eq('project_id', id);

  // 삭제
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return createErrorResult(`삭제 실패: ${error.message}`);
  }

  return createSuccessResult(`프로젝트 "${existing.title}"이(가) 삭제되었습니다.`);
}

/**
 * 프로젝트 완료
 */
export async function completeProject(
  supabase: SupabaseClient,
  userId: string,
  input: CompleteProjectInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('title, status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  if (existing.status === 'completed') {
    return createErrorResult('이미 완료된 프로젝트입니다.');
  }

  const { error } = await supabase
    .from('projects')
    .update({
      status: 'completed',
      is_completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`완료 처리 실패: ${error.message}`);
  }

  return createSuccessResult(`🎉 프로젝트 "${existing.title}"이(가) 완료되었습니다!`);
}
