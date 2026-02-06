/**
 * Resources 핸들러
 *
 * MCP Resources 프로토콜 구현
 * - resources/list: 사용 가능한 리소스 목록
 * - resources/read: 리소스 내용 조회
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpResource, McpToolCallResult } from '../types/mcp.ts';
import type { DateContext } from '../utils/date.ts';
import { getStatusEmoji, formatDateKorean } from '../utils/response.ts';

// ============================================================================
// 리소스 정의
// ============================================================================

export const MCP_RESOURCES: McpResource[] = [
  {
    uri: 'daystep://templates/list',
    name: '템플릿 목록',
    description: '사용 가능한 계획 템플릿 목록을 제공합니다.',
    mimeType: 'application/json',
  },
  {
    uri: 'daystep://summary/today',
    name: '오늘 요약',
    description: '오늘의 할일과 일정 요약을 제공합니다.',
    mimeType: 'text/plain',
  },
  {
    uri: 'daystep://summary/week',
    name: '주간 요약',
    description: '이번 주 할일과 진행 상황 요약을 제공합니다.',
    mimeType: 'text/plain',
  },
  {
    uri: 'daystep://goals/current',
    name: '현재 목표',
    description: '현재 분기 목표 목록을 제공합니다.',
    mimeType: 'application/json',
  },
  {
    uri: 'daystep://projects/active',
    name: '활성 프로젝트',
    description: '진행 중인 프로젝트 목록을 제공합니다.',
    mimeType: 'application/json',
  },
  {
    uri: 'daystep://stats/overview',
    name: '통계 개요',
    description: '전체 통계 개요를 제공합니다.',
    mimeType: 'application/json',
  },
];

// ============================================================================
// 핸들러
// ============================================================================

/**
 * resources/list 처리
 */
export function handleResourcesList(): { resources: McpResource[] } {
  return { resources: MCP_RESOURCES };
}

/**
 * resources/read 처리
 */
export async function handleResourcesRead(
  supabase: SupabaseClient,
  userId: string,
  uri: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  switch (uri) {
    case 'daystep://templates/list':
      return getTemplatesList();

    case 'daystep://summary/today':
      return getTodaySummaryResource(supabase, userId, dateContext);

    case 'daystep://summary/week':
      return getWeekSummaryResource(supabase, userId, dateContext);

    case 'daystep://goals/current':
      return getCurrentGoalsResource(supabase, userId, dateContext);

    case 'daystep://projects/active':
      return getActiveProjectsResource(supabase, userId);

    case 'daystep://stats/overview':
      return getStatsOverviewResource(supabase, userId, dateContext);

    default:
      return {
        content: [{ type: 'text', text: `알 수 없는 리소스: ${uri}` }],
        isError: true,
      };
  }
}

// ============================================================================
// 리소스 구현
// ============================================================================

/**
 * 템플릿 목록
 */
function getTemplatesList(): McpToolCallResult {
  const templates = [
    {
      id: 'health',
      name: '건강 관리',
      description: '운동, 식단, 건강 습관을 위한 템플릿',
      includes: ['책임: 건강 관리', '목표: 연간 건강 목표', '프로젝트 2개', '할일 5개'],
    },
    {
      id: 'finance',
      name: '재무 관리',
      description: '예산, 저축, 투자를 위한 템플릿',
      includes: ['책임: 재무 관리', '목표: 연간 재무 목표', '프로젝트 2개', '할일 5개'],
    },
    {
      id: 'self_development',
      name: '자기 개발',
      description: '학습, 독서, 성장을 위한 템플릿',
      includes: ['책임: 자기 개발', '목표: 연간 성장 목표', '프로젝트 2개', '할일 5개'],
    },
    {
      id: 'family',
      name: '가족/관계',
      description: '가족, 친구 관계를 위한 템플릿',
      includes: ['책임: 가족/관계', '목표: 연간 관계 목표', '프로젝트 2개', '할일 4개'],
    },
  ];

  const content = JSON.stringify(templates, null, 2);

  return {
    content: [{ type: 'text', text: content }],
    isError: false,
  };
}

/**
 * 오늘 요약 리소스
 */
async function getTodaySummaryResource(
  supabase: SupabaseClient,
  userId: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const todayStart = new Date(dateContext.today);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // 오늘 할일 조회
  const { data: todos } = await supabase
    .from('todos')
    .select('id, title, completed, start_time, schedule_type')
    .eq('user_id', userId)
    .gte('start_time', todayStart.toISOString())
    .lt('start_time', todayEnd.toISOString())
    .order('start_time', { ascending: true });

  const allTodos = todos || [];
  const completed = allTodos.filter((t) => t.completed).length;
  const total = allTodos.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  let summary = `📅 오늘 요약 (${formatDateKorean(dateContext.today)})\n\n`;
  summary += `📊 진행률: ${completed}/${total} (${rate}%)\n\n`;

  if (total > 0) {
    summary += '📋 할일:\n';
    allTodos.forEach((t, i) => {
      const check = t.completed ? '✅' : '⬜';
      const time =
        t.schedule_type === 'timed' && t.start_time
          ? new Date(t.start_time).toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
      summary += `  ${i + 1}. ${check} ${t.title}${time ? ` (${time})` : ''}\n`;
    });
  } else {
    summary += '📋 오늘 할일이 없습니다.\n';
  }

  return {
    content: [{ type: 'text', text: summary.trim() }],
    isError: false,
  };
}

