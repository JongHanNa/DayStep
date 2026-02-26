/**
 * Notifications Service
 * Notifee 기반 로컬 알림 스케줄링 (할일별 개별 알람)
 */
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
  IOSNotificationInterruptionLevel,
} from '@notifee/react-native';
import {Platform} from 'react-native';

// ============================================
// Constants
// ============================================

export const ALARM_OPTIONS = [
  {label: '없음', value: null},
  {label: '정각에', value: 0},
  {label: '5분 전', value: 5},
  {label: '10분 전', value: 10},
  {label: '15분 전', value: 15},
  {label: '30분 전', value: 30},
  {label: '1시간 전', value: 60},
] as const;

export type AlarmOffsetValue = (typeof ALARM_OPTIONS)[number]['value'];

const CHANNEL_ID = 'daystep-todo-alarms';

// ============================================
// Types
// ============================================

export interface RecurringTodoAlarmInfo {
  id: string;
  title: string;
  startTime: string;           // 원본 start_time (시:분 추출용, ISO string)
  offsetMinutes: number;
  recurrencePattern: string;   // 'daily' | 'weekly'
  recurrenceDaysOfWeek: number[];
  recurrenceEndDate: string | null;
}

// ============================================
// Private Helpers
// ============================================

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function occursOnDate(
  recurrencePattern: string,
  recurrenceDaysOfWeek: number[],
  recurrenceEndDate: string | null,
  originStart: string,
  date: Date,
): boolean {
  const dateStr = formatDateStr(date);
  const originDateStr = originStart.substring(0, 10);
  if (dateStr < originDateStr) return false;
  if (recurrenceEndDate && dateStr >= recurrenceEndDate) return false;
  if (recurrencePattern === 'daily') return true;
  if (recurrencePattern === 'weekly') {
    return recurrenceDaysOfWeek.includes(date.getDay());
  }
  return false;
}

// ============================================
// Setup
// ============================================

/** Android 알림 채널 생성 (iOS에서는 no-op) */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'DayStep 할일 알림',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

/** iOS 알림 권한 요청 — 처음 알람 설정 시 호출 */
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

// ============================================
// Scheduling
// ============================================

/**
 * 할일 알람 스케줄링
 * @param todoId - 고유 ID (알림 ID로 사용)
 * @param title - 알림 제목
 * @param startTime - 할일 시작 시간 (ISO string or Date)
 * @param offsetMinutes - 알람 오프셋 (0=정각, 5=5분전 등)
 * @param occurrenceDate - 반복 할일 발생 날짜 (yyyy-MM-dd). 있으면 날짜별 ID 사용
 */
export async function scheduleTodoAlarm(
  todoId: string,
  title: string,
  startTime: string | Date,
  offsetMinutes: number,
  occurrenceDate?: string,
): Promise<void> {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;

  let triggerTime: Date;
  let notificationId: string;

  if (occurrenceDate) {
    // 반복 할일: occurrenceDate에 원본 시:분 조합으로 트리거 시간 계산
    const hours = start.getHours();
    const minutes = start.getMinutes();
    const occurrenceDateTime = new Date(occurrenceDate + 'T00:00:00');
    occurrenceDateTime.setHours(hours, minutes, 0, 0);
    triggerTime = new Date(
      occurrenceDateTime.getTime() - offsetMinutes * 60 * 1000,
    );
    notificationId = `todo-${todoId}-${occurrenceDate}`;
  } else {
    triggerTime = new Date(start.getTime() - offsetMinutes * 60 * 1000);
    notificationId = `todo-${todoId}`;
  }

  // 과거 시간이면 스킵
  if (triggerTime.getTime() <= Date.now()) {
    return;
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTime.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: 'DayStep',
      body:
        offsetMinutes === 0
          ? `지금 시작: ${title}`
          : `${offsetMinutes}분 후 시작: ${title}`,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
        interruptionLevel: IOSNotificationInterruptionLevel.TIME_SENSITIVE,
      },
    },
    trigger,
  );
  console.log(`[Notifications] scheduled ${notificationId}`);
}

