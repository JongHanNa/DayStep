/**
 * 관계 및 특수 도구
 *
 * 할일-프로젝트 연결, 요약, 검색, 템플릿 등
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type {
  LinkTodoToProjectInput,
  UnlinkTodoFromProjectInput,
  GetTodaySummaryInput,
  GetWeeklyReviewInput,
  CreatePlanFromTemplateInput,
  BulkRescheduleInput,
  SearchItemsInput,
  GetInboxItemsInput,
  GetOverdueTodosInput,
  GetStatisticsInput,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import { resolveDate, toKSTMidnight } from '../utils/date.ts';
import {
  createSuccessResult,
  createErrorResult,
  createListResult,
  getStatusEmoji,
  formatDateKorean,
} from '../utils/response.ts';

// ============================================================================
// 할일-프로젝트 연결
// ============================================================================

/**
 * 할일을 프로젝트에 연결
 */
export async function linkTodoToProject(
  supabase: SupabaseClient,
  userId: string,
  input: LinkTodoToProjectInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { todo_id, project_id } = input;

  if (!todo_id || !project_id) {
    return createErrorResult('todo_id와 project_id는 필수입니다.');
  }

  // 할일 존재 확인
  const { data: todo, error: todoError } = await supabase
    .from('todos')
    .select('id, title')
    .eq('id', todo_id)
    .eq('user_id', userId)
    .single();

  if (todoError || !todo) {
    return createErrorResult('할일을 찾을 수 없습니다.');
  }

  // 프로젝트 존재 확인
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', project_id)
    .eq('user_id', userId)
    .single();

  if (projectError || !project) {
    return createErrorResult('프로젝트를 찾을 수 없습니다.');
  }

  // 이미 연결되어 있는지 확인
  const { data: existing } = await supabase
    .from('todo_projects')
    .select('id')
    .eq('todo_id', todo_id)
    .eq('project_id', project_id)
    .single();

  if (existing) {
    return createErrorResult('이미 연결되어 있습니다.');
  }

  // 연결 생성
  const { error } = await supabase.from('todo_projects').insert({
    todo_id,
    project_id,
  });

  if (error) {
    return createErrorResult(`연결 실패: ${error.message}`);
  }

  return createSuccessResult(
    `할일 "${todo.title}"이(가) 프로젝트 "${project.title}"에 연결되었습니다.`
  );
}

/**
 * 할일-프로젝트 연결 해제
 */
export async function unlinkTodoFromProject(
  supabase: SupabaseClient,
  userId: string,
  input: UnlinkTodoFromProjectInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { todo_id, project_id } = input;

  if (!todo_id || !project_id) {
    return createErrorResult('todo_id와 project_id는 필수입니다.');
  }

  // 연결 존재 확인
  const { data: existing, error: fetchError } = await supabase
    .from('todo_projects')
    .select('id, todos(title), projects(title)')
    .eq('todo_id', todo_id)
    .eq('project_id', project_id)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('연결을 찾을 수 없습니다.');
  }

  // 연결 삭제
  const { error } = await supabase
    .from('todo_projects')
    .delete()
    .eq('todo_id', todo_id)
    .eq('project_id', project_id);

  if (error) {
    return createErrorResult(`연결 해제 실패: ${error.message}`);
  }

  const todoTitle = (existing as any).todos?.title || '할일';
  const projectTitle = (existing as any).projects?.title || '프로젝트';

  return createSuccessResult(
    `할일 "${todoTitle}"과(와) 프로젝트 "${projectTitle}"의 연결이 해제되었습니다.`
  );
}

// ============================================================================
// 요약 및 리뷰
// ============================================================================

/**
 * 오늘 할일 요약
 */
