/**
 * MCP Tools 핸들러
 *
 * tools/list 및 tools/call 메소드 처리
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type {
  McpTool,
  McpToolsListResult,
  McpToolCallParams,
  McpToolCallResult,
} from '../types/mcp.ts';
import { createErrorResult } from '../utils/response.ts';
import { getCurrentDateContext } from '../utils/date.ts';

// Tool 구현 임포트
import {
  createAreaResource,
  listAreasResources,
  getAreaResource,
  updateAreaResource,
  deleteAreaResource,
  archiveAreaResource,
} from '../tools/areas-resources.ts';

import {
  createGoal,
  listGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  setGoalStatus,
} from '../tools/goals.ts';

import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
  completeProject,
} from '../tools/projects.ts';

import {
  createTodo,
  listTodos,
  getTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  rescheduleTodo,
  setTodoClarification,
} from '../tools/todos.ts';

import {
  linkTodoToProject,
  unlinkTodoFromProject,
  getTodaySummary,
  getWeeklyReview,
  createPlanFromTemplate,
  bulkReschedule,
  searchItems,
  getInboxItems,
  getOverdueTodos,
  getStatistics,
} from '../tools/relations.ts';

// ============================================================================
// Tool 정의
// ============================================================================

const TOOLS: McpTool[] = [
  // ========== Areas/Resources ==========
  {
    name: 'create_area_resource',
    description: '새로운 책임(Area) 또는 자원(Resource)을 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '이름' },
        status: { type: 'string', enum: ['area', 'resource'], description: '유형 (area: 책임, resource: 자원)' },
        icon: { type: 'string', description: '아이콘 (예: lucide-Heart)' },
        color: { type: 'string', description: '색상 (Hex 코드, 예: #A8DADC)' },
        is_pinned: { type: 'boolean', description: '고정 여부' },
      },
      required: ['title', 'status'],
    },
  },
  {
    name: 'list_areas_resources',
    description: '책임 및 자원 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['area', 'resource', 'archived'], description: '유형 필터' },
        is_pinned: { type: 'boolean', description: '고정 여부 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_area_resource',
    description: '특정 책임 또는 자원의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_area_resource',
    description: '책임 또는 자원을 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '이름' },
        status: { type: 'string', enum: ['area', 'resource', 'archived'], description: '유형' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
        is_pinned: { type: 'boolean', description: '고정 여부' },
        order_index: { type: 'number', description: '정렬 순서' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_area_resource',
    description: '책임 또는 자원을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        force: { type: 'boolean', description: '연결된 항목이 있어도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'archive_area_resource',
    description: '책임 또는 자원을 보관 처리합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
      },
      required: ['id'],
    },
  },

  // ========== Goals ==========
  {
    name: 'create_goal',
    description: '새로운 목표를 생성합니다. year_goal과 quarter_goal로 연간/분기 목표를 설정할 수 있습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '목표 제목' },
        year_goal: { type: ['number', 'string'], description: '연도 (예: 2025) 또는 "current"로 현재 연도' },
        quarter_goal: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4', 'current'], description: '분기 또는 "current"로 현재 분기' },
        area_resource_id: { type: 'string', description: '연결할 책임/자원 ID' },
        start_date: { type: 'string', description: '시작일 (YYYY-MM-DD 또는 today, tomorrow, next_week 등)' },
        end_date: { type: 'string', description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_goals',
    description: '목표 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태 필터' },
        year_goal: { type: ['number', 'string'], description: '연도 필터 또는 "current"' },
        quarter_goal: { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4', 'current'], description: '분기 필터' },
        area_resource_id: { type: 'string', description: '책임/자원 ID 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_goal',
    description: '특정 목표의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_projects: { type: 'boolean', description: '연결된 프로젝트 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_goal',
    description: '목표를 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        year_goal: { type: ['number', 'null'], description: '연도 (null로 해제)' },
        quarter_goal: { type: ['string', 'null'], enum: ['Q1', 'Q2', 'Q3', 'Q4', null], description: '분기' },
        area_resource_id: { type: ['string', 'null'], description: '책임/자원 ID' },
        start_date: { type: ['string', 'null'], description: '시작일' },
        end_date: { type: ['string', 'null'], description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_goal',
    description: '목표를 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        force: { type: 'boolean', description: '연결된 프로젝트가 있어도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'set_goal_status',
    description: '목표의 상태를 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '새 상태' },
      },
      required: ['id', 'status'],
    },
  },

  // ========== Projects ==========
  {
    name: 'create_project',
    description: '새로운 프로젝트를 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '프로젝트 제목' },
        goal_id: { type: 'string', description: '연결할 목표 ID' },
        area_resource_id: { type: 'string', description: '연결할 책임/자원 ID' },
        description: { type: 'string', description: '설명' },
        start_date: { type: 'string', description: '시작일' },
        end_date: { type: 'string', description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_projects',
    description: '프로젝트 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태 필터' },
        goal_id: { type: 'string', description: '목표 ID 필터' },
        area_resource_id: { type: 'string', description: '책임/자원 ID 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_project',
    description: '특정 프로젝트의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_todos: { type: 'boolean', description: '연결된 할일 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_project',
    description: '프로젝트를 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        goal_id: { type: ['string', 'null'], description: '목표 ID' },
        area_resource_id: { type: ['string', 'null'], description: '책임/자원 ID' },
        description: { type: ['string', 'null'], description: '설명' },
        start_date: { type: ['string', 'null'], description: '시작일' },
        end_date: { type: ['string', 'null'], description: '종료일' },
        status: { type: 'string', enum: ['not_started', 'in_progress', 'paused', 'completed'], description: '상태' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_project',
    description: '프로젝트를 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        force: { type: 'boolean', description: '연결된 할일이 있어도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_project',
    description: '프로젝트를 완료 처리합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
      },
      required: ['id'],
    },
  },

  // ========== Todos ==========
  {
    name: 'create_todo',
    description: '새로운 할일을 생성합니다. 반복 일정과 다양한 일정 타입을 지원합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '할일 제목' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입' },
        start_time: { type: 'string', description: '시작 시간 (ISO datetime 또는 today, tomorrow 등 + 시간)' },
        end_time: { type: 'string', description: '종료 시간' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위' },
        project_ids: { type: 'array', items: { type: 'string' }, description: '연결할 프로젝트 ID 목록' },
        recurrence: {
          type: 'object',
          description: '반복 설정',
          properties: {
            pattern: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly', 'custom'], description: '반복 패턴' },
            interval: { type: 'number', description: '반복 간격 (예: 2 = 2일/2주마다)' },
            days_of_week: { type: 'array', items: { type: 'number' }, description: '요일 (0=일, 1=월, ..., 6=토)' },
            day_of_month: { type: 'number', description: '매월 반복 일 (1-31)' },
            end_date: { type: 'string', description: '반복 종료일' },
            count: { type: 'number', description: '반복 횟수' },
          },
        },
        clarification: { type: 'string', enum: ['none', 'reminder', 'someday', 'waiting', 'next_action', 'schedule_clear'], description: '명료화 상태' },
        is_today_highlight: { type: 'boolean', description: '오늘 하이라이트 여부' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
        anytime_duration: { type: 'number', description: '예상 소요 시간 (분, anytime 타입용)' },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_todos',
    description: '할일 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '날짜 필터 (today, tomorrow, YYYY-MM-DD)' },
        date_range: {
          type: 'object',
          properties: {
            start: { type: 'string', description: '시작일' },
            end: { type: 'string', description: '종료일' },
          },
        },
        completed: { type: 'boolean', description: '완료 여부 필터' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위 필터' },
        clarification: { type: 'string', enum: ['none', 'reminder', 'someday', 'waiting', 'next_action', 'schedule_clear'], description: '명료화 필터' },
        project_id: { type: 'string', description: '프로젝트 ID 필터' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입 필터' },
        limit: { type: 'number', description: '최대 개수' },
        offset: { type: 'number', description: '시작 위치' },
      },
    },
  },
  {
    name: 'get_todo',
    description: '특정 할일의 상세 정보를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        include_projects: { type: 'boolean', description: '연결된 프로젝트 포함 여부' },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_todo',
    description: '할일을 수정합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        title: { type: 'string', description: '제목' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '일정 타입' },
        start_time: { type: ['string', 'null'], description: '시작 시간' },
        end_time: { type: ['string', 'null'], description: '종료 시간' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: '우선순위' },
        completed: { type: 'boolean', description: '완료 여부' },
        clarification: { type: 'string', enum: ['none', 'reminder', 'someday', 'waiting', 'next_action', 'schedule_clear'], description: '명료화' },
        is_today_highlight: { type: 'boolean', description: '오늘 하이라이트' },
        icon: { type: 'string', description: '아이콘' },
        color: { type: 'string', description: '색상' },
        anytime_duration: { type: 'number', description: '예상 소요 시간' },
        recurrence: { type: ['object', 'null'], description: '반복 설정 (null로 해제)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_todo',
    description: '할일을 삭제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        permanent: { type: 'boolean', description: '미완료 할일도 강제 삭제' },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_todo',
    description: '할일의 완료 상태를 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        completed: { type: 'boolean', description: '완료 여부' },
        completion_date: { type: 'string', description: '완료일 (반복 할일의 특정 날짜 완료용)' },
      },
      required: ['id', 'completed'],
    },
  },
  {
    name: 'reschedule_todo',
    description: '할일의 일정을 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        start_time: { type: 'string', description: '새 시작 시간 (today, tomorrow, YYYY-MM-DD 등)' },
        end_time: { type: 'string', description: '새 종료 시간' },
        schedule_type: { type: 'string', enum: ['all_day', 'timed', 'anytime', 'none'], description: '새 일정 타입' },
      },
      required: ['id', 'start_time'],
    },
  },
  {
    name: 'set_todo_clarification',
    description: '할일의 명료화 상태를 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID' },
        clarification: { type: 'string', enum: ['none', 'reminder', 'someday', 'waiting', 'next_action', 'schedule_clear'], description: '명료화 상태' },
      },
      required: ['id', 'clarification'],
    },
  },

  // ========== Relations & Special ==========
  {
    name: 'link_todo_to_project',
    description: '할일을 프로젝트에 연결합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: '할일 ID' },
        project_id: { type: 'string', description: '프로젝트 ID' },
      },
      required: ['todo_id', 'project_id'],
    },
  },
  {
    name: 'unlink_todo_from_project',
    description: '할일과 프로젝트의 연결을 해제합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_id: { type: 'string', description: '할일 ID' },
        project_id: { type: 'string', description: '프로젝트 ID' },
      },
      required: ['todo_id', 'project_id'],
    },
  },
  {
    name: 'get_today_summary',
    description: '오늘의 할일 요약을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        timezone: { type: 'string', description: '타임존 (기본: Asia/Seoul)' },
      },
    },
  },
  {
    name: 'get_weekly_review',
    description: '주간 리뷰 데이터를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        week_start: { type: 'string', description: '주 시작일 (기본: 이번 주 월요일)' },
        timezone: { type: 'string', description: '타임존' },
      },
    },
  },
  {
    name: 'create_plan_from_template',
    description: '템플릿에서 계획(책임, 목표, 프로젝트, 할일)을 일괄 생성합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        template_name: {
          type: 'string',
          enum: ['health', 'finance', 'learning', 'family', 'work', 'custom'],
          description: '템플릿 이름 (health: 건강관리, finance: 재정관리, learning: 자기계발, family: 가족/관계, work: 업무, custom: 커스텀)',
        },
        start_date: { type: 'string', description: '계획 시작일 (기본: today)' },
        customizations: {
          type: 'object',
          description: '커스텀 설정',
          properties: {
            area_title: { type: 'string', description: '책임 영역 이름' },
            goals: { type: 'array', description: '목표 목록' },
            projects: { type: 'array', description: '프로젝트 목록' },
            todos: { type: 'array', description: '할일 목록' },
          },
        },
      },
      required: ['template_name'],
    },
  },
  {
    name: 'bulk_reschedule',
    description: '여러 할일의 일정을 일괄 변경합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        todo_ids: { type: 'array', items: { type: 'string' }, description: '할일 ID 목록' },
        new_date: { type: 'string', description: '새 날짜 (today, tomorrow, YYYY-MM-DD)' },
        preserve_time: { type: 'boolean', description: '기존 시간 유지 여부' },
      },
      required: ['todo_ids', 'new_date'],
    },
  },
  {
    name: 'search_items',
    description: '책임, 자원, 목표, 프로젝트, 할일을 통합 검색합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '검색어' },
        types: { type: 'array', items: { type: 'string', enum: ['area', 'resource', 'goal', 'project', 'todo'] }, description: '검색 대상 타입' },
        limit: { type: 'number', description: '최대 결과 수' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_inbox_items',
    description: '인박스 항목(연결되지 않은 목표, 프로젝트, 할일)을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        types: { type: 'array', items: { type: 'string', enum: ['goal', 'project', 'todo'] }, description: '조회할 타입' },
        limit: { type: 'number', description: '최대 개수' },
      },
    },
  },
  {
    name: 'get_overdue_todos',
    description: '기한이 지난 할일을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        include_completed: { type: 'boolean', description: '완료된 항목 포함 여부' },
        limit: { type: 'number', description: '최대 개수' },
      },
    },
  },
  {
    name: 'get_statistics',
    description: '할일 통계를 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', enum: ['today', 'week', 'month', 'year'], description: '기간' },
        timezone: { type: 'string', description: '타임존' },
      },
    },
  },
];

// ============================================================================
// 핸들러 함수
// ============================================================================

/**
 * tools/list 핸들러
 */
