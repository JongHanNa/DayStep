/**
 * MCP Tool 입출력 타입 정의
 *
 * DayStep 도메인 모델에 맞는 Tool 파라미터 및 결과 타입
 */

// ============================================================================
// 공통 타입
// ============================================================================

export type ProgressStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';
export type ScheduleType = 'all_day' | 'timed' | 'anytime' | 'none';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type Priority = 'low' | 'medium' | 'high';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type AreaResourceStatus = 'area' | 'resource' | 'archived';

// 동적 날짜 타입
export interface DynamicDate {
  base: 'today' | 'tomorrow' | 'week_start' | 'month_start' | string;
  offset?: {
    days?: number;
    weeks?: number;
    months?: number;
  };
}

// 반복 설정 타입
export interface RecurrenceConfig {
  pattern: RecurrencePattern;
  interval?: number;
  days_of_week?: number[]; // 0=일, 1=월, ..., 6=토
  day_of_month?: number; // 1-31
  end_date?: string | DynamicDate;
  count?: number;
}

// ============================================================================
// Areas/Resources 도구 타입
// ============================================================================

export interface CreateAreaResourceInput {
  title: string;
  status: 'area' | 'resource';
  icon?: string;
  color?: string;
  is_pinned?: boolean;
}

export interface ListAreasResourcesInput {
  status?: AreaResourceStatus;
  is_pinned?: boolean;
  limit?: number;
  offset?: number;
}

export interface GetAreaResourceInput {
  id: string;
}

export interface UpdateAreaResourceInput {
  id: string;
  title?: string;
  status?: AreaResourceStatus;
  icon?: string;
  color?: string;
  is_pinned?: boolean;
  order_index?: number;
}

export interface DeleteAreaResourceInput {
  id: string;
  force?: boolean; // 연결된 항목이 있어도 삭제
}

export interface ArchiveAreaResourceInput {
  id: string;
}

// ============================================================================
// Goals 도구 타입
// ============================================================================

export interface CreateGoalInput {
  title: string;
  year_goal?: number | 'current'; // 'current' = 현재 연도
  quarter_goal?: Quarter | 'current'; // 'current' = 현재 분기
  area_resource_id?: string;
  start_date?: string | DynamicDate;
  end_date?: string | DynamicDate;
  status?: ProgressStatus;
  icon?: string;
  color?: string;
}

export interface ListGoalsInput {
  status?: ProgressStatus;
  year_goal?: number | 'current';
  quarter_goal?: Quarter | 'current';
  area_resource_id?: string;
  limit?: number;
  offset?: number;
}

export interface GetGoalInput {
  id: string;
  include_projects?: boolean;
}

export interface UpdateGoalInput {
  id: string;
  title?: string;
  year_goal?: number | null;
  quarter_goal?: Quarter | null;
  area_resource_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: ProgressStatus;
  icon?: string;
  color?: string;
}

export interface DeleteGoalInput {
  id: string;
  force?: boolean;
}

export interface SetGoalStatusInput {
  id: string;
  status: ProgressStatus;
}

// ============================================================================
// Projects 도구 타입
// ============================================================================

export interface CreateProjectInput {
  title: string;
  goal_id?: string;
  area_resource_id?: string;
  description?: string;
  start_date?: string | DynamicDate;
  end_date?: string | DynamicDate;
  status?: ProgressStatus;
  icon?: string;
  color?: string;
}

export interface ListProjectsInput {
  status?: ProgressStatus;
  goal_id?: string;
  area_resource_id?: string;
  limit?: number;
  offset?: number;
}

export interface GetProjectInput {
  id: string;
  include_todos?: boolean;
}

export interface UpdateProjectInput {
  id: string;
  title?: string;
  goal_id?: string | null;
  area_resource_id?: string | null;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: ProgressStatus;
  icon?: string;
  color?: string;
}

export interface DeleteProjectInput {
  id: string;
  force?: boolean;
}

export interface CompleteProjectInput {
  id: string;
}

// ============================================================================
// Todos 도구 타입
// ============================================================================

