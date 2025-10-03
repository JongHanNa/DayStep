import { Capacitor } from '@capacitor/core';
import { NotificationManager } from '@/plugins/notification';
import { mobileNotificationService } from '@/services/mobile-notification.service';

/**
 * 통합 알림 서비스
 * 네이티브 환경과 웹 환경을 자동으로 감지하여 적절한 알림 시스템 사용
 */
export class IntegratedNotificationService {
  private static instance: IntegratedNotificationService;
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    console.log(`🔔 IntegratedNotificationService 초기화: ${this.isNative ? 'Native' : 'Web'} 모드`);
  }

  public static getInstance(): IntegratedNotificationService {
    if (!IntegratedNotificationService.instance) {
      IntegratedNotificationService.instance = new IntegratedNotificationService();
    }
    return IntegratedNotificationService.instance;
  }

  /**
   * 할일 리마인더 알림 예약
   */
  async scheduleTodoReminder(todo: any, reminderMinutes: number = 60): Promise<boolean> {
    try {
      console.log(`📅 [IntegratedNotificationService] 할일 알림 예약: "${todo.content}" - ${reminderMinutes}분 후`);

      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 사용
        const result = await NotificationManager.scheduleNotification({
          title: '할일 리마인더',
          body: `곧 시작: ${todo.content}`,
          delay: reminderMinutes * 60, // 분을 초로 변환
          id: `todo_${todo.id}`,
        });

        if (result.success) {
          console.log(`✅ [IntegratedNotificationService] 네이티브 할일 알림 예약 성공: ${todo.content}`);
          return true;
        } else {
          console.error(`❌ [IntegratedNotificationService] 네이티브 할일 알림 예약 실패`);
          return false;
        }
      } else {
        // 웹 환경: 웹뷰 알림 (기존 방식)
        const reminderDate = new Date(Date.now() + reminderMinutes * 60 * 1000);
        
        const success = await mobileNotificationService.scheduleTodoReminder({
          todoId: todo.id,
          title: todo.content,
          content: todo.content,
          startTime: reminderDate.toISOString()
        });

        if (success) {
          console.log(`✅ [IntegratedNotificationService] 웹뷰 할일 알림 예약 성공: ${todo.content}`);
          return true;
        } else {
          console.error(`❌ [IntegratedNotificationService] 웹뷰 할일 알림 예약 실패`);
          return false;
        }
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 할일 알림 예약 실패:', error);
      return false;
    }
  }

  /**
   * 성취 알림 표시
   */
  async showAchievementNotification(title: string, body: string): Promise<boolean> {
    try {
      console.log(`🎉 [IntegratedNotificationService] 성취 알림 표시: "${title}" - ${body}`);

      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 사용
        const result = await NotificationManager.showImmediateNotification({
          title,
          body,
          id: `achievement_${Date.now()}`,
        });

        if (result.success) {
          console.log(`✅ [IntegratedNotificationService] 네이티브 성취 알림 표시 성공`);
          return true;
        } else {
          console.error(`❌ [IntegratedNotificationService] 네이티브 성취 알림 표시 실패`);
          return false;
        }
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.showAchievementNotification(title, body);
        
        console.log(`✅ [IntegratedNotificationService] 웹뷰 성취 알림 표시 성공`);
        return true;
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 성취 알림 표시 실패:', error);
      return false;
    }
  }

  /**
   * 특정 할일 알림 취소
   */
  async cancelTodoReminder(todoId: string): Promise<boolean> {
    try {
      console.log(`🗑️ [IntegratedNotificationService] 할일 알림 취소: ${todoId}`);

      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 사용
        const result = await NotificationManager.cancelNotification({ id: `todo_${todoId}` });
        
        console.log(`✅ [IntegratedNotificationService] 네이티브 할일 알림 취소 성공: ${todoId}`);
        return result.success;
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.cancelTodoReminder(todoId);
        
        console.log(`✅ [IntegratedNotificationService] 웹뷰 할일 알림 취소 성공: ${todoId}`);
        return true;
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 할일 알림 취소 실패:', error);
      return false;
    }
  }

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<boolean> {
    try {
      console.log(`🗑️ [IntegratedNotificationService] 모든 알림 취소`);

      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 사용
        const result = await NotificationManager.cancelAllNotifications();
        
        console.log(`✅ [IntegratedNotificationService] 네이티브 모든 알림 취소 성공`);
        return result.success;
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.cancelAllNotifications();
        
        console.log(`✅ [IntegratedNotificationService] 웹뷰 모든 알림 취소 성공`);
        return true;
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 모든 알림 취소 실패:', error);
      return false;
    }
  }

  /**
   * 알림 권한 상태 확인
   */
  async checkPermission(): Promise<{ granted: boolean; status: string }> {
    try {
      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 권한 확인
        const result = await NotificationManager.checkPermission();
        return {
          granted: result.granted,
          status: result.status
        };
      } else {
        // 웹 환경: Notification API 권한 확인
        if (typeof window !== 'undefined' && 'Notification' in window) {
          const permission = Notification.permission;
          return {
            granted: permission === 'granted',
            status: permission
          };
        } else {
          return {
            granted: false,
            status: 'not-supported'
          };
        }
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 알림 권한 확인 실패:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    try {
      console.log(`🔔 [IntegratedNotificationService] 알림 권한 요청`);

      if (this.isNative) {
        // 네이티브 환경: @capacitor/local-notifications 권한 요청
        const result = await NotificationManager.requestPermission();
        
        console.log(`${result.granted ? '✅' : '❌'} [IntegratedNotificationService] 네이티브 알림 권한: ${result.status}`);
        return result.granted;
      } else {
        // 웹 환경: Notification API 권한 요청
        const granted = await mobileNotificationService.requestPermission();
        
        console.log(`${granted ? '✅' : '❌'} [IntegratedNotificationService] 웹뷰 알림 권한: ${granted ? 'granted' : 'denied'}`);
        return granted;
      }
    } catch (error) {
      console.error('[IntegratedNotificationService] 알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 할일 완료 시 성취 알림
   */
  async notifyTaskCompletion(todo: any): Promise<boolean> {
    return this.showAchievementNotification(
      '할일 완료! 🎉',
      `"${todo.content}" 작업을 완료했습니다!`
    );
  }

  /**
   * 환경 정보 반환
   */
  getSystemInfo() {
    return {
      isNative: this.isNative,
      platform: this.isNative ? 'Native iOS/Android' : 'Web Browser',
      systemType: this.isNative ? '@capacitor/local-notifications (UserNotifications Framework 기반)' : 'Notification API',
      description: this.isNative 
        ? '실제 iOS/Android 시스템 알림을 사용합니다.'
        : 'JavaScript Notification API를 사용합니다.'
    };
  }
}

// 싱글톤 인스턴스 내보내기
export const integratedNotificationService = IntegratedNotificationService.getInstance();