export async function getTodaySummary(
  supabase: SupabaseClient,
  userId: string,
  input: GetTodaySummaryInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { include_overdue } = input;
  const todayStart = toKSTMidnight(dateContext.today);
  const todayEnd = new Date(new Date(todayStart).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

  // 오늘 할일 조회
  let query = supabase
    .from('todos')
    .select('id, title, completed, start_time, schedule_type')
    .eq('user_id', userId)
    .gte('start_time', todayStart)
    .lte('start_time', todayEnd)
    .order('start_time', { ascending: true });

  const { data: todayTodos, error: todayError } = await query;

  if (todayError) {
    return createErrorResult(`조회 실패: ${todayError.message}`);
  }

  // 지연 할일 조회
  let overdueTodos: any[] = [];
  if (include_overdue) {
    const { data } = await supabase
      .from('todos')
      .select('id, title, start_time, schedule_type')
      .eq('user_id', userId)
      .eq('completed', false)
      .lt('start_time', todayStart)
      .order('start_time', { ascending: true });

    overdueTodos = data || [];
  }

  // 통계 계산
  const todos = todayTodos || [];
  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 결과 포맷팅
  let summary = `📅 오늘의 할일 요약 (${formatDateKorean(dateContext.today)})\n\n`;
  summary += `📊 진행률: ${completedCount}/${totalCount} (${completionRate}%)\n\n`;

  if (todos.length > 0) {
    summary += '📋 오늘 할일:\n';
    todos.forEach((t, i) => {
      const check = t.completed ? '✅' : '⬜';
      const time = t.schedule_type === 'timed' && t.start_time
        ? new Date(t.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        : '';
      const timeStr = time ? ` (${time})` : '';
      summary += `  ${i + 1}. ${check} ${t.title}${timeStr}\n`;
    });
  } else {
    summary += '📋 오늘 할일: 없음\n';
  }

  if (include_overdue && overdueTodos.length > 0) {
    summary += `\n⚠️ 지연된 할일 (${overdueTodos.length}개):\n`;
    overdueTodos.forEach((t, i) => {
      summary += `  ${i + 1}. ${t.title} (${formatDateKorean(t.start_time)})\n`;
    });
  }

  return {
    content: [{ type: 'text', text: summary.trim() }],
    isError: false,
  };
}

/**
 * 주간 리뷰
 */
export async function getWeeklyReview(
  supabase: SupabaseClient,
  userId: string,
  input: GetWeeklyReviewInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { week_offset = 0 } = input;

  // 주간 범위 계산
  const today = new Date(dateContext.today);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset + week_offset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startStr = toKSTMidnight(weekStart.toISOString().split('T')[0]);
  const endStr = new Date(new Date(toKSTMidnight(weekEnd.toISOString().split('T')[0])).getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();

  // 할일 조회
  const { data: todos, error } = await supabase
    .from('todos')
    .select('id, title, completed, start_time')
    .eq('user_id', userId)
    .gte('start_time', startStr)
    .lte('start_time', endStr);

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  // 프로젝트 진행 상황
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status')
    .eq('user_id', userId)
    .eq('status', 'in_progress');

  // 통계 계산
  const allTodos = todos || [];
  const completedTodos = allTodos.filter((t) => t.completed);
  const completionRate = allTodos.length > 0 ? Math.round((completedTodos.length / allTodos.length) * 100) : 0;

  // 일별 통계
  const dailyStats: Record<string, { total: number; completed: number }> = {};
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyStats[key] = { total: 0, completed: 0 };
  }

  allTodos.forEach((t) => {
    const date = t.start_time?.split('T')[0];
    if (date && dailyStats[date]) {
      dailyStats[date].total++;
      if (t.completed) dailyStats[date].completed++;
    }
  });

  // 결과 포맷팅
  const weekLabel = week_offset === 0 ? '이번 주' : week_offset === -1 ? '지난 주' : `${Math.abs(week_offset)}주 ${week_offset < 0 ? '전' : '후'}`;

  let review = `📊 ${weekLabel} 리뷰\n`;
  review += `📅 ${formatDateKorean(weekStart.toISOString())} ~ ${formatDateKorean(weekEnd.toISOString())}\n\n`;

  review += `📈 전체 진행률: ${completedTodos.length}/${allTodos.length} (${completionRate}%)\n\n`;

  review += '📆 일별 현황:\n';
  Object.entries(dailyStats).forEach(([date, stats]) => {
    const d = new Date(date);
    const dayName = dayNames[d.getDay()];
    const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const bar = stats.total > 0 ? '█'.repeat(Math.round(rate / 10)) + '░'.repeat(10 - Math.round(rate / 10)) : '░░░░░░░░░░';
    review += `  ${dayName}: ${bar} ${stats.completed}/${stats.total}\n`;
  });

  if ((projects || []).length > 0) {
    review += '\n📁 진행 중인 프로젝트:\n';
    (projects || []).forEach((p, i) => {
      review += `  ${i + 1}. ${p.title}\n`;
    });
  }

  return {
    content: [{ type: 'text', text: review.trim() }],
    isError: false,
  };
}

// ============================================================================
// 템플릿 및 대량 작업
// ============================================================================

/**
 * 템플릿에서 계획 생성
 */
export async function createPlanFromTemplate(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePlanFromTemplateInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { template_type, start_date, customize } = input;

  const resolvedStartDate = resolveDate(start_date || 'today', dateContext);

  // 템플릿 정의
  const templates: Record<string, {
    area?: { title: string; status: 'area' | 'resource' };
    projects: { title: string; todos: { title: string }[] }[];
  }> = {
    health: {
      area: { title: '건강 관리', status: 'area' },
      projects: [
        {
          title: '규칙적인 운동 습관',
          todos: [
            { title: '주 3회 운동하기' },
            { title: '운동 루틴 정하기' },
            { title: '운동 기록 앱 설치하기' },
          ],
        },
        {
          title: '건강한 식습관',
          todos: [
            { title: '식단 계획 세우기' },
            { title: '건강한 레시피 찾기' },
          ],
        },
      ],
    },
    finance: {
      area: { title: '재무 관리', status: 'area' },
      projects: [
        {
          title: '월간 예산 관리',
          todos: [
            { title: '가계부 앱 설치하기' },
            { title: '월간 예산 설정하기' },
            { title: '지출 카테고리 분류하기' },
          ],
        },
        {
          title: '저축 계획',
          todos: [
            { title: '저축 목표 금액 설정' },
            { title: '자동이체 설정하기' },
          ],
        },
      ],
    },
    self_development: {
      area: { title: '자기 개발', status: 'area' },
      projects: [
        {
          title: '독서 습관',
          todos: [
            { title: '읽을 책 목록 만들기' },
            { title: '하루 30분 독서하기' },
          ],
        },
        {
          title: '새로운 기술 학습',
          todos: [
            { title: '배우고 싶은 기술 정하기' },
            { title: '온라인 강의 찾기' },
            { title: '학습 계획 세우기' },
          ],
        },
      ],
    },
    family: {
      area: { title: '가족/관계', status: 'area' },
      projects: [
        {
          title: '가족 시간',
          todos: [
            { title: '주말 가족 활동 계획하기' },
            { title: '가족 식사 시간 정하기' },
          ],
        },
        {
          title: '친구 관계',
          todos: [
            { title: '정기적인 모임 계획하기' },
            { title: '연락 드문 친구에게 연락하기' },
          ],
        },
      ],
    },
  };

  const template = templates[template_type];
  if (!template) {
    return createErrorResult(
      `유효하지 않은 템플릿입니다. 가능한 값: ${Object.keys(templates).join(', ')}`
    );
  }

  // 커스터마이징 적용
  const customTitle = customize?.title_prefix || '';
  const customColor = customize?.color || '#A8DADC';

  const createdItems: string[] = [];

  try {
    // 1. Area 생성
    let areaId: string | null = null;
    if (template.area) {
      const { data: maxOrder } = await supabase
        .from('areas_resources')
        .select('order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const { data: area, error } = await supabase
        .from('areas_resources')
        .insert({
          user_id: userId,
          title: customTitle ? `${customTitle} ${template.area.title}` : template.area.title,
          status: template.area.status,
          color: customColor,
          order_index: (maxOrder?.order_index ?? -1) + 1,
        })
        .select()
        .single();

      if (error) throw new Error(`Area 생성 실패: ${error.message}`);
      areaId = area.id;
      createdItems.push(`책임: ${area.title}`);
    }

    // 2. Projects 및 Todos 생성
    for (const projectTemplate of template.projects) {
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
          title: customTitle ? `${customTitle} ${projectTemplate.title}` : projectTemplate.title,
          area_resource_id: areaId,
          status: 'active',
          color: customColor,
          start_date: resolvedStartDate,
          order_index: (maxProjectOrder?.order_index ?? -1) + 1,
        })
        .select()
        .single();

      if (projectError) throw new Error(`Project 생성 실패: ${projectError.message}`);
      createdItems.push(`프로젝트: ${project.title}`);

      // Todos 생성
      for (let i = 0; i < projectTemplate.todos.length; i++) {
        const todoTemplate = projectTemplate.todos[i];
        const todoStartDate = new Date(resolvedStartDate);
        todoStartDate.setDate(todoStartDate.getDate() + i);

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
            title: todoTemplate.title,
            start_time: toKSTMidnight(todoStartDate.toISOString().split('T')[0]),
            schedule_type: 'anytime',
            completed: false,
            order_index: (maxTodoOrder?.order_index ?? -1) + 1,
          })
          .select()
          .single();

        if (todoError) throw new Error(`Todo 생성 실패: ${todoError.message}`);

        // 프로젝트와 연결
        await supabase.from('todo_projects').insert({
          todo_id: todo.id,
          project_id: project.id,
        });

        createdItems.push(`  - 할일: ${todo.title}`);
      }
    }

    const result = `🎉 "${template_type}" 템플릿으로 계획이 생성되었습니다!\n\n생성된 항목:\n${createdItems.join('\n')}`;

    return {
      content: [{ type: 'text', text: result }],
      isError: false,
    };
  } catch (error: any) {
    return createErrorResult(`템플릿 생성 실패: ${error.message}`);
  }
}

