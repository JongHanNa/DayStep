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
 */
export async function scheduleTodoAlarm(
  todoId: string,
  title: string,
  startTime: string | Date,
  offsetMinutes: number,
): Promise<void> {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const triggerTime = new Date(start.getTime() - offsetMinutes * 60 * 1000);

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
      id: `todo-${todoId}`,
      title: 'DayStep',
      body: offsetMinutes === 0
        ? `지금 시작: ${title}`
        : `${offsetMinutes}분 후 시작: ${title}`,
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_notification',
        pressAction: {id: 'default'},
      },
      ios: {
        sound: 'default',
      },
    },
    trigger,
  );
}

/**
 * 할일 알람 취소
 */
export async function cancelTodoAlarm(todoId: string): Promise<void> {
  await notifee.cancelNotification(`todo-${todoId}`);
}

/**
 * 알람 오프셋 라벨 반환
 */
export function getAlarmLabel(offsetMinutes: number | null): string {
  const option = ALARM_OPTIONS.find(o => o.value === offsetMinutes);
  return option?.label ?? '없음';
}
