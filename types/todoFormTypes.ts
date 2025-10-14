import type { Todo } from '@/types';

/**
 * TodoFormModal 컴포넌트의 Props 타입
 */
export interface TodoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTodo?: Todo | null; // 수정할 할일 (있으면 수정 모드, 없으면 추가 모드)
  initialStartTime?: Date | null;
  initialEndTime?: Date | null;
}

/**
 * 터치 이벤트 핸들러 타입
 */
export interface TouchHandlers {
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

/**
 * 스크롤 관련 상태 및 핸들러 타입
 */
export interface ScrollState {
  scrollTop: number;
  setScrollTop: (scrollTop: number) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

/**
 * 반복 일정 삭제 타입
 */
export type RecurringDeleteType = 'this' | 'future' | 'all';

/**
 * 반복 종료 타입
 */
export type RecurrenceEndType = 'never' | 'date' | 'count';

/**
 * 우선순위 타입
 */
export type TodoPriority = 'low' | 'medium' | 'high';

/**
 * 성공 메시지 생성을 위한 설정
 */
export interface SuccessMessageConfig {
  isEditMode: boolean;
  scheduleType: string;
  startDate: string;
  startTime: string;
  showRecurrenceSettings: boolean;
  recurrencePattern: string;
  recurrenceInterval: number;
}

/**
 * 폼 검증 결과 타입
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorTitle?: string;
}

/**
 * 스케줄 시간 계산 결과
 */
export interface TimeCalculationResult {
  endDate: string;
  endTime: string;
}

/**
 * 반복 설정 검증 구성
 */
export interface RecurrenceValidation {
  hasRecurrence: boolean;
  isWeekly: boolean;
  hasSelectedDays: boolean;
  hasEndDate: boolean;
  hasEndCount: boolean;
}

/**
 * 할일 데이터 구성을 위한 기본 정보
 */
export interface TodoDataBase {
  title: string;
  priority: TodoPriority;
  icon: string;
  schedule_type: string;
}

/**
 * 시간 설정이 포함된 할일 데이터
 */
export interface TodoDataWithTime extends TodoDataBase {
  start_time?: string;
  end_time?: string;
}

/**
 * 반복 설정이 포함된 할일 데이터
 */
export interface TodoDataWithRecurrence extends TodoDataWithTime {
  recurrence_pattern?: string;
  recurrence_interval?: number;
  recurrence_days_of_week?: number[];
  recurrence_end_date?: string;
  recurrence_count?: number;
}

/**
 * 완전한 할일 데이터 타입 (모든 설정 포함)
 */
export type CompleteTodoData = TodoDataWithRecurrence;

/**
 * 반복 설명 매핑 타입
 */
export interface RecurrenceDescriptions {
  daily: string;
  weekly: string;
  monthly: string;
  custom: string;
  none: string;
}

/**
 * 삭제 메시지 매핑 타입
 */
export interface DeleteMessages {
  this: string;
  future: string;
  all: string;
}