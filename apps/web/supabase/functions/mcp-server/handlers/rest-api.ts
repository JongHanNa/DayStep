/**
 * REST API 핸들러
 *
 * ChatGPT Actions 호환 REST API 엔드포인트
 * 기존 MCP 도구를 재사용하여 REST API로 노출
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type {
  RestListResponse,
  RestErrorResponse,
  TodoResponse,
  CreateTodoRequest,
  UpdateTodoRequest,
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectWithTodosRequest,
} from '../types/mcp.ts';
import { createJsonResponse, createHttpErrorResponse } from '../utils/response.ts';
import { getCurrentDateContext, resolveDate, toKSTMidnight, addDays } from '../utils/date.ts';

// ============================================================================
// 입력 검증 유틸리티
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

const SCHEDULE_TYPES = ['none', 'timed', 'anytime', 'all_day'] as const;
const PROJECT_STATUSES = ['active', 'completed', 'archived'] as const;

function isValidScheduleType(value: string): boolean {
  return (SCHEDULE_TYPES as readonly string[]).includes(value);
}

function isValidProjectStatus(value: string): boolean {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

function sanitizeString(value: string, maxLength: number = 1000): string {
  return value.slice(0, maxLength);
}

function parsePositiveInt(value: string | null, defaultValue: number, max: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) return defaultValue;
  return Math.min(parsed, max);
}

// ============================================================================
// 응답 헬퍼
// ============================================================================

function createRestErrorResponse(status: number, message: string, details?: unknown): Response {
  const body: RestErrorResponse = {
    error: {
      code: status,
      message,
      details,
    },
  };
  return createJsonResponse(body, status);
}

// ============================================================================
// Todos REST API 핸들러
// ============================================================================

/**
 * GET /api/v1/todos - 할일 목록 조회
 */
export async function handleListTodos(
  req: Request,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const url = new URL(req.url);
  const dateContext = getCurrentDateContext();

  // 쿼리 파라미터 파싱 + 검증
  const date = url.searchParams.get('date');
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const completed = url.searchParams.get('completed');
  const projectId = url.searchParams.get('project_id');
  const scheduleType = url.searchParams.get('schedule_type');
  const limit = parsePositiveInt(url.searchParams.get('limit'), 50, 100);
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0, 10000);

  // UUID 형식 검증
  if (projectId && !isValidUUID(projectId)) {
    return createRestErrorResponse(400, 'project_id는 유효한 UUID 형식이어야 합니다.');
  }

  // enum 검증
  if (scheduleType && !isValidScheduleType(scheduleType)) {
    return createRestErrorResponse(400, `schedule_type은 ${SCHEDULE_TYPES.join(', ')} 중 하나여야 합니다.`);
  }

  let query = supabase
    .from('todos')
    .select('*', { count: 'exact' })
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
  } else if (startDate || endDate) {
    if (startDate) {
      const resolved = resolveDate(startDate, dateContext);
      if (resolved) {
        query = query.gte('start_time', toKSTMidnight(resolved));
      }
    }
    if (endDate) {
      const resolved = resolveDate(endDate, dateContext);
      if (resolved) {
        query = query.lt('start_time', toKSTMidnight(addDays(resolved, 1)));
      }
    }
  }

  // 기타 필터
  if (completed !== null) {
    query = query.eq('completed', completed === 'true');
  }
  if (projectId) {
    query = query.eq('project_id', projectId);
  }
  if (scheduleType) {
    query = query.eq('schedule_type', scheduleType);
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return createRestErrorResponse(500, `조회 실패: ${error.message}`);
  }

  const response: RestListResponse<TodoResponse> = {
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  };

  return createJsonResponse(response);
}

/**
 * POST /api/v1/todos - 할일 생성
 */
export async function handleCreateTodo(
  req: Request,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const dateContext = getCurrentDateContext();

  let body: CreateTodoRequest;
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  if (!body.title || typeof body.title !== 'string') {
    return createRestErrorResponse(400, 'title은 필수 문자열입니다.');
  }
  body.title = sanitizeString(body.title, 500);

  if (body.schedule_type && !isValidScheduleType(body.schedule_type)) {
    return createRestErrorResponse(400, `schedule_type은 ${SCHEDULE_TYPES.join(', ')} 중 하나여야 합니다.`);
  }

  if (body.project_id && !isValidUUID(body.project_id)) {
    return createRestErrorResponse(400, 'project_id는 유효한 UUID 형식이어야 합니다.');
  }

  // 시간 처리
  let resolvedStartTime: string | null = null;
  let resolvedEndTime: string | null = null;
  const scheduleType = body.schedule_type || 'none';

  if (body.start_time) {
    if (scheduleType === 'timed') {
      // timed: ISO datetime 그대로 사용
      resolvedStartTime = body.start_time;
    } else {
      // anytime/all_day/none: 날짜만 (자정)
      const dateOnly = resolveDate(body.start_time, dateContext);
      resolvedStartTime = dateOnly ? toKSTMidnight(dateOnly) : null;
    }
  }

  if (body.end_time && scheduleType === 'timed') {
    resolvedEndTime = body.end_time;
  }

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
      title: body.title,
      schedule_type: scheduleType,
      start_time: resolvedStartTime,
      end_time: resolvedEndTime,
      is_today_highlight: body.is_today_highlight || false,
      icon: body.icon || null,
      color: body.color || '#DBAC6C',
      anytime_duration: body.anytime_duration || null,
      order_index: newOrderIndex,
      completed: false,
      project_id: body.project_id || null,
      recurrence_pattern: 'none',
    })
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `생성 실패: ${error.message}`);
  }

  return createJsonResponse(data, 201);
}

