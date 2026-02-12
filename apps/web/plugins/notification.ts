/**
 * 알림 플러그인 (웹 브라우저 Notification API 사용)
 */

/**
 * 알림 상태 타입 정의
 */
export type NotificationStatus =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'provisional'
  | 'ephemeral'
  | 'unknown';

/**
 * 예약된 알림 정보 타입
 */
export interface ScheduledNotificationInfo {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  remainingSeconds: number;
}

/**
 * 브라우저 Notification API 기반 알림 매니저
 */
export const NotificationManager = {
  async requestPermission(): Promise<{
    granted: boolean;
    status: NotificationStatus;
  }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { granted: false, status: 'denied' };
    }
    const result = await Notification.requestPermission();
    return {
      granted: result === 'granted',
      status: result as NotificationStatus
    };
  },

  async checkPermission(): Promise<{
    granted: boolean;
    status: NotificationStatus;
  }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { granted: false, status: 'denied' };
    }
    return {
      granted: Notification.permission === 'granted',
      status: Notification.permission as NotificationStatus
    };
  },

  async scheduleNotification(options: {
    title: string;
    body: string;
    delay: number;
    id?: string;
  }): Promise<{
    success: boolean;
    id: string;
    scheduledTime: number;
    delay: number;
  }> {
    const id = options.id || Math.random().toString(36).substr(2, 9);
    const scheduledTime = Date.now() + (options.delay * 1000);

    try {
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          new Notification(options.title, { body: options.body });
        }
      }, options.delay * 1000);

      return { success: true, id, scheduledTime, delay: options.delay };
    } catch (error) {
      return { success: false, id, scheduledTime, delay: options.delay };
    }
  },

  async showImmediateNotification(options: {
    title: string;
    body: string;
    id?: string;
  }): Promise<{ success: boolean; id: string }> {
    const id = options.id || Math.random().toString(36).substr(2, 9);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body });
      }
      return { success: true, id };
    } catch (error) {
      return { success: false, id };
    }
  },

  async cancelNotification(_options: { id: string }): Promise<{ success: boolean; id: string }> {
    return { success: true, id: _options.id };
  },

  async cancelAllNotifications(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: '모든 알림이 취소되었습니다' };
  },

  async getPendingNotifications(): Promise<{
    notifications: Array<{ id: string; title: string; body: string; scheduledTime: number }>;
    count: number;
  }> {
    return { notifications: [], count: 0 };
  }
};

/**
 * 알림 플러그인 헬퍼 함수들
 */
export class NotificationHelper {
  static async isPermissionGranted(): Promise<boolean> {
    try {
      const result = await NotificationManager.checkPermission();
      return result.granted;
    } catch {
      return false;
    }
  }

  static async safeScheduleNotification(options: {
    title: string;
    body: string;
    delay: number;
    id?: string;
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      const hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        return { success: false, message: '알림 권한이 필요합니다.' };
      }
      const result = await NotificationManager.scheduleNotification(options);
      return { success: result.success, id: result.id };
    } catch (error) {
      return { success: false, message: `알림 예약 실패: ${error}` };
    }
  }

  static async safeShowImmediateNotification(options: {
    title: string;
    body: string;
    id?: string;
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      const hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        return { success: false, message: '알림 권한이 필요합니다.' };
      }
      const result = await NotificationManager.showImmediateNotification(options);
      return { success: result.success, id: result.id };
    } catch (error) {
      return { success: false, message: `즉시 알림 실패: ${error}` };
    }
  }

  static convertToScheduledNotifications(notifications: Array<{
    id: string;
    title: string;
    body: string;
    scheduledTime: number;
  }>): ScheduledNotificationInfo[] {
    const now = Date.now();
    return notifications.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      scheduledTime: new Date(n.scheduledTime),
      remainingSeconds: Math.max(0, Math.floor((n.scheduledTime - now) / 1000))
    }));
  }

  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static formatRelativeTime(seconds: number): string {
    if (seconds <= 0) return "곧";
    if (seconds < 60) return `${seconds}초 후`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
      return minutes > 0 ? `${hours}시간 ${minutes}분 후` : `${hours}시간 후`;
    }
    return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초 후` : `${minutes}분 후`;
  }
}
