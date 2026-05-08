/**
 * Notifications Service
 * Notifee 기반 로컬 알림 스케줄링 (할일별 개별 알람)
 */
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
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
  offsets: number[];           // 복수 알람 오프셋
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
      name: '일상투두 할일 알림',
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
    notificationId = `todo-${todoId}-o${offsetMinutes}-${occurrenceDate}`;
  } else {
    triggerTime = new Date(start.getTime() - offsetMinutes * 60 * 1000);
    notificationId = `todo-${todoId}-o${offsetMinutes}`;
  }

  // 과거 시간이면 스킵
  if (triggerTime.getTime() <= Date.now()) {
    return;
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTime.getTime(),
    // Android: Doze 모드에서도 정확 발화 (setExactAndAllowWhileIdle)
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  await notifee.createTriggerNotification(
    {
      id: notificationId,
      title: '일상투두',
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
        ...(Platform.OS === 'ios' ? {interruptionLevel: 'timeSensitive' as any} : {}),
      },
    },
    trigger,
  );
  console.log(`[Notifications] scheduled ${notificationId}`);
}

/**
 * 할일의 모든 알람 취소 (todo-${id}-* prefix 일괄 취소)
 */
export async function cancelAllTodoAlarms(todoId: string): Promise<void> {
  const notifications = await notifee.getTriggerNotifications();
  const prefix = `todo-${todoId}-`;
  const toCancel = notifications
    .filter(n => n.notification.id?.startsWith(prefix))
    .map(n => n.notification.id!);

  await Promise.all(toCancel.map(id => notifee.cancelNotification(id)));
}

/**
 * @deprecated cancelAllTodoAlarms 사용
 */
export async function cancelTodoAlarm(todoId: string): Promise<void> {
  await cancelAllTodoAlarms(todoId);
}

/**
 * @deprecated cancelAllTodoAlarms 사용
 */
export async function cancelAllRecurringAlarms(todoId: string): Promise<void> {
  await cancelAllTodoAlarms(todoId);
}

/**
 * 단일 todo에 복수 offset 알람을 한 번에 스케줄
 */
export async function scheduleAllTodoAlarms(
  todoId: string,
  title: string,
  startTime: string | Date,
  offsets: number[],
  occurrenceDate?: string,
): Promise<void> {
  await Promise.all(
    offsets.map(offset =>
      scheduleTodoAlarm(todoId, title, startTime, offset, occurrenceDate),
    ),
  );
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
        await scheduleAllTodoAlarms(
          todo.id,
          todo.title,
          todo.startTime,
          todo.offsets,
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
      'id, title, start_time, recurrence_pattern, recurrence_days_of_week, recurrence_end_date, todo_alarms(offset_minutes)',
    )
    .eq('user_id', user.id)
    .neq('recurrence_pattern', 'none')
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
    .filter(t => t.start_time && Array.isArray((t as any).todo_alarms) && (t as any).todo_alarms.length > 0)
    .map(t => ({
      id: t.id as string,
      title: t.title as string,
      startTime: t.start_time as string,
      offsets: ((t as any).todo_alarms as {offset_minutes: number}[]).map(a => a.offset_minutes),
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

// ============================================
// Trial Expiry Reminder
// ============================================

const TRIAL_REMINDER_ID = 'trial-expiry-reminder';

/**
 * 무료체험 만료 1일 전 로컬 알림 스케줄링
 * @param trialDays - 체험 기간 (기본 7일)
 */
export async function scheduleTrialExpiryReminder(trialDays: number = 7): Promise<void> {
  // 만료 1일 전 = (trialDays - 1)일 후, 오전 10시
  const triggerDate = new Date();
  triggerDate.setDate(triggerDate.getDate() + (trialDays - 1));
  triggerDate.setHours(10, 0, 0, 0);

  // 이미 과거면 스킵
  if (triggerDate.getTime() <= Date.now()) return;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id: TRIAL_REMINDER_ID,
      title: '일상투두 Pro 무료 체험 안내',
      body: '무료 체험이 내일 종료됩니다. 취소를 원하시면 설정에서 변경해주세요.',
      android: {channelId: CHANNEL_ID, importance: AndroidImportance.HIGH},
      ios: {sound: 'default'},
    },
    trigger,
  );
  console.log(`[Notifications] scheduled trial expiry reminder for ${triggerDate.toISOString()}`);
}

/** 트라이얼 만료 알림 취소 */
export async function cancelTrialExpiryReminder(): Promise<void> {
  await notifee.cancelNotification(TRIAL_REMINDER_ID);
}

// ============================================
// Sleep Bedtime Notification
// ============================================

const SLEEP_BEDTIME_ID = 'sleep-bedtime-reminder';

/**
 * 다음 취침 시간에 time-sensitive 로컬 알림 스케줄링
 * @param sleepGoalTime - HH:mm 형식의 목표 취침 시간
 */
export async function scheduleSleepBedtimeNotification(sleepGoalTime: string): Promise<void> {
  // 기존 알림 취소 후 재스케줄
  await notifee.cancelNotification(SLEEP_BEDTIME_ID);

  const [h, m] = sleepGoalTime.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(h, m, 0, 0);

  // 이미 지난 시간이면 내일로
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id: SLEEP_BEDTIME_ID,
      title: '취침 시간이에요 🌙',
      body: '수면 정원에서 잠들기를 시작해보세요.',
      data: {type: 'sleep-bedtime'},
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        importance: AndroidImportance.HIGH,
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
        interruptionLevel: 'timeSensitive' as any,
      },
    },
    trigger,
  );
  console.log(`[Notifications] scheduled sleep bedtime for ${triggerDate.toISOString()}`);
}