/**
 * GET /api/v1/todos/:id - 할일 상세 조회
 */
export async function handleGetTodo(
  _req: Request,
  supabase: SupabaseClient,
  userId: string,
  todoId: string
): Promise<Response> {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createRestErrorResponse(404, '할일을 찾을 수 없습니다.');
  }

  return createJsonResponse(data);
}

/**
 * PATCH /api/v1/todos/:id - 할일 수정
 */
export async function handleUpdateTodo(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  todoId: string
): Promise<Response> {
  const dateContext = getCurrentDateContext();

  let body: UpdateTodoRequest;
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('*')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '할일을 찾을 수 없습니다.');
  }

  // 업데이트 준비
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.schedule_type !== undefined) updates.schedule_type = body.schedule_type;
  if (body.completed !== undefined) updates.completed = body.completed;
  if (body.is_today_highlight !== undefined) updates.is_today_highlight = body.is_today_highlight;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;
  if (body.anytime_duration !== undefined) updates.anytime_duration = body.anytime_duration;
  if (body.project_id !== undefined) updates.project_id = body.project_id;

  if (body.start_time !== undefined) {
    if (body.start_time === null) {
      updates.start_time = null;
    } else {
      const scheduleType = body.schedule_type || existing.schedule_type;
      if (scheduleType === 'timed') {
        updates.start_time = body.start_time;
      } else {
        const dateOnly = resolveDate(body.start_time, dateContext);
        updates.start_time = dateOnly ? toKSTMidnight(dateOnly) : null;
      }
    }
  }

  if (body.end_time !== undefined) {
    updates.end_time = body.end_time;
  }

  if (Object.keys(updates).length === 0) {
    return createRestErrorResponse(400, '수정할 항목이 없습니다.');
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `수정 실패: ${error.message}`);
  }

  return createJsonResponse(data);
}

/**
 * DELETE /api/v1/todos/:id - 할일 삭제
 */
export async function handleDeleteTodo(
  _req: Request,
  supabase: SupabaseClient,
  userId: string,
  todoId: string
): Promise<Response> {
  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '할일을 찾을 수 없습니다.');
  }

  // 관련 데이터 삭제
  await supabase.from('todo_motivations').delete().eq('todo_id', todoId);
  await supabase.from('todo_completions').delete().eq('todo_id', todoId);

  // 삭제
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId);

  if (error) {
    return createRestErrorResponse(500, `삭제 실패: ${error.message}`);
  }

  return new Response(null, { status: 204 });
}

/**
 * POST /api/v1/todos/:id/complete - 할일 완료 토글
 */
export async function handleCompleteTodo(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  todoId: string
): Promise<Response> {
  let body: { completed: boolean };
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  if (body.completed === undefined) {
    return createRestErrorResponse(400, 'completed는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todos')
    .select('title')
    .eq('id', todoId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '할일을 찾을 수 없습니다.');
  }

  const { data, error } = await supabase
    .from('todos')
    .update({
      completed: body.completed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `완료 상태 변경 실패: ${error.message}`);
  }

  return createJsonResponse(data);
}

// ============================================================================
// Projects REST API 핸들러
// ============================================================================

/**
 * GET /api/v1/projects - 프로젝트 목록 조회
 */
export async function handleListProjects(
  req: Request,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const url = new URL(req.url);

  // 쿼리 파라미터 파싱 + 검증
  const status = url.searchParams.get('status');
  const limit = parsePositiveInt(url.searchParams.get('limit'), 50, 100);
  const offset = parsePositiveInt(url.searchParams.get('offset'), 0, 10000);

  if (status && !isValidProjectStatus(status)) {
    return createRestErrorResponse(400, `status는 ${PROJECT_STATUSES.join(', ')} 중 하나여야 합니다.`);
  }

  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('order_index', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return createRestErrorResponse(500, `조회 실패: ${error.message}`);
  }

  const response: RestListResponse<ProjectResponse> = {
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  };

  return createJsonResponse(response);
}

