/**
 * useTodoForm
 * 할일 생성/편집 공유 폼 로직 훅
 * — TodoCreatePanel, TodoEditOverlay 양쪽에서 사용
 */
import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {format, addHours, parseISO, isToday} from 'date-fns';
import {ko} from 'date-fns/locale';
import {getAlarmLabel} from '@/lib/notifications';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Types (기존 TodoFormBottomSheet에서 이동)
// ============================================

export type ScheduleType = 'anytime' | 'timed' | 'all_day';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

export interface FormData {
  title: string;
  content: string;
  icon: string;
  scheduledDate: string; // yyyy-MM-dd
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null; // minutes
  alarmOffsetMinutes: number | null;
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  completed: boolean;
}

/** 다음 정시 계산 */
export function getNextHour(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getHours() + 1);
  return next;
}

export const DEFAULT_FORM: FormData = {
  title: '',
  content: '',
  icon: '',
  scheduledDate: format(new Date(), 'yyyy-MM-dd'),
  scheduleType: 'timed',
  startTime: getNextHour(),
  endTime: addHours(getNextHour(), 1),
  anytimeDuration: null,
  alarmOffsetMinutes: 0,
  importance: false,
  urgency: false,
  isReluctantMustDo: false,
  recurrencePattern: 'none',
  recurrenceDaysOfWeek: [],
  completed: false,
};

// ============================================
// Helpers
// ============================================

export function getRecurrenceLabel(form: FormData): string {
  if (form.recurrencePattern === 'daily') return '매일';
  if (form.recurrencePattern === 'weekly') {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const days = form.recurrenceDaysOfWeek
      .sort()
      .map(d => dayNames[d])
      .join(', ');
    return days ? `매주 ${days}` : '매주';
  }
  if (form.recurrencePattern === 'monthly') return '매월';
  return '';
}

export function getDateSummary(form: FormData): string {
  const parts: string[] = [];

  const date = parseISO(form.scheduledDate);
  if (isToday(date)) {
    parts.push(`오늘, ${format(date, 'M월 d일', {locale: ko})}`);
  } else {
    parts.push(format(date, 'M월 d일 (EEE)', {locale: ko}));
  }

  if (form.scheduleType === 'timed' && form.startTime) {
    parts[0] += ` ${format(form.startTime, 'HH:mm')}`;
  }

  return parts.join(' ');
}

export function getDateSummaryExtras(form: FormData): string[] {
  const extras: string[] = [];
  if (form.alarmOffsetMinutes !== null) {
    extras.push(getAlarmLabel(form.alarmOffsetMinutes));
  }
  const recLabel = getRecurrenceLabel(form);
  if (recLabel) {
    extras.push(recLabel);
  }
  return extras;
}

// ============================================
// Hook
// ============================================

