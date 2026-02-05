import { Todo } from '@/entities/todo/Todo';
import type { Note } from '@/types/domain';
import type { TimeGap } from '@/lib/timeGapUtils';

// ─── Props ───────────────────────────────────────
export interface TodoTimelineViewProps {
  userId: string;
}

// ─── 타임라인 아이템 타입 (일반 할일 + 반복 인스턴스 통합) ───
export interface TimelineItem {
  id: string;
  title: string;
  completed: boolean;
  startTime: Date | null;
  endTime: Date | null;
  scheduleType: string;
  createdAt: Date;
  projectId?: string | null;
  goalId?: string | null;
  departmentId?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex: number;
  recurrencePattern?: string | null;
  recurrenceInterval?: number | null;
  recurrenceEndDate?: Date | null;
  recurrenceCount?: number | null;
  recurrenceDaysOfWeek?: number[] | null;
  // 반복 인스턴스 전용 필드
  isRecurrenceInstance?: boolean;
  recurrenceSourceId?: string;
  recurrenceOccurrenceDate?: string;
  isSkipped?: boolean;
  exclusionReason?: 'deleted' | 'skipped' | 'postponed' | 'not_needed' | 'missed';
  skipStatus?: 'not_needed' | 'missed' | null;
  // 실제 수행 인스턴스 (미루기 후 완료)
  isActualExecution?: boolean;
  originalStartTime?: string;
  originalEndTime?: string;
  postponedToTime?: string;
  postponedToStartTime?: string;
  // 원본 Todo 참조 (편집 모달용)
  originalTodo?: Todo;
}

// ─── 렌더 아이템 (할일 + 빈 시간 통합) ───
export type RenderItem =
  | { type: 'todo'; data: TimelineItem }
  | { type: 'gap'; data: TimeGap; index: number };

// ─── 맵 값 타입 ───
export interface ProjectMapValue {
  title: string;
  color: string | null;
  icon: string | null;
}

export interface DepartmentMapValue {
  name: string;
  color: string | null;
  icon: string | null;
}

// ─── 뷰 모드 ───
export type TimelineViewMode = 'agenda' | 'daily';

// ─── TimelineItem → Todo 변환 유틸 ───
export function timelineItemToTodo(item: TimelineItem): Todo {
  // 비반복 인스턴스는 원본 Todo를 그대로 사용
  if (item.originalTodo && !item.isRecurrenceInstance) {
    return item.originalTodo;
  }

  // 반복 인스턴스: 원본 Todo 기반 + 인스턴스별 필드 오버라이드
  if (item.originalTodo && item.isRecurrenceInstance) {
    const orig = item.originalTodo;
    return Todo.fromDatabase({
      id: item.id,
      user_id: orig.userId,
      title: item.title,
      completed: item.completed,
      order_index: item.orderIndex,
      created_at: item.createdAt?.toISOString(),
      updated_at: orig.updatedAt?.toISOString(),
      priority: orig.priority,
      icon: item.icon ?? orig.icon,
      color: item.color ?? orig.color,
      schedule_type: item.scheduleType,
      start_time: item.startTime?.toISOString() ?? null,
      end_time: item.endTime?.toISOString() ?? null,
      recurrence_pattern: orig.recurrencePattern,
      recurrence_end_date: orig.recurrenceEndDate?.toISOString() ?? null,
      recurrence_count: orig.recurrenceCount,
      recurrence_interval: orig.recurrenceInterval,
      recurrence_days_of_week: orig.recurrenceDaysOfWeek,
      recurrence_day_of_month: orig.recurrenceDayOfMonth,
      parent_todo_id: orig.parentTodoId,
      project_id: orig.projectId,
      goal_id: orig.goalId,
      area_id: orig.areaId,
      resource_id: orig.resourceId,
      department_id: orig.departmentId,
      importance: orig.importance,
      urgency: orig.urgency,
      is_reluctant_must_do: orig.isReluctantMustDo,
      skip_status: item.skipStatus ?? null,
    });
  }

  // originalTodo가 없는 경우 (안전장치)
  return Todo.fromDatabase({
    id: item.id,
    title: item.title,
    completed: item.completed,
    order_index: item.orderIndex,
    created_at: item.createdAt?.toISOString(),
    schedule_type: item.scheduleType,
    start_time: item.startTime?.toISOString() ?? null,
    end_time: item.endTime?.toISOString() ?? null,
    icon: item.icon,
    color: item.color,
    importance: null,
    urgency: null,
    is_reluctant_must_do: false,
  });
}

// ─── 상수 ───
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