/**
 * 일괄 재조정
 */
export async function bulkReschedule(
  supabase: SupabaseClient,
  userId: string,
  input: BulkRescheduleInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { todo_ids, new_date, offset_days } = input;

  if (!todo_ids || todo_ids.length === 0) {
    return createErrorResult('todo_ids는 필수입니다.');
  }

  if (!new_date && offset_days === undefined) {
    return createErrorResult('new_date 또는 offset_days 중 하나는 필수입니다.');
  }

  // 할일 조회
  const { data: todos, error: fetchError } = await supabase
    .from('todos')
    .select('id, title, start_time')
    .eq('user_id', userId)
    .in('id', todo_ids);

  if (fetchError) {
    return createErrorResult(`조회 실패: ${fetchError.message}`);
  }

  if (!todos || todos.length === 0) {
    return createErrorResult('해당 할일을 찾을 수 없습니다.');
  }

  // 일괄 업데이트
  const updates: { id: string; newDate: string }[] = [];

  for (const todo of todos) {
    let newStartTime: string;

    if (new_date) {
      newStartTime = resolveDate(new_date, dateContext);
    } else if (offset_days !== undefined && todo.start_time) {
      const currentDate = new Date(todo.start_time);
      currentDate.setDate(currentDate.getDate() + offset_days);
      newStartTime = toKSTMidnight(currentDate.toISOString().split('T')[0]);
    } else {
      continue;
    }

    const { error } = await supabase
      .from('todos')
      .update({ start_time: newStartTime, updated_at: new Date().toISOString() })
      .eq('id', todo.id)
      .eq('user_id', userId);

    if (!error) {
      updates.push({ id: todo.id, newDate: newStartTime });
    }
  }

  return createSuccessResult(
    `${updates.length}개의 할일이 재조정되었습니다.`,
    { updated_count: updates.length }
  );
}

