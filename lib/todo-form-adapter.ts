/**
 * 타임라인 TodoFormModal과 TodoFormData 간 변환 어댑터
 *
 * 목적:
 * - useTodoFormState의 상태를 TodoFormData로 변환
 * - TodoFormData 변경사항을 useTodoFormState 액션으로 변환
 */

import type { TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import type { TodoFormStateValues } from '@/hooks/useTodoFormState';
import { format } from 'date-fns';

/**
 * TodoFormStateValues → TodoFormData 변환
 */
export function convertToTodoFormData(values: TodoFormStateValues): TodoFormData {
  // 날짜 변환 (시간대 안전)
  const scheduledDate = values.startDate ? new Date(`${values.startDate}T00:00:00`) : undefined;
  const endDate = values.endDate ? new Date(`${values.endDate}T00:00:00`) : undefined;
  const recurrenceEndDate = values.recurrenceEndDate ? new Date(`${values.recurrenceEndDate}T00:00:00`) : undefined;

  return {
    title: values.content,
    icon: values.selectedIcon,
    color: values.selectedColor,

    // 스케줄 관련
    scheduleType: values.scheduleType,
    scheduledDate,
    includeTime: values.scheduleType === 'timed',
    startTime: values.startTime || undefined,
    endDate,
    endTime: values.endTime || undefined,
    includeEndDate: !!values.endDate,

    // 언제든지 모드의 예상 소요 시간
    anytimeDuration: values.durationHours * 60 + values.durationMins,

    // 반복 설정
    recurrencePattern: values.recurrencePattern,
    recurrenceInterval: values.recurrenceInterval,
    recurrenceEndType: values.recurrenceEndType,
    recurrenceEndDate,
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
