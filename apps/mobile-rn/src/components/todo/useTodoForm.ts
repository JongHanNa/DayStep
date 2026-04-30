/**
 * useTodoForm
 * 할일 생성/편집 공유 폼 로직 훅
 * — TodoCreatePanel, TodoEditOverlay 양쪽에서 사용
 */
import {useCallback, useState} from 'react';
import {Alert, ActionSheetIOS, Platform} from 'react-native';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useLimitCheck} from '@/hooks/useLimitCheck';
import {format, addHours, parseISO, isToday, isSameDay} from 'date-fns';
import {ko} from 'date-fns/locale';
import {getAlarmsLabel} from '@/lib/notifications';
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
  color: string;
  scheduledDate: string; // yyyy-MM-dd
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null; // minutes
  alarmOffsets: number[];         // 복수 알람 오프셋 (분)
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  completed: boolean;
  projectId: string | null;
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
  color: '',
  scheduledDate: format(new Date(), 'yyyy-MM-dd'),
  scheduleType: 'timed',
  startTime: getNextHour(),
  endTime: addHours(getNextHour(), 1),
  anytimeDuration: null,
  alarmOffsets: [],
  importance: false,
  urgency: false,
  isReluctantMustDo: false,
  recurrencePattern: 'none',
  recurrenceDaysOfWeek: [],
  completed: false,
  projectId: null,
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
  const date = parseISO(form.scheduledDate);

  // 다일 시간 지정 — 시작일과 끝일이 다르면 양쪽 날짜 모두 표시
  if (
    form.scheduleType === 'timed' &&
    form.startTime &&
    form.endTime &&
    !isSameDay(form.startTime, form.endTime)
  ) {
    const startStr = format(form.startTime, 'M월 d일 (EEE) HH:mm', {locale: ko});
    const endStr = format(form.endTime, 'M월 d일 (EEE) HH:mm', {locale: ko});
    return `${startStr} → ${endStr}`;
  }

  // 다일 종일 — 시작일과 끝일이 다르면 양쪽 날짜 모두 표시
  if (
    form.scheduleType === 'all_day' &&
    form.startTime &&
    form.endTime &&
    !isSameDay(form.startTime, form.endTime)
  ) {
    const startStr = format(form.startTime, 'M월 d일 (EEE)', {locale: ko});
    const endStr = format(form.endTime, 'M월 d일 (EEE)', {locale: ko});
    return `${startStr} → ${endStr} 종일`;
  }

  const parts: string[] = [];
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
  if (form.anytimeDuration) {
    extras.push(`${form.anytimeDuration}분`);
  }
  if (form.alarmOffsets.length > 0) {
    extras.push(getAlarmsLabel(form.alarmOffsets));
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
  const {checkLimit, isLimitReached, limitedEntity, currentCount, maxCount, closeLimitModal} = useLimitCheck();

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
      // targetDate의 날짜에 맞춰 startTime/endTime 조정
      const [year, month, day] = targetDate.split('-').map(Number);
      const startTime = new Date(nextHour);
      startTime.setFullYear(year, month - 1, day);
      const endTime = addHours(startTime, 1);

      setMode('create');
      setEditingTodo(null);
      setForm({
        ...DEFAULT_FORM,
        scheduledDate: targetDate,
        startTime,
        endTime,
        projectId: null,
      });
    },
    [selectedDate],
  );

  const loadForEdit = useCallback(
    async (todo: Todo) => {
      setMode('edit');
      setEditingTodo(todo);

      // todo_alarms를 먼저 로드하여 레이스 컨디션 방지
      const {supabase} = await import('@/lib/supabase');
      const {data: alarmData} = await supabase
        .from('todo_alarms')
        .select('offset_minutes')
        .eq('todo_id', todo.id)
        .order('offset_minutes', {ascending: false});
      const alarmOffsets = alarmData?.map(r => r.offset_minutes) ?? [];

      const startTime = todo.start_time ? new Date(todo.start_time) : null;
      let endTime = todo.end_time ? new Date(todo.end_time) : null;

      // 종일: DB는 inclusive end(23:59:59.999) — UI는 그 날 자체로 표시되도록 시간 0 정규화
      if (todo.schedule_type === 'all_day' && endTime) {
        endTime.setHours(0, 0, 0, 0);
      }

      // timed인데 endTime이 없으면 자동 설정
      const resolvedEndTime =
        todo.schedule_type === 'timed' && startTime && !endTime
          ? addHours(startTime, 1)
          : endTime;

      setForm({
        title: todo.title,
        content: (todo as any).content ?? '',
        icon: todo.icon ?? '',
        color: todo.color ?? '',
        scheduledDate: todo.start_time
          ? format(new Date(todo.start_time), 'yyyy-MM-dd')
          : selectedDate,
        scheduleType: (todo.schedule_type as ScheduleType) ?? 'timed',
        startTime,
        endTime: resolvedEndTime,
        anytimeDuration: todo.anytime_duration ?? null,
        alarmOffsets,
        importance: (todo as any).importance ?? false,
        urgency: (todo as any).urgency ?? false,
        isReluctantMustDo: (todo as any).is_reluctant_must_do ?? false,
        recurrencePattern:
          (todo.recurrence_pattern as RecurrencePattern) ?? 'none',
        recurrenceDaysOfWeek: Array.isArray(todo.recurrence_days_of_week)
          ? (todo.recurrence_days_of_week as number[])
          : [],
        completed: todo.completed ?? false,
        projectId: (todo as any).project_id ?? null,
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
          color: form.color || null,
          schedule_type: form.scheduleType,
          importance: form.importance || null,
          urgency: form.urgency || null,
          is_reluctant_must_do: form.isReluctantMustDo,
          recurrence_pattern: form.recurrencePattern,
          completed: form.completed,
          project_id: form.projectId,
        };

        if (form.scheduleType === 'timed' && form.startTime) {
          baseData.start_time = form.startTime.toISOString();
          baseData.end_time = form.endTime?.toISOString() ?? null;
        } else if (form.scheduleType === 'anytime') {
          const dayStart = new Date(form.scheduledDate + 'T00:00:00');
          baseData.start_time = dayStart.toISOString();
          baseData.anytime_duration = form.anytimeDuration;
        } else if (form.scheduleType === 'all_day') {
          // 종일: 시작은 그 날 00:00, 끝은 그 날 23:59:59.999 (inclusive end)
          // 다일이면 form.endTime의 날짜를 그대로 살리고, 단일이면 startTime과 같은 날
          const start = form.startTime
            ? new Date(form.startTime)
            : new Date(form.scheduledDate + 'T00:00:00');
          start.setHours(0, 0, 0, 0);
          baseData.start_time = start.toISOString();

          const endBase = form.endTime ?? start;
          const end = new Date(endBase);
          end.setHours(23, 59, 59, 999);
          baseData.end_time = end.toISOString();
        }

        if (form.recurrencePattern === 'weekly') {
          baseData.recurrence_days_of_week = form.recurrenceDaysOfWeek;
        }

        let savedTodoId: string | null = null;

        if (mode === 'create') {
          const entityType = form.recurrencePattern !== 'none' ? 'habit' : 'todo';
          const allowed = await checkLimit(entityType);
          if (!allowed) {
            setSaving(false);
            return;
          }
          const result = await createTodo(baseData as any);
          savedTodoId = result?.id ?? null;
        } else if (editingTodo) {
          await updateTodo(editingTodo.id, baseData as Partial<Todo>);
          savedTodoId = editingTodo.id;
        }

        // todo_alarms 테이블 sync + 알림 스케줄링
        if (savedTodoId) {
          const {supabase} = await import('@/lib/supabase');
          const {useAuthStore} = await import('@/stores/authStore');
          const user = useAuthStore.getState().user;

          // todo_alarms 테이블 sync
          const {error: deleteError} = await supabase
            .from('todo_alarms')
            .delete()
            .eq('todo_id', savedTodoId);
          if (deleteError) throw deleteError;

          if (form.alarmOffsets.length > 0 && user) {
            const {error: insertError} = await supabase
              .from('todo_alarms')
              .insert(
                form.alarmOffsets.map(offset => ({
                  todo_id: savedTodoId!,
                  user_id: user.id,
                  offset_minutes: offset,
                })),
              );
            if (insertError) throw insertError;
          }

          // 알림 스케줄링
          const {
            cancelAllTodoAlarms,
            scheduleAllTodoAlarms,
            scheduleRecurringAlarmsForRange,
          } = await import('@/lib/notifications');

          await cancelAllTodoAlarms(savedTodoId);

          if (
            form.alarmOffsets.length > 0 &&
            form.scheduleType === 'timed' &&
            form.startTime
          ) {
            const isRecurring = form.recurrencePattern !== 'none';
            if (isRecurring) {
              await scheduleRecurringAlarmsForRange([{
                id: savedTodoId,
                title: trimmed,
                startTime: form.startTime.toISOString(),
                offsets: form.alarmOffsets,
                recurrencePattern: form.recurrencePattern,
                recurrenceDaysOfWeek: form.recurrenceDaysOfWeek,
                recurrenceEndDate: null,
              }]);
            } else {
              await scheduleAllTodoAlarms(
                savedTodoId,
                trimmed,
                form.startTime,
                form.alarmOffsets,
              );
            }
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
      const isRecurring =
        !!(editingTodo as any).recurrence_pattern &&
        (editingTodo as any).recurrence_pattern !== 'none';

      // 비반복 — 단순 삭제
      if (!isRecurring) {
        Alert.alert('할일 삭제', '정말 삭제하시겠어요?', [
          {text: '취소', style: 'cancel'},
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              const {cancelAllTodoAlarms} = await import('@/lib/notifications');
              const {deleteTodo} = useTodoStore.getState();
              await cancelAllTodoAlarms(editingTodo.id);
              await deleteTodo(editingTodo.id);
              haptic.medium();
              onSuccess?.();
            },
          },
        ]);
        return;
      }

      // 반복 — 삭제 범위 ActionSheet (지금/지금부터/모든 미완료/취소)
      const occurrenceDate = editingTodo.start_time
        ? format(new Date(editingTodo.start_time), 'yyyy-MM-dd')
        : selectedDate;

      const performDelete = async (deleteType: 'this' | 'future' | 'all') => {
        try {
          const {supabase} = await import('@/lib/supabase');
          const {useAuthStore} = await import('@/stores/authStore');
          const {cancelAllTodoAlarms} = await import('@/lib/notifications');
          const userId = useAuthStore.getState().user?.id;
          if (!userId) throw new Error('Not authenticated');

          if (deleteType === 'this') {
            // 이 occurrence만 exclusion 등록 (다른 회차는 유지)
            const {error} = await supabase.from('todo_exclusions').insert({
              parent_todo_id: editingTodo.id,
              excluded_date: occurrenceDate,
              user_id: userId,
              exclusion_reason: 'deleted',
            });
            if (error) throw error;
            await useTodoStore.getState().fetchTodosForDate(occurrenceDate);
          } else if (deleteType === 'future') {
            // recurrence_end_date를 이 occurrence 직전 날짜로 설정 → 이 occurrence부터 사라짐
            const prev = new Date(parseISO(occurrenceDate).getTime() - 86_400_000);
            const prevStr = format(prev, 'yyyy-MM-dd');
            const {error} = await supabase
              .from('todos')
              .update({recurrence_end_date: prevStr})
              .eq('id', editingTodo.id);
            if (error) throw error;
            await cancelAllTodoAlarms(editingTodo.id);
            await useTodoStore.getState().fetchTodosForDate(occurrenceDate);
          } else {
            // 'all' — 원본 todo 삭제 (모든 occurrence 사라짐)
            await cancelAllTodoAlarms(editingTodo.id);
            await useTodoStore.getState().deleteTodo(editingTodo.id);
          }

          haptic.medium();
          onSuccess?.();
        } catch (e) {
          haptic.error();
          Alert.alert('오류', '삭제에 실패했습니다');
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: '반복 작업을 삭제하고 있습니다',
            message: '삭제 범위를 확인해주세요',
            options: ['지금 반복', '지금부터 모든 반복', '모든 미완료 반복 주기', '취소'],
            cancelButtonIndex: 3,
            destructiveButtonIndex: 2,
          },
          (idx) => {
            if (idx === 0) performDelete('this');
            else if (idx === 1) performDelete('future');
            else if (idx === 2) performDelete('all');
          },
        );
      } else {
        Alert.alert('반복 작업을 삭제하고 있습니다', '삭제 범위를 확인해주세요', [
          {text: '지금 반복', onPress: () => performDelete('this')},
          {text: '지금부터 모든 반복', onPress: () => performDelete('future')},
          {
            text: '모든 미완료 반복 주기',
            style: 'destructive',
            onPress: () => performDelete('all'),
          },
          {text: '취소', style: 'cancel'},
        ]);
      }
    },
    [editingTodo, haptic, selectedDate],
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
    // 한도 체크 관련
    isLimitReached,
    limitedEntity,
    currentCount,
    maxCount,
    closeLimitModal,
  };
}

export type UseTodoFormReturn = ReturnType<typeof useTodoForm>;