// ============================================================================
// 검색 및 조회
// ============================================================================

/**
 * 통합 검색
 */
export async function searchItems(
  supabase: SupabaseClient,
  userId: string,
  input: SearchItemsInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { query, types = ['todos', 'projects'], limit = 10 } = input;

  if (!query) {
    return createErrorResult('query는 필수입니다.');
  }

  const results: string[] = [];
  const searchPattern = `%${query}%`;

  // Todos 검색
  if (types.includes('todos')) {
    const { data: todos } = await supabase
      .from('todos')
      .select('id, title, completed, start_time')
      .eq('user_id', userId)
      .ilike('title', searchPattern)
      .limit(limit);

    if (todos && todos.length > 0) {
      results.push('📋 할일:');
      todos.forEach((t) => {
        const check = t.completed ? '✅' : '⬜';
        results.push(`  ${check} ${t.title} (${formatDateKorean(t.start_time)})`);
      });
    }
  }

  // Projects 검색
  if (types.includes('projects')) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, status')
      .eq('user_id', userId)
      .ilike('title', searchPattern)
      .limit(limit);

    if (projects && projects.length > 0) {
      results.push('📁 프로젝트:');
      projects.forEach((p) => {
        results.push(`  ${getStatusEmoji(p.status)} ${p.title}`);
      });
    }
  }

  if (results.length === 0) {
    return {
      content: [{ type: 'text', text: `"${query}"에 대한 검색 결과가 없습니다.` }],
      isError: false,
    };
  }

  return {
    content: [{ type: 'text', text: `🔍 "${query}" 검색 결과:\n\n${results.join('\n')}` }],
    isError: false,
  };
}

/**
 * 인박스 항목 조회 (정리되지 않은 항목)
 */
export async function getInboxItems(
  supabase: SupabaseClient,
  userId: string,
  input: GetInboxItemsInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { limit = 20 } = input;

  const results: string[] = [];

  // 프로젝트에 연결되지 않은 할일
  const { data: unlinkedTodos } = await supabase
    .from('todos')
    .select(`
      id, title, start_time,
      todo_projects(project_id)
    `)
    .eq('user_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  const orphanTodos = (unlinkedTodos || []).filter(
    (t: any) => !t.todo_projects || t.todo_projects.length === 0
  );

  if (orphanTodos.length > 0) {
    results.push(`📥 정리되지 않은 할일 (${orphanTodos.length}개):`);
    orphanTodos.forEach((t: any, i: number) => {
      results.push(`  ${i + 1}. ${t.title} (${formatDateKorean(t.start_time)})`);
    });
  }

  if (results.length === 0) {
    return {
      content: [{ type: 'text', text: '✨ 모든 항목이 정리되어 있습니다!' }],
      isError: false,
    };
  }

  return {
    content: [{ type: 'text', text: `📥 인박스 (정리 필요 항목)\n\n${results.join('\n')}` }],
    isError: false,
  };
}

