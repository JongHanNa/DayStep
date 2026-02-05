import type { Todo } from '@/entities/todo/Todo';
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

// ─── 상수 ───
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
