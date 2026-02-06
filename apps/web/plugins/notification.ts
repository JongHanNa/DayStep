import { LocalNotificationSchema } from '@capacitor/local-notifications';
import { QuietLocalNotifications as LocalNotifications } from '@/lib/quietCapacitor';
import { PermissionState } from '@capacitor/core';

/**
 * DayStep 네이티브 알림 플러그인 - 공식 @capacitor/local-notifications 사용
 */

/**
 * 네이티브 알림 플러그인 인스턴스 (공식 플러그인 사용)
 */
export const NotificationManager = {
  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<{
    granted: boolean;
    status: 'granted' | 'denied' | 'prompt' | 'provisional' | 'ephemeral' | 'unknown';
  }> {
    const result = await LocalNotifications.requestPermissions();
    const granted = result.display === 'granted';
    return {
      granted,
      status: result.display as any
    };
  },

  /**
   * 현재 알림 권한 상태 확인
   */
  async checkPermission(): Promise<{
    granted: boolean;
    status: 'granted' | 'denied' | 'prompt' | 'provisional' | 'ephemeral' | 'unknown';
  }> {
    const result = await LocalNotifications.checkPermissions();
    const granted = result.display === 'granted';
    return {
      granted,
      status: result.display as any
    };
  },

  /**
   * 예약 알림 스케줄링
   */
  async scheduleNotification(options: {
    title: string;
    body: string;
    delay: number; // 초 단위
    id?: string;
  }): Promise<{
    success: boolean;
    id: string;
    scheduledTime: number; // milliseconds timestamp
    delay: number;
  }> {
    const id = options.id || Math.random().toString(36).substr(2, 9);
    const scheduledTime = Date.now() + (options.delay * 1000);
    
    const notification: LocalNotificationSchema = {
      id: parseInt(id.replace(/[^0-9]/g, '').slice(0, 8)) || Math.floor(Math.random() * 999999),
      title: options.title,
      body: options.body,
      schedule: {
        at: new Date(scheduledTime)
      },
      sound: undefined, // iOS 기본 사운드
      attachments: undefined,
      actionTypeId: '',
      extra: {}
    };

    try {
      await LocalNotifications.schedule({
        notifications: [notification]
      });

      return {
        success: true,
        id: notification.id.toString(),
        scheduledTime,
        delay: options.delay
      };
    } catch (error) {
      console.error('알림 예약 실패:', error);
      return {
        success: false,
        id: notification.id.toString(),
        scheduledTime,
        delay: options.delay
      };
    }
  },

  /**
   * 즉시 알림 표시
   */
  async showImmediateNotification(options: {
    title: string;
    body: string;
    id?: string;
  }): Promise<{
    success: boolean;
    id: string;
  }> {
    const id = options.id || Math.random().toString(36).substr(2, 9);
    const scheduledTime = Date.now() + 100; // 0.1초 후

    const notification: LocalNotificationSchema = {
      id: parseInt(id.replace(/[^0-9]/g, '').slice(0, 8)) || Math.floor(Math.random() * 999999),
      title: options.title,
      body: options.body,
      schedule: {
        at: new Date(scheduledTime)
      },
      sound: undefined,
      attachments: undefined,
      actionTypeId: '',
      extra: {}
    };

    try {
      await LocalNotifications.schedule({
        notifications: [notification]
      });

      return {
        success: true,
        id: notification.id.toString()
      };
    } catch (error) {
      console.error('즉시 알림 실패:', error);
      return {
        success: false,
        id: notification.id.toString()
      };
    }
  },

  /**
   * 특정 알림 취소
   */
  async cancelNotification(options: {
    id: string;
  }): Promise<{
    success: boolean;
    id: string;
  }> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: parseInt(options.id) || 0 }]
      });

      return {
        success: true,
        id: options.id
      };
    } catch (error) {
      console.error('알림 취소 실패:', error);
      return {
        success: false,
        id: options.id
      };
    }
  },

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id }))
        });
      }

      return {
        success: true,
        message: '모든 알림이 취소되었습니다'
      };
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
      return {
        success: false,
        message: '알림 취소 실패'
      };
    }
  },

  /**
   * 대기 중인 알림 목록 조회
   */
  async getPendingNotifications(): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      scheduledTime: number; // milliseconds timestamp
    }>;
    count: number;
  }> {
    try {
      const result = await LocalNotifications.getPending();
      
      const notifications = result.notifications.map(notification => ({
        id: notification.id.toString(),
        title: notification.title,
        body: notification.body,
        scheduledTime: notification.schedule?.at ? new Date(notification.schedule.at).getTime() : Date.now()
      }));

      return {
        notifications,
        count: notifications.length
      };
    } catch (error) {
      console.error('대기 알림 조회 실패:', error);
      return {
        notifications: [],
        count: 0
      };
    }
  }
};

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
 * 알림 플러그인 헬퍼 함수들
 */