/**
 * 지연 할일 조회
 */
export async function getOverdueTodos(
  supabase: SupabaseClient,
  userId: string,
  input: GetOverdueTodosInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { limit = 50 } = input;
  const todayStart = toKSTMidnight(dateContext.today);

  const { data, error } = await supabase
    .from('todos')
    .select('id, title, start_time, schedule_type')
    .eq('user_id', userId)
    .eq('completed', false)
    .lt('start_time', todayStart)
    .order('start_time', { ascending: true })
    .limit(limit);

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  const todos = data || [];

  if (todos.length === 0) {
    return {
      content: [{ type: 'text', text: '✨ 지연된 할일이 없습니다!' }],
      isError: false,
    };
  }

  // 기간별 그룹화
  const groups: Record<string, any[]> = {
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  const yesterday = new Date(dateContext.today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(dateContext.today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  todos.forEach((t) => {
    const todoDate = new Date(t.start_time);
    if (todoDate >= yesterday) {
      groups.yesterday.push(t);
    } else if (todoDate >= weekAgo) {
      groups.thisWeek.push(t);
    } else {
      groups.older.push(t);
    }
  });

  const results: string[] = [];

  if (groups.yesterday.length > 0) {
    results.push('📅 어제:');
    groups.yesterday.forEach((t) => results.push(`  ⬜ ${t.title}`));
  }

  if (groups.thisWeek.length > 0) {
    results.push('\n📅 이번 주:');
    groups.thisWeek.forEach((t) => results.push(`  ⬜ ${t.title} (${formatDateKorean(t.start_time)})`));
  }

  if (groups.older.length > 0) {
    results.push('\n📅 더 오래된:');
    groups.older.forEach((t) => results.push(`  ⬜ ${t.title} (${formatDateKorean(t.start_time)})`));
  }

  return {
    content: [{
      type: 'text',
      text: `⚠️ 지연된 할일 (${todos.length}개)\n\n${results.join('\n')}`,
    }],
    isError: false,
  };
}

// ============================================================================
// 통계
// ============================================================================

/**
 * 통계 조회
 */
export async function getStatistics(
  supabase: SupabaseClient,
  userId: string,
  input: GetStatisticsInput,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { period = 'week' } = input;

  // 기간 계산
  let startDate: string;
  const today = new Date(dateContext.today);

  switch (period) {
    case 'today':
      startDate = toKSTMidnight(dateContext.today);
      break;
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      startDate = toKSTMidnight(weekStart.toISOString().split('T')[0]);
      break;
    case 'month':
      const monthStart = new Date(today);
      monthStart.setMonth(today.getMonth() - 1);
      startDate = toKSTMidnight(monthStart.toISOString().split('T')[0]);
      break;
    case 'year':
      startDate = toKSTMidnight(`${dateContext.year}-01-01`);
      break;
    default:
      startDate = toKSTMidnight(dateContext.today);
  }

  // 할일 통계
  const { data: todos } = await supabase
    .from('todos')
    .select('id, completed, start_time')
    .eq('user_id', userId)
    .gte('start_time', startDate);

  const allTodos = todos || [];
  const completedTodos = allTodos.filter((t) => t.completed);
  const todoCompletionRate = allTodos.length > 0
    ? Math.round((completedTodos.length / allTodos.length) * 100)
    : 0;

  // 프로젝트 통계
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status')
    .eq('user_id', userId);

  const allProjects = projects || [];
  const projectStats = {
    total: allProjects.length,
    active: allProjects.filter((p) => p.status === 'active').length,
    completed: allProjects.filter((p) => p.status === 'completed').length,
    abandoned: allProjects.filter((p) => p.status === 'abandoned').length,
  };

  const periodLabel = {
    today: '오늘',
    week: '최근 7일',
    month: '최근 30일',
    year: `${dateContext.year}년`,
  }[period];

  const stats = `
📊 ${periodLabel} 통계

📋 할일
  총 개수: ${allTodos.length}
  완료: ${completedTodos.length}
  완료율: ${todoCompletionRate}%

📁 프로젝트
  총 개수: ${projectStats.total}
  진행 중: ${projectStats.active}
  완료: ${projectStats.completed}
  포기: ${projectStats.abandoned}
`.trim();

  return {
    content: [{ type: 'text', text: stats }],
    isError: false,
  };
}
