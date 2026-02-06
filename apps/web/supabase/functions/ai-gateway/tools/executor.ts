/**
 * Tool 실행기
 *
 * AI가 호출한 도구를 실제로 실행하고 결과 반환
 * 기존 MCP 서버의 도구 로직을 재사용
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { ToolCall, ToolResult } from '../types/index.ts';
import { getCurrentDateContext, resolveDate, toKSTMidnight } from './date-utils.ts';

// ============================================================================
// 도구 실행 메인 함수
// ============================================================================

/**
 * 도구 실행
 */
export async function executeTool(
  supabase: SupabaseClient,
  userId: string,
  toolCall: ToolCall
): Promise<ToolResult> {
  const { id, name, input } = toolCall;
  const dateContext = getCurrentDateContext();

  try {
    let result: string;

    switch (name) {
      case 'create_project_with_todos':
        result = await createProjectWithTodos(supabase, userId, input, dateContext);
        break;

      case 'list_projects':
        result = await listProjects(supabase, userId, input);
        break;

      case 'get_today_summary':
        result = await getTodaySummary(supabase, userId, input, dateContext);
        break;

      case 'create_todo':
        result = await createTodo(supabase, userId, input, dateContext);
        break;

      default:
        return {
          tool_use_id: id,
          content: `알 수 없는 도구: ${name}`,
          is_error: true,
        };
    }

    return {
      tool_use_id: id,
      content: result,
      is_error: false,
    };
  } catch (error) {
    console.error(`Tool execution error [${name}]:`, error);
    return {
      tool_use_id: id,
      content: `도구 실행 오류: ${error instanceof Error ? error.message : 'Unknown error'}`,
      is_error: true,
    };
  }
}

// ============================================================================
// 도구 구현
// ============================================================================

interface DateContext {
  today: string;
  currentYear: number;
  currentQuarter: string;
  timezone: string;
}

/**
 * 프로젝트와 할일 일괄 생성
 */
async function createProjectWithTodos(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
  dateContext: DateContext
): Promise<string> {
  const { project, todos } = input as {
    project: {
      title: string;
      description?: string;
      icon?: string;
      color?: string;
    };
    todos: Array<{
      title: string;
      start_time?: string;
      schedule_type?: string;
      priority?: string;
      anytime_duration?: number;
      subtasks?: Array<{ title: string; anytime_duration?: number }>;
    }>;
  };

  if (!project?.title) {
    throw new Error('프로젝트 제목이 필요합니다.');
  }

  if (!todos || todos.length === 0) {
    throw new Error('최소 1개 이상의 할일이 필요합니다.');
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
      status: 'not_started',
      source: 'mcp',
    })
    .select()
    .single();

  if (projectError) {
    throw new Error(`프로젝트 생성 실패: ${projectError.message}`);
  }

  const projectId = projectData.id;

  // 2. 할일 생성
  const todoInserts = todos.map((todo, index) => {
    let startTime: string | null = null;
    if (todo.start_time) {
      const resolved = resolveDate(todo.start_time, dateContext);
      if (resolved) {
        startTime = toKSTMidnight(resolved);
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
    // 롤백: 프로젝트 삭제
    await supabase.from('projects').delete().eq('id', projectId);
    throw new Error(`할일 생성 실패: ${todosError.message}`);
  }

  // 3. 서브태스크 생성
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
            anytime_duration: subtask.anytime_duration || 5,
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
    const { error: subtasksError } = await supabase.from('todos').insert(subtaskInserts);

    if (!subtasksError) {
      subtaskCount = subtaskInserts.length;
    }
  }

  const todoCount = todosData?.length || 0;

  let message = `✅ 프로젝트 "${project.title}"과(와) ${todoCount}개의 할일이 생성되었습니다.`;
  if (subtaskCount > 0) {
    message += ` (서브태스크 ${subtaskCount}개 포함)`;
  }

  return JSON.stringify({
    success: true,
    message,
    project: {
      id: projectId,
      title: project.title,
    },
    todos_count: todoCount,
    subtasks_count: subtaskCount,
  });
}

/**
 * 프로젝트 목록 조회
 */
async function listProjects(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>
): Promise<string> {
  const { status, limit = 20 } = input as { status?: string; limit?: number };

  let query = supabase
    .from('projects')
    .select('id, title, status, icon, color, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`프로젝트 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      success: true,
      message: '프로젝트가 없습니다.',
      projects: [],
    });
  }

  return JSON.stringify({
    success: true,
    message: `${data.length}개의 프로젝트를 찾았습니다.`,
    projects: data.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      icon: p.icon,
    })),
  });
}

/**
 * 오늘 요약 조회
 */
async function getTodaySummary(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
  dateContext: DateContext
): Promise<string> {
  const { include_overdue = true } = input as { include_overdue?: boolean };

  const todayStart = new Date(`${dateContext.today}T00:00:00+09:00`);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // 오늘 할일
  const { data: todayTodos, error: todayError } = await supabase
    .from('todos')
    .select('id, title, completed, priority, schedule_type')
    .eq('user_id', userId)
    .gte('start_time', todayStart.toISOString())
    .lt('start_time', todayEnd.toISOString())
    .order('order_index', { ascending: true });

  if (todayError) {
    throw new Error(`오늘 할일 조회 실패: ${todayError.message}`);
  }

  const completed = todayTodos?.filter((t) => t.completed).length || 0;
  const total = todayTodos?.length || 0;

  // 지연된 할일
  let overdueTodos: unknown[] = [];
  if (include_overdue) {
    const { data: overdue } = await supabase
      .from('todos')
      .select('id, title, start_time')
      .eq('user_id', userId)
      .eq('completed', false)
      .lt('start_time', todayStart.toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    overdueTodos = overdue || [];
  }

  return JSON.stringify({
    success: true,
    today: dateContext.today,
    summary: {
      total,
      completed,
      remaining: total - completed,
      completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
    overdue_count: overdueTodos.length,
    message: `오늘 ${total}개 중 ${completed}개 완료 (${
      total > 0 ? Math.round((completed / total) * 100) : 0
    }%)`,
  });
}

/**
 * 단일 할일 생성
 */
async function createTodo(
  supabase: SupabaseClient,
  userId: string,
  input: Record<string, unknown>,
  dateContext: DateContext
): Promise<string> {
  const { title, start_time, schedule_type, priority, project_id, anytime_duration } = input as {
    title: string;
    start_time?: string;
    schedule_type?: string;
    priority?: string;
    project_id?: string;
    anytime_duration?: number;
  };

  if (!title) {
    throw new Error('할일 제목이 필요합니다.');
  }

  let resolvedStartTime: string | null = null;
  if (start_time) {
    const resolved = resolveDate(start_time, dateContext);
    if (resolved) {
      resolvedStartTime = toKSTMidnight(resolved);
    }
  }

  const { data, error } = await supabase
    .from('todos')
    .insert({
      user_id: userId,
      title,
      start_time: resolvedStartTime,
      schedule_type: schedule_type || 'anytime',
      priority: priority || 'medium',
      project_id: project_id || null,
      anytime_duration: anytime_duration || null,
      completed: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`할일 생성 실패: ${error.message}`);
  }

  return JSON.stringify({
    success: true,
    message: `할일 "${title}"이(가) 생성되었습니다.`,
    todo: {
      id: data.id,
      title: data.title,
    },
  });
}