export class NotificationHelper {
  /**
   * 알림 권한이 허용되어 있는지 확인
   */
  static async isPermissionGranted(): Promise<boolean> {
    try {
      const result = await NotificationManager.checkPermission();
      return result.granted;
    } catch (error) {
      console.error('알림 권한 확인 실패:', error);
      return false;
    }
  }

  /**
   * 안전한 알림 예약 (권한 확인 포함)
   */
  static async safeScheduleNotification(options: {
    title: string;
    body: string;
    delay: number;
    id?: string;
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      // 권한 확인
      const hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        return {
          success: false,
          message: '알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.'
        };
      }

      // 알림 예약
      const result = await NotificationManager.scheduleNotification(options);
      return {
        success: result.success,
        id: result.id,
        message: result.success ? '알림이 예약되었습니다.' : '알림 예약에 실패했습니다.'
      };
    } catch (error) {
      console.error('알림 예약 실패:', error);
      return {
        success: false,
        message: `알림 예약 실패: ${error}`
      };
    }
  }

  /**
   * 안전한 즉시 알림 (권한 확인 포함)
   */
  static async safeShowImmediateNotification(options: {
    title: string;
    body: string;
    id?: string;
  }): Promise<{ success: boolean; id?: string; message?: string }> {
    try {
      // 권한 확인
      const hasPermission = await this.isPermissionGranted();
      if (!hasPermission) {
        return {
          success: false,
          message: '알림 권한이 필요합니다. 설정에서 권한을 허용해주세요.'
        };
      }

      // 즉시 알림
      const result = await NotificationManager.showImmediateNotification(options);
      return {
        success: result.success,
        id: result.id,
        message: result.success ? '알림을 표시했습니다.' : '알림 표시에 실패했습니다.'
      };
    } catch (error) {
      console.error('즉시 알림 실패:', error);
      return {
        success: false,
        message: `즉시 알림 실패: ${error}`
      };
    }
  }

  /**
   * 예약된 알림을 ScheduledNotificationInfo 형태로 변환
   */
  static convertToScheduledNotifications(notifications: Array<{
    id: string;
    title: string;
    body: string;
    scheduledTime: number;
  }>): ScheduledNotificationInfo[] {
    const now = Date.now();
    
    return notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      scheduledTime: new Date(notification.scheduledTime),
      remainingSeconds: Math.max(0, Math.floor((notification.scheduledTime - now) / 1000))
    }));
  }

  /**
   * 시간 포맷팅 (hh:mm:ss)
   */
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 상대적 시간 표시 ("30초 후", "2분 30초 후", "1시간 30분 후")
   */
  static formatRelativeTime(seconds: number): string {
    if (seconds <= 0) return "곧";
    if (seconds < 60) return `${seconds}초 후`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      if (minutes > 0) {
        return `${hours}시간 ${minutes}분 후`;
      } else {
        return `${hours}시간 후`;
      }
    } else {
      if (remainingSeconds > 0) {
        return `${minutes}분 ${remainingSeconds}초 후`;
      } else {
        return `${minutes}분 후`;
      }
    }
  }
}