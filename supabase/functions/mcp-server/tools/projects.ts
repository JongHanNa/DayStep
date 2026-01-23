/**
 * Projects CRUD 도구 (심플 버전 - AI 플래닝용)
 *
 * ADHD 친화적 AI 플래닝 기능을 위한 프로젝트 관리
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
  CreateProjectWithTodosInput,
  GetProjectProgressInput,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate } from '../utils/date.ts';
import {
  createSuccessResult,
  createErrorResult,
  createListResult,
  createConfirmationRequired,
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
  icon?: string;
  color?: string;
  created_at?: string;
}

function getProjectStatusEmoji(status: string): string {
  switch (status) {
    case 'active':
      return '🚀';
    case 'completed':
      return '✅';
    case 'abandoned':
      return '🗑️';
    default:
      return '📁';
  }
}

function formatProject(project: ProjectRow): string {
  const status = getProjectStatusEmoji(project.status);
  const icon = project.icon || '';
  return `${status} ${icon} ${project.title} (ID: ${project.id})`;
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
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { title, description, status, icon, color } = input;

  if (!title) {
    return createErrorResult('title은 필수입니다.');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      status: status || 'active',
      icon: icon || null,
      color: color || '#A8DADC',
      source: 'mcp', // MCP(AI)로 생성됨을 표시
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
  const { status, limit = 50, offset = 0 } = input;

  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
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
 * 프로젝트 상세 조회 (진행률 포함)
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
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 연결된 할일 조회 및 진행률 계산
  const { data: todos, error: todosError } = await supabase
    .from('todos')
    .select('id, title, completed, start_time, priority')
    .eq('project_id', id)
    .eq('user_id', userId)
    .order('start_time', { ascending: true });

  let todosStr = '';
  let progressStr = '';

  if (!todosError && todos) {
    const total = todos.length;
    const completed = todos.filter((t: any) => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressStr = `진행률: ${completed}/${total} (${progress}%)`;

    if (include_todos && todos.length > 0) {
      todosStr = '\n\n📋 연결된 할일:\n' + todos.map((t: any, i: number) => {
        const check = t.completed ? '✅' : '⬜';
        const priority = t.priority === 'high' ? '🔴' : t.priority === 'low' ? '🟢' : '';
        return `  ${i + 1}. ${check} ${priority} ${t.title}`;
      }).join('\n');
    } else if (include_todos) {
      todosStr = '\n\n📋 연결된 할일: 없음';
    }
  }

  const details = `
📁 프로젝트 상세 정보

제목: ${data.title}
설명: ${data.description || '없음'}
상태: ${getProjectStatusEmoji(data.status)} ${data.status}
${progressStr}
아이콘: ${data.icon || '없음'}
색상: ${data.color}
생성일: ${formatDateKorean(data.created_at)}
${data.completed_at ? `완료일: ${formatDateKorean(data.completed_at)}` : ''}
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
  _dateContext: DateContext
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

  if (Object.keys(validUpdates).length === 0) {
    return createErrorResult('수정할 항목이 없습니다.');
  }

  // 완료 상태로 변경 시 completed_at 설정
  if (updates.status === 'completed' && existing.status !== 'completed') {
    validUpdates.completed_at = new Date().toISOString();
  }

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
    .from('todos')
    .select('id', { count: 'exact' })
    .eq('project_id', id);

  if ((todoCount || 0) > 0 && !force) {
    return createConfirmationRequired(
      `"${existing.title}"에 연결된 할일이 ${todoCount}개 있습니다.`,
      '삭제하면 할일의 프로젝트 연결이 해제됩니다. force: true 옵션을 사용하여 다시 호출해주세요.'
    );
  }

  // 연결된 할일의 project_id를 null로 설정
  if ((todoCount || 0) > 0) {
    await supabase
      .from('todos')
      .update({ project_id: null })
      .eq('project_id', id);
  }

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
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`완료 처리 실패: ${error.message}`);
  }

  return createSuccessResult(`🎉 프로젝트 "${existing.title}"이(가) 완료되었습니다!`);
}

// ============================================================================
// 신규 도구 (AI 플래닝용)
// ============================================================================

/**
 * 프로젝트와 할일을 일괄 생성 (AI 플래닝 결과)
 * 서브태스크 지원: ADHD용 "바보같이 작게 쪼개기" 기능
 */
