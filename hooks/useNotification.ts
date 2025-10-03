import { useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { NotificationManager, NotificationHelper } from '@/plugins/notification';
import { mobileNotificationService } from '@/services/mobile-notification.service';
import type { Todo } from '@/types';

/**
 * 통합 알림 관리 훅
 * 네이티브 환경: iOS/Android 시스템 알림 사용
 * 웹 환경: 웹뷰 알림 (Notification API) 사용
 */
export const useNotification = () => {
  const isNative = Capacitor.isNativePlatform();

  /**
   * 할일 리마인더 알림 예약
   */
  const scheduleTaskNotification = useCallback(async (
    todo: Todo,
    reminderMinutes: number = 60
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`📅 할일 알림 예약: "${todo.content}" - ${reminderMinutes}분 후`);

      if (isNative) {
        // 네이티브 환경: iOS/Android 시스템 알림
        const result = await NotificationHelper.safeScheduleNotification({
          title: '할일 리마인더',
          body: `곧 시작: ${todo.content}`,
          delay: reminderMinutes * 60, // 분을 초로 변환
          id: `todo_${todo.id}`,
        });

        if (result.success) {
          console.log(`✅ 네이티브 알림 예약 성공: ${todo.content}`);
          return {
            success: true,
            message: `${reminderMinutes}분 후 알림이 예약되었습니다.`
          };
        } else {
          console.error(`❌ 네이티브 알림 예약 실패: ${result.message}`);
          return {
            success: false,
            message: result.message || '알림 예약에 실패했습니다.'
          };
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
          console.log(`✅ 웹뷰 알림 예약 성공: ${todo.content}`);
          return {
            success: true,
            message: `${reminderMinutes}분 후 알림이 예약되었습니다.`
          };
        } else {
          console.error(`❌ 웹뷰 알림 예약 실패`);
          return {
            success: false,
            message: '알림 예약에 실패했습니다.'
          };
        }
      }
    } catch (error) {
      console.error('할일 알림 예약 실패:', error);
      return {
        success: false,
        message: `알림 예약 실패: ${error}`
      };
    }
  }, [isNative]);

  /**
   * 즉시 성취 알림 표시
   */
  const showAchievementNotification = useCallback(async (
    title: string,
    body: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`🎉 성취 알림 표시: "${title}" - ${body}`);

      if (isNative) {
        // 네이티브 환경: iOS/Android 시스템 알림
        const result = await NotificationHelper.safeShowImmediateNotification({
          title,
          body,
          id: `achievement_${Date.now()}`,
        });

        if (result.success) {
          console.log(`✅ 네이티브 성취 알림 표시 성공`);
          return {
            success: true,
            message: '성취 알림을 표시했습니다.'
          };
        } else {
          console.error(`❌ 네이티브 성취 알림 표시 실패: ${result.message}`);
          return {
            success: false,
            message: result.message || '성취 알림 표시에 실패했습니다.'
          };
        }
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.showAchievementNotification(title, body);
        
        console.log(`✅ 웹뷰 성취 알림 표시 성공`);
        return {
          success: true,
          message: '성취 알림을 표시했습니다.'
        };
      }
    } catch (error) {
      console.error('성취 알림 표시 실패:', error);
      return {
        success: false,
        message: `성취 알림 표시 실패: ${error}`
      };
    }
  }, [isNative]);

  /**
   * 특정 할일 알림 취소
   */
  const cancelTaskNotification = useCallback(async (
    todoId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`🗑️ 할일 알림 취소: ${todoId}`);

      if (isNative) {
        // 네이티브 환경: iOS/Android 시스템 알림
        await NotificationManager.cancelNotification({ id: `todo_${todoId}` });
        
        console.log(`✅ 네이티브 할일 알림 취소 성공: ${todoId}`);
        return {
          success: true,
          message: '할일 알림이 취소되었습니다.'
        };
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.cancelTodoReminder(todoId);
        
        console.log(`✅ 웹뷰 할일 알림 취소 성공: ${todoId}`);
        return {
          success: true,
          message: '할일 알림이 취소되었습니다.'
        };
      }
    } catch (error) {
      console.error('할일 알림 취소 실패:', error);
      return {
        success: false,
        message: `할일 알림 취소 실패: ${error}`
      };
    }
  }, [isNative]);

  /**
   * 모든 알림 취소
   */
  const cancelAllNotifications = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`🗑️ 모든 알림 취소`);

      if (isNative) {
        // 네이티브 환경: iOS/Android 시스템 알림
        const result = await NotificationManager.cancelAllNotifications();
        
        console.log(`✅ 네이티브 모든 알림 취소 성공`);
        return {
          success: true,
          message: result.message || '모든 알림이 취소되었습니다.'
        };
      } else {
        // 웹 환경: 웹뷰 알림
        await mobileNotificationService.cancelAllNotifications();
        
        console.log(`✅ 웹뷰 모든 알림 취소 성공`);
        return {
          success: true,
          message: '모든 알림이 취소되었습니다.'
        };
      }
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
      return {
        success: false,
        message: `모든 알림 취소 실패: ${error}`
      };
    }
  }, [isNative]);

  /**
   * 알림 권한 상태 확인
   */
  const checkNotificationPermission = useCallback(async (): Promise<{
    granted: boolean;
    status: string;
  }> => {
    try {
      if (isNative) {
        // 네이티브 환경: iOS/Android 권한 확인
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
      console.error('알림 권한 확인 실패:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }, [isNative]);

  /**
   * 알림 권한 요청
   */
  const requestNotificationPermission = useCallback(async (): Promise<{
    granted: boolean;
    status: string;
  }> => {
    try {
      console.log(`🔔 알림 권한 요청`);

      if (isNative) {
        // 네이티브 환경: iOS/Android 권한 요청
        const result = await NotificationManager.requestPermission();
        
        console.log(`${result.granted ? '✅' : '❌'} 네이티브 알림 권한: ${result.status}`);
        return {
          granted: result.granted,
          status: result.status
        };
      } else {
        // 웹 환경: Notification API 권한 요청
        const granted = await mobileNotificationService.requestPermission();
        const status = granted ? 'granted' : 'denied';
        
        console.log(`${granted ? '✅' : '❌'} 웹뷰 알림 권한: ${status}`);
        return {
          granted,
          status
        };
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }, [isNative]);

  /**
   * 예약된 알림 목록 조회
   */
  const getPendingNotifications = useCallback(async (): Promise<Array<{
    id: string;
    title: string;
    body: string;
    scheduledTime: Date;
  }>> => {
    try {
      if (isNative) {
        // 네이티브 환경: iOS/Android 예약 알림 조회
        const result = await NotificationManager.getPendingNotifications();
        return result.notifications.map(notification => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          scheduledTime: new Date(notification.scheduledTime)
        }));
      } else {
        // 웹 환경: 웹뷰 예약 알림 조회 (기존 서비스 사용)
        const pendingIds = await mobileNotificationService.getPendingNotifications();
        // 웹뷰에서는 상세 정보를 얻기 어려우므로 기본 형태로 반환
        return pendingIds.map(id => ({
          id,
          title: '예약된 알림',
          body: '할일 리마인더',
          scheduledTime: new Date()
        }));
      }
    } catch (error) {
      console.error('예약된 알림 조회 실패:', error);
      return [];
    }
  }, [isNative]);

  // 할일 완료 시 자동으로 성취 알림 표시
  const showTaskCompletionNotification = useCallback(async (todo: Todo) => {
    const result = await showAchievementNotification(
      '할일 완료! 🎉',
      `"${todo.content}" 작업을 완료했습니다!`
    );

    return result;
  }, [showAchievementNotification]);

  // 환경 정보와 함께 현재 알림 시스템 상태 반환
  const getNotificationSystemInfo = useCallback(() => {
    return {
      isNative,
      platform: isNative ? 'Native iOS/Android' : 'Web Browser',
      systemType: isNative ? 'UserNotifications Framework' : 'Notification API',
      description: isNative 
        ? '실제 iOS/Android 시스템 알림을 사용합니다.'
        : 'JavaScript Notification API를 사용합니다.'
    };
  }, [isNative]);

  return {
    // 할일 관련 알림
    scheduleTaskNotification,
    cancelTaskNotification,
    showTaskCompletionNotification,

    // 일반 알림
    showAchievementNotification,
    cancelAllNotifications,

    // 권한 관리
    checkNotificationPermission,
    requestNotificationPermission,

    // 상태 조회
    getPendingNotifications,
    getNotificationSystemInfo,

    // 환경 정보
    isNative,
  };
};