/**
 * 타임라인 TodoFormModal과 TodoFormData 간 변환 어댑터
 *
 * 목적:
 * - useTodoFormState의 상태를 TodoFormData로 변환
 * - TodoFormData 변경사항을 useTodoFormState 액션으로 변환
 */

import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { TodoFormStateValues } from '@/hooks/useTodoFormState';
import { format, parse } from 'date-fns';

/**
 * TodoFormStateValues → TodoFormData 변환
 */
export function convertToTodoFormData(values: TodoFormStateValues): TodoFormData {
  return {
    title: values.content,
    icon: values.selectedIcon,
    color: values.selectedColor,

    // 타임라인에서는 기본적으로 '일정' 선택 상태
    clarification: 'schedule_clear',
    nextActionStatuses: [],

    // 스케줄 관련 (time_unscheduled는 timed로 변환)
    scheduleType: values.scheduleType === 'time_unscheduled' ? 'timed' : values.scheduleType,
    scheduledDate: values.startDate ? parse(values.startDate, 'yyyy-MM-dd', new Date()) : undefined,
    includeTime: values.scheduleType === 'timed',
    startTime: values.startTime || undefined,
    endDate: values.endDate ? parse(values.endDate, 'yyyy-MM-dd', new Date()) : undefined,
    endTime: values.endTime || undefined,
    includeEndDate: !!values.endDate,

    // 언제든지 모드의 예상 소요 시간
    anytimeDuration: values.durationHours * 60 + values.durationMins,

    // 반복 설정
    recurrencePattern: values.recurrencePattern,
    recurrenceInterval: values.recurrenceInterval,
    recurrenceEndType: values.recurrenceEndType,
    recurrenceEndDate: values.recurrenceEndDate ? parse(values.recurrenceEndDate, 'yyyy-MM-dd', new Date()) : undefined,
    recurrenceCount: values.recurrenceCount,
    selectedDaysOfWeek: values.selectedDaysOfWeek,

    // 메타데이터 (타임라인에서는 사용 안 함)
    isHighlight: false,
    completed: false,

    // 연결 정보 (타임라인에서는 사용 안 함)
    projectIds: [],
    noteIds: [],
  };
}

/**
 * TodoFormData 변경사항을 개별 상태 업데이트로 변환
 */
export function getTodoFormDataChanges(updated: TodoFormData): Partial<TodoFormStateValues> {
  const changes: Partial<TodoFormStateValues> = {};

  if (updated.title !== undefined) {
    changes.content = updated.title;
  }

  if (updated.icon !== undefined) {
    changes.selectedIcon = updated.icon as any;
  }

  if (updated.color !== undefined) {
    changes.selectedColor = updated.color;
  }

  if (updated.scheduleType !== undefined) {
    changes.scheduleType = updated.scheduleType;
  }

  if (updated.scheduledDate !== undefined) {
    changes.startDate = format(updated.scheduledDate, 'yyyy-MM-dd');
  }

  if (updated.startTime !== undefined) {
    changes.startTime = updated.startTime;
  }

  if (updated.endDate !== undefined) {
    changes.endDate = format(updated.endDate, 'yyyy-MM-dd');
  }

  if (updated.endTime !== undefined) {
    changes.endTime = updated.endTime;
  }

  if (updated.anytimeDuration !== undefined) {
    changes.durationHours = Math.floor(updated.anytimeDuration / 60);
    changes.durationMins = updated.anytimeDuration % 60;
  }

  if (updated.recurrencePattern !== undefined) {
    changes.recurrencePattern = updated.recurrencePattern as any;
  }

  if (updated.recurrenceInterval !== undefined) {
    changes.recurrenceInterval = updated.recurrenceInterval;
  }

  if (updated.recurrenceEndType !== undefined) {
    changes.recurrenceEndType = updated.recurrenceEndType;
  }

  if (updated.recurrenceEndDate !== undefined) {
    changes.recurrenceEndDate = format(updated.recurrenceEndDate, 'yyyy-MM-dd');
  }

  if (updated.recurrenceCount !== undefined) {
    changes.recurrenceCount = updated.recurrenceCount;
  }

  if (updated.selectedDaysOfWeek !== undefined) {
    changes.selectedDaysOfWeek = updated.selectedDaysOfWeek;
  }

  return changes;
}