export function handleToolsList(): McpToolsListResult {
  return { tools: TOOLS };
}

/**
 * tools/call 핸들러
 */
export async function handleToolsCall(
  params: McpToolCallParams,
  supabase: SupabaseClient,
  userId: string
): Promise<McpToolCallResult> {
  const { name, arguments: args = {} } = params;
  const dateContext = getCurrentDateContext();

  try {
    switch (name) {
      // Areas/Resources
      case 'create_area_resource':
        return await createAreaResource(supabase, userId, args, dateContext);
      case 'list_areas_resources':
        return await listAreasResources(supabase, userId, args, dateContext);
      case 'get_area_resource':
        return await getAreaResource(supabase, userId, args, dateContext);
      case 'update_area_resource':
        return await updateAreaResource(supabase, userId, args, dateContext);
      case 'delete_area_resource':
        return await deleteAreaResource(supabase, userId, args, dateContext);
      case 'archive_area_resource':
        return await archiveAreaResource(supabase, userId, args, dateContext);

      // Goals
      case 'create_goal':
        return await createGoal(supabase, userId, args, dateContext);
      case 'list_goals':
        return await listGoals(supabase, userId, args, dateContext);
      case 'get_goal':
        return await getGoal(supabase, userId, args, dateContext);
      case 'update_goal':
        return await updateGoal(supabase, userId, args, dateContext);
      case 'delete_goal':
        return await deleteGoal(supabase, userId, args, dateContext);
      case 'set_goal_status':
        return await setGoalStatus(supabase, userId, args, dateContext);

      // Projects
      case 'create_project':
        return await createProject(supabase, userId, args, dateContext);
      case 'list_projects':
        return await listProjects(supabase, userId, args, dateContext);
      case 'get_project':
        return await getProject(supabase, userId, args, dateContext);
      case 'update_project':
        return await updateProject(supabase, userId, args, dateContext);
      case 'delete_project':
        return await deleteProject(supabase, userId, args, dateContext);
      case 'complete_project':
        return await completeProject(supabase, userId, args, dateContext);

      // Todos
      case 'create_todo':
        return await createTodo(supabase, userId, args, dateContext);
      case 'list_todos':
        return await listTodos(supabase, userId, args, dateContext);
      case 'get_todo':
        return await getTodo(supabase, userId, args, dateContext);
      case 'update_todo':
        return await updateTodo(supabase, userId, args, dateContext);
      case 'delete_todo':
        return await deleteTodo(supabase, userId, args, dateContext);
      case 'complete_todo':
        return await completeTodo(supabase, userId, args, dateContext);
      case 'reschedule_todo':
        return await rescheduleTodo(supabase, userId, args, dateContext);
      case 'set_todo_clarification':
        return await setTodoClarification(supabase, userId, args, dateContext);

      // Relations & Special
      case 'link_todo_to_project':
        return await linkTodoToProject(supabase, userId, args, dateContext);
      case 'unlink_todo_from_project':
        return await unlinkTodoFromProject(supabase, userId, args, dateContext);
      case 'get_today_summary':
        return await getTodaySummary(supabase, userId, args, dateContext);
      case 'get_weekly_review':
        return await getWeeklyReview(supabase, userId, args, dateContext);
      case 'create_plan_from_template':
        return await createPlanFromTemplate(supabase, userId, args, dateContext);
      case 'bulk_reschedule':
        return await bulkReschedule(supabase, userId, args, dateContext);
      case 'search_items':
        return await searchItems(supabase, userId, args, dateContext);
      case 'get_inbox_items':
        return await getInboxItems(supabase, userId, args, dateContext);
      case 'get_overdue_todos':
        return await getOverdueTodos(supabase, userId, args, dateContext);
      case 'get_statistics':
        return await getStatistics(supabase, userId, args, dateContext);

      default:
        return createErrorResult(`알 수 없는 도구: ${name}`);
    }
  } catch (error) {
    console.error(`Tool call error (${name}):`, error);
    return createErrorResult((error as Error).message);
  }
}