/**
 * 할일 알람 취소
 */
export async function cancelTodoAlarm(todoId: string): Promise<void> {
  await notifee.cancelNotification(`todo-${todoId}`);
}

/**
 * 특정 날짜의 반복 할일 알람 취소
 */
export async function cancelTodoAlarmForDate(
  todoId: string,
  occurrenceDate?: string,
): Promise<void> {
  const id = occurrenceDate
    ? `todo-${todoId}-${occurrenceDate}`
    : `todo-${todoId}`;
  await notifee.cancelNotification(id);
}

/**
 * 반복 할일의 모든 날짜별 알람 취소 (todo-${id}-* 패턴 일괄 취소)
 */
export async function cancelAllRecurringAlarms(todoId: string): Promise<void> {
  const notifications = await notifee.getTriggerNotifications();
  const prefix = `todo-${todoId}-`;
  const toCancel = notifications
    .filter(n => n.notification.id?.startsWith(prefix))
    .map(n => n.notification.id!);

  await Promise.all(toCancel.map(id => notifee.cancelNotification(id)));
  // 날짜 없는 기본 ID도 취소 (이전 방식으로 등록된 것 대비)
  await notifee.cancelNotification(`todo-${todoId}`);
}

/**
 * 반복 할일 목록의 알림을 오늘부터 daysAhead일치 스케줄
 */
export async function scheduleRecurringAlarmsForRange(
  todos: RecurringTodoAlarmInfo[],
  daysAhead = 14,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const todo of todos) {
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
      if (
        occursOnDate(
          todo.recurrencePattern,
          todo.recurrenceDaysOfWeek,
          todo.recurrenceEndDate,
          todo.startTime,
          date,
        )
      ) {
        await scheduleTodoAlarm(
          todo.id,
          todo.title,
          todo.startTime,
          todo.offsetMinutes,
          formatDateStr(date),
        );
      }
    }
  }
}

/**
 * DB에서 반복+알람 할일을 조회하여 14일치 알람 재스케줄
 * 앱 시작 및 포그라운드 복귀 시 호출
 */
export async function scheduleExistingRecurringAlarms(): Promise<void> {
  const {supabase} = await import('@/lib/supabase');
  const {useAuthStore} = await import('@/stores/authStore');

  const user = useAuthStore.getState().user;
  if (!user) return;

  const {data, error} = await supabase
    .from('todos')
    .select(
      'id, title, start_time, alarm_offset_minutes, recurrence_pattern, recurrence_days_of_week, recurrence_end_date',
    )
    .eq('user_id', user.id)
    .neq('recurrence_pattern', 'none')
    .not('alarm_offset_minutes', 'is', null)
    .eq('schedule_type', 'timed');

  if (error) {
    console.warn(
      '[Notifications] failed to load recurring todos:',
      error.message,
    );
    return;
  }

  if (!data || data.length === 0) return;

  const todosInfo: RecurringTodoAlarmInfo[] = data
    .filter(t => t.start_time && t.alarm_offset_minutes !== null)
    .map(t => ({
      id: t.id as string,
      title: t.title as string,
      startTime: t.start_time as string,
      offsetMinutes: t.alarm_offset_minutes as number,
      recurrencePattern: t.recurrence_pattern as string,
      recurrenceDaysOfWeek: Array.isArray(t.recurrence_days_of_week)
        ? (t.recurrence_days_of_week as number[])
        : [],
      recurrenceEndDate: (t.recurrence_end_date as string | null) ?? null,
    }));

  await scheduleRecurringAlarmsForRange(todosInfo);
  console.log(
    `[Notifications] scheduled recurring alarms for ${todosInfo.length} todos`,
  );
}

// ============================================
// Utilities
// ============================================

/**
 * 알람 오프셋 라벨 반환
 */
export function getAlarmLabel(offsetMinutes: number | null): string {
  const option = ALARM_OPTIONS.find(o => o.value === offsetMinutes);
  return option?.label ?? '없음';
}
