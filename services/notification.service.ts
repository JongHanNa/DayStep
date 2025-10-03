import { Capacitor } from '@capacitor/core';
import { LocalNotificationSchema } from '@capacitor/local-notifications';
import { QuietLocalNotifications as LocalNotifications } from '@/lib/quietCapacitor';
import { PushNotifications } from '@capacitor/push-notifications';
import { DayStepWidget, NotificationOptions, TodoWidgetData } from '../plugins/daystep-widget/src';
import { Todo } from '@/entities/todo/Todo';

export class NotificationService {
  private static instance: NotificationService;
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * 알림 권한 요청
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // iOS/Android에서는 DayStepWidget 플러그인 사용
        const result = await DayStepWidget.requestNotificationPermission();
        return result.granted;
      } else {
        // 웹에서는 Web Notification API 사용
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
        return false;
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 할일 리마인더 알림 스케줄링
   */
  async scheduleTodoReminder(todo: Todo): Promise<boolean> {
    try {
      console.log('📋 할일 리마인더 스케쥴링 시작:', {
        id: todo.id,
        content: todo.content.substring(0, 30) + '...',
        startTime: todo.startTime
      });

      if (!todo.startTime) {
        console.warn('❌ 스케줄된 시간이 없는 할일:', todo.id);
        return false;
      }

      const scheduledTime = new Date(todo.startTime);
      // 5분 전에 알림
      const reminderTime = new Date(scheduledTime.getTime() - 5 * 60 * 1000);

      console.log('⏰ 알림 시간 계산:', {
        scheduledTime: scheduledTime.toLocaleString(),
        reminderTime: reminderTime.toLocaleString(),
        inMinutes: Math.floor((reminderTime.getTime() - new Date().getTime()) / (1000 * 60))
      });

      if (reminderTime <= new Date()) {
        console.warn('❌ 과거 시간으로는 알림을 스케줄할 수 없습니다:', {
          reminderTime: reminderTime.toLocaleString(),
          now: new Date().toLocaleString()
        });
        return false;
      }

      if (Capacitor.isNativePlatform()) {
        // 네이티브 플랫폼에서는 DayStepWidget 플러그인 사용
        const options: NotificationOptions = {
          title: '할일 리마인더',
          body: `곧 시작: ${todo.content}`,
          scheduledTime: reminderTime.toISOString(),
          todoId: todo.id,
          type: 'todo'
        };

        console.log('📱 네이티브 알림 스케쥴링 시도:', options);
        const result = await DayStepWidget.scheduleNotification(options);
        
        if (result.success) {
          console.log('✅ 네이티브 알림 스케쥴링 성공:', {
            todoId: todo.id,
            scheduledTime: reminderTime.toLocaleString()
          });
        } else {
          console.error('❌ 네이티브 알림 스케쥴링 실패:', result);
        }
        
        return result.success;
      } else {
        // 웹에서는 LocalNotifications 사용
        const notification: LocalNotificationSchema = {
          id: parseInt(todo.id),
          title: '할일 리마인더',
          body: `곧 시작: ${todo.content}`,
          schedule: {
            at: reminderTime
          },
          extra: {
            todoId: todo.id,
            type: 'todo'
          }
        };

        console.log('🌐 웹 알림 스케쥴링 시도:', notification);
        await LocalNotifications.schedule({
          notifications: [notification]
        });
        console.log('✅ 웹 알림 스케쥴링 성공');
        return true;
      }
    } catch (error) {
      console.error('❌ 할일 리마인더 스케줄링 실패:', error);
      return false;
    }
  }


  /**
   * 성취 축하 알림
   */
  async showAchievementNotification(title: string, message: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // 즉시 알림 (현재 시간으로 스케줄)
        const options: NotificationOptions = {
          title,
          body: message,
          scheduledTime: new Date().toISOString(),
          type: 'reminder'
        };

        await DayStepWidget.scheduleNotification(options);
      } else {
        // 웹에서는 즉시 알림
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '/apple-touch-icon.png'
          });
        } else {
          // fallback으로 로컬 알림
          const notification: LocalNotificationSchema = {
            id: Date.now(),
            title,
            body: message,
            schedule: {
              at: new Date()
            }
          };

          await LocalNotifications.schedule({
            notifications: [notification]
          });
        }
      }
    } catch (error) {
      console.error('성취 알림 표시 실패:', error);
    }
  }

  /**
   * 알림 취소
   */
  async cancelNotification(id: string): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform()) {
        await LocalNotifications.cancel({
          notifications: [{ id: parseInt(id) }]
        });
      }
      // 네이티브에서는 UserNotifications에서 자동 관리
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }


  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform()) {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id }))
          });
        }
      }
      // 네이티브에서는 UserNotifications에서 자동 관리
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const notificationService = NotificationService.getInstance();