export function useTodoForm() {
  const haptic = useHaptic();
  const {createTodo, updateTodo, selectedDate} = useTodoStore();

  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [form, setForm] = useState<FormData>({...DEFAULT_FORM});
  const [saving, setSaving] = useState(false);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setForm(prev => ({...prev, [field]: value}));
    },
    [],
  );

  const resetForCreate = useCallback(
    (date?: string) => {
      const targetDate = date ?? selectedDate;
      const nextHour = getNextHour();
      setMode('create');
      setEditingTodo(null);
      setForm({
        ...DEFAULT_FORM,
        scheduledDate: targetDate,
        startTime: nextHour,
        endTime: addHours(nextHour, 1),
      });
    },
    [selectedDate],
  );

  const loadForEdit = useCallback(
    (todo: Todo) => {
      setMode('edit');
      setEditingTodo(todo);
      const startTime = todo.start_time ? new Date(todo.start_time) : null;
      const endTime = todo.end_time ? new Date(todo.end_time) : null;

      // timed인데 endTime이 없으면 자동 설정
      const resolvedEndTime =
        todo.schedule_type === 'timed' && startTime && !endTime
          ? addHours(startTime, 1)
          : endTime;

      setForm({
        title: todo.title,
        content: (todo as any).content ?? '',
        icon: todo.icon ?? '',
        scheduledDate: todo.start_time
          ? format(new Date(todo.start_time), 'yyyy-MM-dd')
          : selectedDate,
        scheduleType: (todo.schedule_type as ScheduleType) ?? 'timed',
        startTime,
        endTime: resolvedEndTime,
        anytimeDuration: todo.anytime_duration ?? null,
        alarmOffsetMinutes: (todo as any).alarm_offset_minutes ?? null,
        importance: (todo as any).importance ?? false,
        urgency: (todo as any).urgency ?? false,
        isReluctantMustDo: (todo as any).is_reluctant_must_do ?? false,
        recurrencePattern:
          (todo.recurrence_pattern as RecurrencePattern) ?? 'none',
        recurrenceDaysOfWeek: Array.isArray(todo.recurrence_days_of_week)
          ? (todo.recurrence_days_of_week as number[])
          : [],
        completed: todo.completed ?? false,
      });
    },
    [selectedDate],
  );

  const handleSave = useCallback(
    async (onSuccess?: () => void) => {
      const trimmed = form.title.trim();
      if (!trimmed) {
        haptic.warning();
        return;
      }

      setSaving(true);
      haptic.light();

      try {
        const baseData: Record<string, any> = {
          title: trimmed,
          content: form.content.trim() || null,
          icon: form.icon || null,
          schedule_type: form.scheduleType,
          importance: form.importance || null,
          urgency: form.urgency || null,
          is_reluctant_must_do: form.isReluctantMustDo,
          recurrence_pattern: form.recurrencePattern,
          completed: form.completed,
          alarm_offset_minutes: form.alarmOffsetMinutes,
        };

        if (form.scheduleType === 'timed' && form.startTime) {
          baseData.start_time = form.startTime.toISOString();
          baseData.end_time = form.endTime?.toISOString() ?? null;
        } else if (form.scheduleType === 'anytime') {
          const dayStart = new Date(selectedDate + 'T00:00:00');
          baseData.start_time = dayStart.toISOString();
          baseData.anytime_duration = form.anytimeDuration;
        } else if (form.scheduleType === 'all_day') {
          const dayStart = new Date(selectedDate + 'T00:00:00');
          baseData.start_time = dayStart.toISOString();
        }

        if (form.recurrencePattern === 'weekly') {
          baseData.recurrence_days_of_week = form.recurrenceDaysOfWeek;
        }

        let savedTodoId: string | null = null;

        if (mode === 'create') {
          const result = await createTodo(baseData as any);
          savedTodoId = result?.id ?? null;
        } else if (editingTodo) {
          await updateTodo(editingTodo.id, baseData as Partial<Todo>);
          savedTodoId = editingTodo.id;
        }

        // 알림 스케줄링
        if (savedTodoId) {
          const {scheduleTodoAlarm, cancelTodoAlarm} = await import(
            '@/lib/notifications'
          );
          if (
            form.alarmOffsetMinutes !== null &&
            form.scheduleType === 'timed' &&
            form.startTime
          ) {
            await scheduleTodoAlarm(
              savedTodoId,
              trimmed,
              form.startTime,
              form.alarmOffsetMinutes,
            );
          } else {
            await cancelTodoAlarm(savedTodoId);
          }
        }

        haptic.success();
        onSuccess?.();
      } catch {
        haptic.error();
        Alert.alert('오류', '저장에 실패했습니다');
      } finally {
        setSaving(false);
      }
    },
    [form, mode, editingTodo, selectedDate, createTodo, updateTodo, haptic],
  );

  const handleDelete = useCallback(
    (onSuccess?: () => void) => {
      if (!editingTodo) return;
      const {deleteTodo} = useTodoStore.getState();

      Alert.alert('할일 삭제', '정말 삭제하시겠어요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const {cancelTodoAlarm} = await import('@/lib/notifications');
            await cancelTodoAlarm(editingTodo.id);
            await deleteTodo(editingTodo.id);
            haptic.medium();
            onSuccess?.();
          },
        },
      ]);
    },
    [editingTodo, haptic],
  );

  return {
    form,
    setForm,
    updateField,
    mode,
    setMode,
    editingTodo,
    setEditingTodo,
    saving,
    handleSave,
    handleDelete,
    resetForCreate,
    loadForEdit,
  };
}

export type UseTodoFormReturn = ReturnType<typeof useTodoForm>;