/** 취침 알림 취소 */
export async function cancelSleepBedtimeNotification(): Promise<void> {
  await notifee.cancelNotification(SLEEP_BEDTIME_ID);
}

// ============================================
// Sleep Wake-up Notification
// ============================================

const SLEEP_WAKEUP_ID = 'sleep-wakeup-reminder';

/**
 * 다음 기상 시간에 time-sensitive 로컬 알림 스케줄링
 * @param wakeGoalTime - HH:mm 형식의 목표 기상 시간
 */
export async function scheduleSleepWakeupNotification(wakeGoalTime: string): Promise<void> {
  await notifee.cancelNotification(SLEEP_WAKEUP_ID);

  const [h, m] = wakeGoalTime.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(h, m, 0, 0);

  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
  };

  await notifee.createTriggerNotification(
    {
      id: SLEEP_WAKEUP_ID,
      title: '기상 시간이에요 ☀️',
      body: '좋은 아침이에요! 일어나서 하루를 시작해보세요.',
      data: {type: 'sleep-wakeup'},
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        importance: AndroidImportance.HIGH,
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
        interruptionLevel: 'timeSensitive' as any,
      },
    },
    trigger,
  );
  console.log(`[Notifications] scheduled sleep wakeup for ${triggerDate.toISOString()}`);
}

/** 기상 알림 취소 */
export async function cancelSleepWakeupNotification(): Promise<void> {
  await notifee.cancelNotification(SLEEP_WAKEUP_ID);
}

// ============================================
// Utilities
// ============================================

/**
 * 알람 오프셋 라벨 반환 (단일)
 */
export function getAlarmLabel(offsetMinutes: number | null): string {
  const option = ALARM_OPTIONS.find(o => o.value === offsetMinutes);
  return option?.label ?? '없음';
}

/**
 * 복수 알람 오프셋 요약 라벨 반환
 */
export function getAlarmsLabel(offsets: number[]): string {
  if (offsets.length === 0) return '없음';
  if (offsets.length === 1) return getAlarmLabel(offsets[0]);
  return `알림 ${offsets.length}개`;
}
