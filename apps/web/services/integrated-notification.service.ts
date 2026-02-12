/**
 * 통합 알림 서비스
 * 웹 환경에서 Notification API를 사용한 알림 시스템
 */
export class IntegratedNotificationService {
  private static instance: IntegratedNotificationService;

  constructor() {
    console.log('🔔 IntegratedNotificationService 초기화: Web 모드');
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

      // 웹 환경: setTimeout 기반 알림
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification('할일 리마인더', { body: `곧 시작: ${todo.content}` });
        }, reminderMinutes * 60 * 1000);
        console.log(`✅ [IntegratedNotificationService] 웹 할일 알림 예약 성공: ${todo.content}`);
        return true;
      }

      return false;
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

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
        console.log(`✅ [IntegratedNotificationService] 웹 성취 알림 표시 성공`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[IntegratedNotificationService] 성취 알림 표시 실패:', error);
      return false;
    }
  }

  /**
   * 특정 할일 알림 취소 (웹에서는 no-op)
   */
  async cancelTodoReminder(todoId: string): Promise<boolean> {
    console.log(`🗑️ [IntegratedNotificationService] 할일 알림 취소: ${todoId}`);
    return true;
  }

  /**
   * 모든 알림 취소 (웹에서는 no-op)
   */
  async cancelAllNotifications(): Promise<boolean> {
    console.log(`🗑️ [IntegratedNotificationService] 모든 알림 취소`);
    return true;
  }

  /**
   * 알림 권한 상태 확인
   */
  async checkPermission(): Promise<{ granted: boolean; status: string }> {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        return { granted: permission === 'granted', status: permission };
      }
      return { granted: false, status: 'not-supported' };
    } catch (error) {
      console.error('[IntegratedNotificationService] 알림 권한 확인 실패:', error);
      return { granted: false, status: 'error' };
    }
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    try {
      console.log('🔔 [IntegratedNotificationService] 알림 권한 요청');

      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        console.log(`${granted ? '✅' : '❌'} [IntegratedNotificationService] 웹 알림 권한: ${permission}`);
        return granted;
      }

      return false;
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
      isNative: false,
      platform: 'Web Browser',
      systemType: 'Notification API',
      description: 'JavaScript Notification API를 사용합니다.'
    };
  }
}

// 싱글톤 인스턴스 내보내기
export const integratedNotificationService = IntegratedNotificationService.getInstance();