/**
 * 주간 요약 리소스
 */
async function getWeekSummaryResource(
  supabase: SupabaseClient,
  userId: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const today = new Date(dateContext.today);
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  // 주간 할일 조회
  const { data: todos } = await supabase
    .from('todos')
    .select('id, title, completed, start_time')
    .eq('user_id', userId)
    .gte('start_time', weekStart.toISOString())
    .lt('start_time', weekEnd.toISOString());

  const allTodos = todos || [];
  const completed = allTodos.filter((t) => t.completed).length;
  const total = allTodos.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 일별 통계
  const dailyStats: Record<string, { total: number; completed: number }> = {};
  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];

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

  let summary = `📊 이번 주 요약\n`;
  summary += `📅 ${formatDateKorean(weekStart.toISOString())} ~ ${formatDateKorean(new Date(weekEnd.getTime() - 1).toISOString())}\n\n`;
  summary += `📈 전체 진행률: ${completed}/${total} (${rate}%)\n\n`;
  summary += '📆 일별 현황:\n';

  let dayIndex = 0;
  for (const [date, stats] of Object.entries(dailyStats)) {
    const dayRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const bar =
      stats.total > 0
        ? '█'.repeat(Math.round(dayRate / 10)) + '░'.repeat(10 - Math.round(dayRate / 10))
        : '░░░░░░░░░░';
    summary += `  ${dayNames[dayIndex]}: ${bar} ${stats.completed}/${stats.total}\n`;
    dayIndex++;
  }

  return {
    content: [{ type: 'text', text: summary.trim() }],
    isError: false,
  };
}

/**
 * 현재 목표 리소스
 */
async function getCurrentGoalsResource(
  supabase: SupabaseClient,
  userId: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  const { data: goals } = await supabase
    .from('goals')
    .select('id, title, status, year_goal, quarter_goal, start_date, end_date')
    .eq('user_id', userId)
    .eq('year_goal', dateContext.year)
    .order('order_index', { ascending: true });

  const allGoals = goals || [];

  if (allGoals.length === 0) {
    return {
      content: [{ type: 'text', text: `${dateContext.year}년 목표가 없습니다.` }],
      isError: false,
    };
  }

  const formatted = allGoals.map((g) => ({
    id: g.id,
    title: g.title,
    status: g.status,
    period: g.quarter_goal || `${g.year_goal}년`,
    startDate: g.start_date,
    endDate: g.end_date,
  }));

  return {
    content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
    isError: false,
  };
}

/**
 * 활성 프로젝트 리소스
 */
async function getActiveProjectsResource(
  supabase: SupabaseClient,
  userId: string
): Promise<McpToolCallResult> {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, start_date, end_date, goals(title)')
    .eq('user_id', userId)
    .in('status', ['not_started', 'in_progress'])
    .order('order_index', { ascending: true });

  const allProjects = projects || [];

  if (allProjects.length === 0) {
    return {
      content: [{ type: 'text', text: '진행 중인 프로젝트가 없습니다.' }],
      isError: false,
    };
  }

  const formatted = allProjects.map((p: any) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    goal: p.goals?.title || null,
    startDate: p.start_date,
    endDate: p.end_date,
  }));

  return {
    content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }],
    isError: false,
  };
}

/**
 * 통계 개요 리소스
 */
async function getStatsOverviewResource(
  supabase: SupabaseClient,
  userId: string,
  dateContext: DateContext
): Promise<McpToolCallResult> {
  // 할일 통계
  const { data: todos } = await supabase
    .from('todos')
    .select('id, completed')
    .eq('user_id', userId);

  const allTodos = todos || [];
  const completedTodos = allTodos.filter((t) => t.completed).length;

  // 프로젝트 통계
  const { data: projects } = await supabase
    .from('projects')
    .select('id, status')
    .eq('user_id', userId);

  const allProjects = projects || [];

  // 목표 통계
  const { data: goals } = await supabase
    .from('goals')
    .select('id, status')
    .eq('user_id', userId)
    .eq('year_goal', dateContext.year);

  const allGoals = goals || [];

  // 책임/자원 통계
  const { data: areas } = await supabase
    .from('areas_resources')
    .select('id, status')
    .eq('user_id', userId);

  const allAreas = areas || [];

  const stats = {
    todos: {
      total: allTodos.length,
      completed: completedTodos,
      pending: allTodos.length - completedTodos,
      completionRate: allTodos.length > 0 ? Math.round((completedTodos / allTodos.length) * 100) : 0,
    },
    projects: {
      total: allProjects.length,
      notStarted: allProjects.filter((p) => p.status === 'not_started').length,
      inProgress: allProjects.filter((p) => p.status === 'in_progress').length,
      completed: allProjects.filter((p) => p.status === 'completed').length,
    },
    goals: {
      total: allGoals.length,
      notStarted: allGoals.filter((g) => g.status === 'not_started').length,
      inProgress: allGoals.filter((g) => g.status === 'in_progress').length,
      completed: allGoals.filter((g) => g.status === 'completed').length,
    },
    areasResources: {
      total: allAreas.length,
      areas: allAreas.filter((a) => a.status === 'area').length,
      resources: allAreas.filter((a) => a.status === 'resource').length,
      archived: allAreas.filter((a) => a.status === 'archived').length,
    },
    year: dateContext.year,
    quarter: dateContext.quarter,
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
    isError: false,
  };
}