/**
 * POST /api/v1/projects - 프로젝트 생성
 */
export async function handleCreateProject(
  req: Request,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  let body: CreateProjectRequest;
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  if (!body.title || typeof body.title !== 'string') {
    return createRestErrorResponse(400, 'title은 필수 문자열입니다.');
  }
  body.title = sanitizeString(body.title, 200);

  if (body.description && typeof body.description === 'string') {
    body.description = sanitizeString(body.description, 2000);
  }

  if (body.status && !isValidProjectStatus(body.status)) {
    return createRestErrorResponse(400, `status는 ${PROJECT_STATUSES.join(', ')} 중 하나여야 합니다.`);
  }

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
      title: body.title,
      description: body.description || null,
      status: body.status || 'active',
      icon: body.icon || null,
      color: body.color || '#A8DADC',
      order_index: newOrderIndex,
    })
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `생성 실패: ${error.message}`);
  }

  return createJsonResponse(data, 201);
}

/**
 * GET /api/v1/projects/:id - 프로젝트 상세 조회
 */
export async function handleGetProject(
  _req: Request,
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<Response> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createRestErrorResponse(404, '프로젝트를 찾을 수 없습니다.');
  }

  return createJsonResponse(data);
}

/**
 * PATCH /api/v1/projects/:id - 프로젝트 수정
 */
export async function handleUpdateProject(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<Response> {
  let body: UpdateProjectRequest;
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '프로젝트를 찾을 수 없습니다.');
  }

  // 업데이트 준비
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;

  if (Object.keys(updates).length === 0) {
    return createRestErrorResponse(400, '수정할 항목이 없습니다.');
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `수정 실패: ${error.message}`);
  }

  return createJsonResponse(data);
}

/**
 * DELETE /api/v1/projects/:id - 프로젝트 삭제
 */
export async function handleDeleteProject(
  _req: Request,
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<Response> {
  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '프로젝트를 찾을 수 없습니다.');
  }

  // 프로젝트와 할일 연결 해제
  await supabase.from('todo_projects').delete().eq('project_id', projectId);

  // 삭제
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('user_id', userId);

  if (error) {
    return createRestErrorResponse(500, `삭제 실패: ${error.message}`);
  }

  return new Response(null, { status: 204 });
}

/**
 * POST /api/v1/projects/:id/complete - 프로젝트 완료
 */
export async function handleCompleteProject(
  _req: Request,
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<Response> {
  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createRestErrorResponse(404, '프로젝트를 찾을 수 없습니다.');
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createRestErrorResponse(500, `완료 처리 실패: ${error.message}`);
  }

  return createJsonResponse(data);
}

/**
 * POST /api/v1/projects/with-todos - 프로젝트와 할일 일괄 생성
 */
export async function handleCreateProjectWithTodos(
  req: Request,
  supabase: SupabaseClient,
  userId: string
): Promise<Response> {
  const dateContext = getCurrentDateContext();

  let body: CreateProjectWithTodosRequest;
  try {
    body = await req.json();
  } catch {
    return createRestErrorResponse(400, '유효하지 않은 JSON 요청입니다.');
  }

  if (!body.project?.title) {
    return createRestErrorResponse(400, 'project.title은 필수입니다.');
  }

  if (!body.todos || body.todos.length === 0) {
    return createRestErrorResponse(400, 'todos는 최소 1개 이상 필요합니다.');
  }

  try {
    // 1. 프로젝트 생성
    const { data: maxProjectOrder } = await supabase
      .from('projects')
      .select('order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: false })
      .limit(1)
      .single();

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: body.project.title,
        description: body.project.description || null,
        status: 'active',
        icon: body.project.icon || null,
        color: body.project.color || '#A8DADC',
        order_index: (maxProjectOrder?.order_index ?? -1) + 1,
      })
      .select()
      .single();

    if (projectError) {
      return createRestErrorResponse(500, `프로젝트 생성 실패: ${projectError.message}`);
    }

    // 2. 할일들 생성
    const createdTodos: TodoResponse[] = [];

    for (let i = 0; i < body.todos.length; i++) {
      const todoInput = body.todos[i];

      // 시간 처리
      let resolvedStartTime: string | null = null;
      const scheduleType = todoInput.schedule_type || 'anytime';

      if (todoInput.start_time) {
        const dateOnly = resolveDate(todoInput.start_time, dateContext);
        resolvedStartTime = dateOnly ? toKSTMidnight(dateOnly) : null;
      } else {
        // 기본값: 오늘부터 시작
        const todoDate = new Date(dateContext.today);
        todoDate.setDate(todoDate.getDate() + i);
        resolvedStartTime = toKSTMidnight(todoDate.toISOString().split('T')[0]);
      }

      // 최대 order_index 조회
      const { data: maxTodoOrder } = await supabase
        .from('todos')
        .select('order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const { data: todo, error: todoError } = await supabase
        .from('todos')
        .insert({
          user_id: userId,
          title: todoInput.title,
          schedule_type: scheduleType,
          start_time: resolvedStartTime,
          anytime_duration: todoInput.anytime_duration || null,
          icon: null,
          color: '#DBAC6C',
          order_index: (maxTodoOrder?.order_index ?? -1) + 1,
          completed: false,
          recurrence_pattern: 'none',
        })
        .select()
        .single();

      if (todoError) {
        console.error(`Todo 생성 실패: ${todoError.message}`);
        continue;
      }

      // 프로젝트와 연결
      await supabase.from('todo_projects').insert({
        todo_id: todo.id,
        project_id: project.id,
      });

      // 서브태스크 생성
      if (todoInput.subtasks && todoInput.subtasks.length > 0) {
        for (let j = 0; j < todoInput.subtasks.length; j++) {
          const subtask = todoInput.subtasks[j];
          await supabase.from('subtasks').insert({
            todo_id: todo.id,
            title: subtask.title,
            completed: false,
            order_index: j,
          });
        }
      }

      createdTodos.push(todo);
    }

    return createJsonResponse({
      project,
      todos: createdTodos,
    }, 201);
  } catch (error) {
    return createRestErrorResponse(500, `생성 실패: ${(error as Error).message}`);
  }
}