export async function createProjectWithTodos(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProjectWithTodosInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { project, todos } = input;

  if (!project?.title) {
    return createErrorResult('project.title은 필수입니다.');
  }

  if (!todos || todos.length === 0) {
    return createErrorResult('최소 1개 이상의 할일이 필요합니다.');
  }

  // 1. 프로젝트 생성
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: project.title,
      description: project.description || null,
      icon: project.icon || null,
      color: project.color || '#A8DADC',
      status: 'active',
      source: 'mcp', // MCP(AI)로 생성됨을 표시
    })
    .select()
    .single();

  if (projectError) {
    return createErrorResult(`프로젝트 생성 실패: ${projectError.message}`);
  }

  const projectId = projectData.id;

  // 2. 부모 할일 일괄 생성
  const todoInserts = todos.map((todo, index) => {
    // 날짜 해석
    let startTime: string | null = null;
    if (todo.start_time) {
      startTime = resolveDate(todo.start_time, dateContext);
      if (startTime) {
        // 시간이 없으면 자정으로 설정
        const date = new Date(startTime);
        if (date.getHours() === 0 && date.getMinutes() === 0) {
          date.setHours(9, 0, 0, 0); // 기본 시작 시간: 오전 9시
        }
        startTime = date.toISOString();
      }
    }

    return {
      user_id: userId,
      title: todo.title,
      project_id: projectId,
      start_time: startTime,
      schedule_type: todo.schedule_type || 'anytime',
      priority: todo.priority || 'medium',
      anytime_duration: todo.anytime_duration || null,
      order_index: index,
      completed: false,
    };
  });

  const { data: todosData, error: todosError } = await supabase
    .from('todos')
    .insert(todoInserts)
    .select();

  if (todosError) {
    // 롤백: 프로젝트도 삭제
    await supabase.from('projects').delete().eq('id', projectId);
    return createErrorResult(`할일 생성 실패: ${todosError.message}`);
  }

  // 3. 서브태스크 생성 (있는 경우)
  let subtaskCount = 0;
  const subtaskInserts: Array<{
    user_id: string;
    title: string;
    parent_todo_id: string;
    project_id: string;
    schedule_type: string;
    anytime_duration: number;
    recurrence_pattern: string;
    order_index: number;
    completed: boolean;
    priority: string;
  }> = [];

  // 부모 할일 ID와 입력 데이터 매핑
  todos.forEach((todo, todoIndex) => {
    if (todo.subtasks && todo.subtasks.length > 0) {
      const parentTodo = todosData?.[todoIndex];
      if (parentTodo) {
        todo.subtasks.forEach((subtask, subtaskIndex) => {
          subtaskInserts.push({
            user_id: userId,
            title: subtask.title,
            parent_todo_id: parentTodo.id,
            project_id: projectId,
            schedule_type: 'anytime',
            anytime_duration: subtask.anytime_duration || 5, // 기본값 5분
            recurrence_pattern: 'none',
            order_index: subtaskIndex,
            completed: false,
            priority: 'medium',
          });
        });
      }
    }
  });

  if (subtaskInserts.length > 0) {
    const { error: subtasksError } = await supabase
      .from('todos')
      .insert(subtaskInserts);

    if (subtasksError) {
      console.error('서브태스크 생성 실패:', subtasksError);
      // 서브태스크 실패는 전체 롤백하지 않음 (부모 할일은 유지)
    } else {
      subtaskCount = subtaskInserts.length;
    }
  }

  const todoCount = todosData?.length || 0;

  // 응답 메시지 구성
  let message = `✅ 프로젝트 "${project.title}"과(와) ${todoCount}개의 할일이 생성되었습니다.`;
  if (subtaskCount > 0) {
    message += ` (서브태스크 ${subtaskCount}개 포함)`;
  }

  return createSuccessResult(message, {
    project: {
      id: projectId,
      title: project.title,
      status: 'active',
      color: projectData.color,
      icon: projectData.icon,
    },
    todos: todosData?.map((t: any, index: number) => ({
      id: t.id,
      title: t.title,
      start_time: t.start_time,
      schedule_type: t.schedule_type,
      subtask_count: todos[index]?.subtasks?.length || 0,
    })),
    total_subtasks: subtaskCount,
  });
}

/**
 * 프로젝트 진행률 조회
 */
export async function getProjectProgress(
  supabase: SupabaseClient,
  userId: string,
  input: GetProjectProgressInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { project_id } = input;

  if (!project_id) {
    return createErrorResult('project_id는 필수입니다.');
  }

  // 프로젝트 확인
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('id', project_id)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 할일 통계 조회
  const { data: todos, error: todosError } = await supabase
    .from('todos')
    .select('id, completed')
    .eq('project_id', project_id)
    .eq('user_id', userId);

  if (todosError) {
    return createErrorResult(`할일 조회 실패: ${todosError.message}`);
  }

  const total = todos?.length || 0;
  const completed = todos?.filter((t: any) => t.completed).length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const progressBar = generateProgressBar(progress);

  const details = `
📊 "${project.title}" 진행률

${progressBar} ${progress}%

완료: ${completed}개 / 전체: ${total}개
상태: ${getProjectStatusEmoji(project.status)} ${project.status}
`.trim();

  return {
    content: [{ type: 'text', text: details }],
    isError: false,
  };
}

/**
 * 진행률 막대 생성
 */
function generateProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