export interface CreateTodoInput {
  title: string;
  schedule_type?: ScheduleType;
  start_time?: string | DynamicDate; // ISO datetime 또는 동적 날짜
  end_time?: string;
  priority?: Priority;
  project_ids?: string[];
  recurrence?: RecurrenceConfig;
  is_today_highlight?: boolean;
  icon?: string;
  color?: string;
  anytime_duration?: number; // 분 단위
}

export interface ListTodosInput {
  date?: string | DynamicDate; // 특정 날짜의 할일
  date_range?: {
    start: string | DynamicDate;
    end: string | DynamicDate;
  };
  completed?: boolean;
  priority?: Priority;
  project_id?: string;
  schedule_type?: ScheduleType;
  limit?: number;
  offset?: number;
}

export interface GetTodoInput {
  id: string;
  include_projects?: boolean;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  schedule_type?: ScheduleType;
  start_time?: string | null;
  end_time?: string | null;
  priority?: Priority;
  completed?: boolean;
  is_today_highlight?: boolean;
  icon?: string;
  color?: string;
  anytime_duration?: number;
  recurrence?: RecurrenceConfig | null;
}

export interface DeleteTodoInput {
  id: string;
  permanent?: boolean; // 미완료 항목 강제 삭제
}

export interface CompleteTodoInput {
  id: string;
  completed: boolean;
  completion_date?: string; // 반복 할일의 특정 날짜 완료
}

export interface RescheduleTodoInput {
  id: string;
  start_time: string | DynamicDate;
  end_time?: string;
  schedule_type?: ScheduleType;
}

// ============================================================================
// 관계 및 특수 도구 타입
// ============================================================================

export interface LinkTodoToProjectInput {
  todo_id: string;
  project_id: string;
}

export interface UnlinkTodoFromProjectInput {
  todo_id: string;
  project_id: string;
}

export interface GetTodaySummaryInput {
  include_overdue?: boolean;
  timezone?: string;
}

export interface GetWeeklyReviewInput {
  week_offset?: number; // 0=이번주, -1=지난주, 1=다음주
  timezone?: string;
}

export interface CreatePlanFromTemplateInput {
  template_type: 'health' | 'finance' | 'self_development' | 'family';
  start_date?: string | DynamicDate;
  customize?: {
    title_prefix?: string;
    color?: string;
  };
}

export interface BulkRescheduleInput {
  todo_ids: string[];
  new_date?: string | DynamicDate;
  offset_days?: number;
}

export interface SearchItemsInput {
  query: string;
  types?: Array<'area' | 'resource' | 'goal' | 'project' | 'todo'>;
  limit?: number;
}

export interface GetInboxItemsInput {
  types?: Array<'goal' | 'project' | 'todo'>;
  limit?: number;
}

export interface GetOverdueTodosInput {
  include_completed?: boolean;
  limit?: number;
}

export interface GetStatisticsInput {
  period?: 'today' | 'week' | 'month' | 'year';
  timezone?: string;
}

// ============================================================================
// 신규 Projects 도구 타입 (AI 플래닝용)
// ============================================================================

/**
 * 서브태스크 입력 타입 (ADHD용 "바보같이 작게 쪼개기")
 */
export interface SubtaskInput {
  title: string;
  anytime_duration?: number;  // 예상 소요시간 (분, 기본값 5분)
}

/**
 * AI 플래닝 결과를 프로젝트와 할일로 일괄 생성하는 입력 타입
 */
export interface CreateProjectWithTodosInput {
  project: {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
  };
  todos: Array<{
    title: string;
    start_time?: string;  // 'today', 'tomorrow', 'YYYY-MM-DD'
    schedule_type?: ScheduleType;
    priority?: Priority;
    anytime_duration?: number;  // 예상 소요시간 (분)
    subtasks?: SubtaskInput[];  // ADHD용 서브태스크 (5분짜리 작은 행동들)
  }>;
}

/**
 * 프로젝트 진행률 조회 입력 타입
 */
export interface GetProjectProgressInput {
  project_id: string;
}