// ============================================================================
// REST API 라우터
// ============================================================================

/**
 * REST API 라우터
 */
export async function handleRestApi(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  apiPath: string
): Promise<Response> {
  const method = req.method;

  // /api/v1/todos
  if (apiPath === 'todos' || apiPath === 'todos/') {
    if (method === 'GET') {
      return handleListTodos(req, supabase, userId);
    }
    if (method === 'POST') {
      return handleCreateTodo(req, supabase, userId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/todos/:id
  const todosMatch = apiPath.match(/^todos\/([^/]+)$/);
  if (todosMatch) {
    const todoId = todosMatch[1];
    if (!isValidUUID(todoId)) {
      return createRestErrorResponse(400, 'todo ID는 유효한 UUID 형식이어야 합니다.');
    }
    if (method === 'GET') {
      return handleGetTodo(req, supabase, userId, todoId);
    }
    if (method === 'PATCH') {
      return handleUpdateTodo(req, supabase, userId, todoId);
    }
    if (method === 'DELETE') {
      return handleDeleteTodo(req, supabase, userId, todoId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/todos/:id/complete
  const completeMatch = apiPath.match(/^todos\/([^/]+)\/complete$/);
  if (completeMatch) {
    const todoId = completeMatch[1];
    if (!isValidUUID(todoId)) {
      return createRestErrorResponse(400, 'todo ID는 유효한 UUID 형식이어야 합니다.');
    }
    if (method === 'POST') {
      return handleCompleteTodo(req, supabase, userId, todoId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/projects
  if (apiPath === 'projects' || apiPath === 'projects/') {
    if (method === 'GET') {
      return handleListProjects(req, supabase, userId);
    }
    if (method === 'POST') {
      return handleCreateProject(req, supabase, userId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/projects/with-todos (일괄 생성 - :id보다 먼저 매칭)
  if (apiPath === 'projects/with-todos') {
    if (method === 'POST') {
      return handleCreateProjectWithTodos(req, supabase, userId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/projects/:id
  const projectsMatch = apiPath.match(/^projects\/([^/]+)$/);
  if (projectsMatch) {
    const projectId = projectsMatch[1];
    if (!isValidUUID(projectId)) {
      return createRestErrorResponse(400, 'project ID는 유효한 UUID 형식이어야 합니다.');
    }
    if (method === 'GET') {
      return handleGetProject(req, supabase, userId, projectId);
    }
    if (method === 'PATCH') {
      return handleUpdateProject(req, supabase, userId, projectId);
    }
    if (method === 'DELETE') {
      return handleDeleteProject(req, supabase, userId, projectId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  // /api/v1/projects/:id/complete
  const projectCompleteMatch = apiPath.match(/^projects\/([^/]+)\/complete$/);
  if (projectCompleteMatch) {
    const projectId = projectCompleteMatch[1];
    if (!isValidUUID(projectId)) {
      return createRestErrorResponse(400, 'project ID는 유효한 UUID 형식이어야 합니다.');
    }
    if (method === 'POST') {
      return handleCompleteProject(req, supabase, userId, projectId);
    }
    return createHttpErrorResponse(405, -32600, 'Method not allowed');
  }

  return createHttpErrorResponse(404, -32601, 'Endpoint not found');
}
