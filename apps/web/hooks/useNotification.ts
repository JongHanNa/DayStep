import { useCallback, useEffect } from 'react';
import { mobileNotificationService } from '@/services/mobile-notification.service';
import type { Todo } from '@/types';

/**
 * 통합 알림 관리 훅
 * 웹 환경: 웹 알림 (Notification API) 사용
 */
export const useNotification = () => {
  /**
   * 할일 리마인더 알림 예약
   */
  const scheduleTaskNotification = useCallback(async (
    todo: Todo,
    reminderMinutes: number = 60
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`할일 알림 예약: "${todo.title}" - ${reminderMinutes}분 후`);

      const reminderDate = new Date(Date.now() + reminderMinutes * 60 * 1000);

      const success = await mobileNotificationService.scheduleTodoReminder({
        todoId: todo.id,
        title: todo.title,
        content: todo.title,
        startTime: reminderDate.toISOString()
      });

      if (success) {
        console.log(`웹 알림 예약 성공: ${todo.title}`);
        return {
          success: true,
          message: `${reminderMinutes}분 후 알림이 예약되었습니다.`
        };
      } else {
        console.error(`웹 알림 예약 실패`);
        return {
          success: false,
          message: '알림 예약에 실패했습니다.'
        };
      }
    } catch (error) {
      console.error('할일 알림 예약 실패:', error);
      return {
        success: false,
        message: `알림 예약 실패: ${error}`
      };
    }
  }, []);

  /**
   * 즉시 성취 알림 표시
   */
  const showAchievementNotification = useCallback(async (
    title: string,
    body: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`성취 알림 표시: "${title}" - ${body}`);

      await mobileNotificationService.showAchievementNotification(title, body);

      console.log(`웹 성취 알림 표시 성공`);
      return {
        success: true,
        message: '성취 알림을 표시했습니다.'
      };
    } catch (error) {
      console.error('성취 알림 표시 실패:', error);
      return {
        success: false,
        message: `성취 알림 표시 실패: ${error}`
      };
    }
  }, []);

  /**
   * 특정 할일 알림 취소
   */
  const cancelTaskNotification = useCallback(async (
    todoId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`할일 알림 취소: ${todoId}`);

      await mobileNotificationService.cancelTodoReminder(todoId);

      console.log(`웹 할일 알림 취소 성공: ${todoId}`);
      return {
        success: true,
        message: '할일 알림이 취소되었습니다.'
      };
    } catch (error) {
      console.error('할일 알림 취소 실패:', error);
      return {
        success: false,
        message: `할일 알림 취소 실패: ${error}`
      };
    }
  }, []);

  /**
   * 모든 알림 취소
   */
  const cancelAllNotifications = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log(`모든 알림 취소`);

      await mobileNotificationService.cancelAllNotifications();

      console.log(`웹 모든 알림 취소 성공`);
      return {
        success: true,
        message: '모든 알림이 취소되었습니다.'
      };
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
      return {
        success: false,
        message: `모든 알림 취소 실패: ${error}`
      };
    }
  }, []);

  /**
   * 알림 권한 상태 확인
   */
  const checkNotificationPermission = useCallback(async (): Promise<{
    granted: boolean;
    status: string;
  }> => {
    try {
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
    } catch (error) {
      console.error('알림 권한 확인 실패:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }, []);

  /**
   * 알림 권한 요청
   */
  const requestNotificationPermission = useCallback(async (): Promise<{
    granted: boolean;
    status: string;
  }> => {
    try {
      console.log(`알림 권한 요청`);

      const granted = await mobileNotificationService.requestPermission();
      const status = granted ? 'granted' : 'denied';

      console.log(`웹 알림 권한: ${status}`);
      return {
        granted,
        status
      };
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return {
        granted: false,
        status: 'error'
      };
    }
  }, []);

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
      const pendingIds = await mobileNotificationService.getPendingNotifications();
      return pendingIds.map(id => ({
        id,
        title: '예약된 알림',
        body: '할일 리마인더',
        scheduledTime: new Date()
      }));
    } catch (error) {
      console.error('예약된 알림 조회 실패:', error);
      return [];
    }
  }, []);

  // 할일 완료 시 자동으로 성취 알림 표시
  const showTaskCompletionNotification = useCallback(async (todo: Todo) => {
    const result = await showAchievementNotification(
      '할일 완료!',
      `"${todo.title}" 작업을 완료했습니다!`
    );

    return result;
  }, [showAchievementNotification]);

  // 환경 정보와 함께 현재 알림 시스템 상태 반환
  const getNotificationSystemInfo = useCallback(() => {
    return {
      platform: 'Web Browser',
      systemType: 'Notification API',
      description: 'JavaScript Notification API를 사용합니다.'
    };
  }, []);

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
  };
};
