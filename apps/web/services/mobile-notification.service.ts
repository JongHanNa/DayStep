import { Capacitor } from '@capacitor/core';

// Capacitor 플러그인 인터페이스 정의
interface DayStepNotificationPlugin {
  requestPermission(): Promise<{ granted: boolean }>;
  scheduleNotification(options: {
    title: string;
    body: string;
    scheduledTime: string; // ISO 8601 format
    identifier?: string;
  }): Promise<{ 
    success: boolean; 
    identifier: string; 
    scheduledDate: number; 
  }>;
  showImmediateNotification(options: {
    title: string;
    body: string;
    identifier?: string;
  }): Promise<{ success: boolean; identifier: string }>;
  cancelNotification(options: { identifier: string }): Promise<{ success: boolean }>;
  cancelAllNotifications(): Promise<{ success: boolean }>;
  getPendingNotifications(): Promise<{ notifications: string[] }>;
  updateBadge(options: { count: number }): Promise<{ success: boolean }>;
}

// Capacitor 플러그인 등록
const DayStepNotification = Capacitor.registerPlugin<DayStepNotificationPlugin>('DayStepNotificationPlugin');

/**
 * 예약된 알림 정보
 */
interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
  type: 'reminder' | 'test';
}

/**
 * 모바일 전용 알림 서비스
 * iOS/Android에서 네이티브 알림을 관리합니다
 */
export class MobileNotificationService {
  private static instance: MobileNotificationService;
  private scheduledNotifications = new Map<string, ScheduledNotification>();
  private eventListeners = new Set<() => void>();
  
  public static getInstance(): MobileNotificationService {
    if (!MobileNotificationService.instance) {
      MobileNotificationService.instance = new MobileNotificationService();
    }
    return MobileNotificationService.instance;
  }

  /**
   * 모바일 플랫폼 체크
   */
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * 변경 이벤트 리스너 추가
   */
  public addChangeListener(listener: () => void): void {
    this.eventListeners.add(listener);
  }

  /**
   * 변경 이벤트 리스너 제거
   */
  public removeChangeListener(listener: () => void): void {
    this.eventListeners.delete(listener);
  }

  /**
   * 변경 이벤트 발생
   */
  private notifyChange(): void {
    this.eventListeners.forEach(listener => listener());
  }

  /**
   * 예약된 알림 목록 가져오기
   */
  public getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values())
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        console.warn('모바일 알림 서비스는 네이티브 플랫폼에서만 작동합니다');
        return false;
      }

      // Requesting notification permissions

      // 웹 Notification API를 사용해서 iOS와 연동
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        
        // Web notification permission result
        console.log('🔔 권한 상태:', permission);
        
        return granted;
      }

      // iOS에서 웹 Notification API가 안되면 기본값 true 반환
      // iOS WebView - notification permission allowed by default
      return true;
      
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      
      // iOS에서는 보통 이미 허용되어 있으므로 true 반환
      console.log('🔔 오류 발생, iOS 기본 권한으로 처리');
      return true;
    }
  }

  /**
   * 할일 리마인더 스케줄링 (5분 전)
   */
  async scheduleTodoReminder(options: {
    todoId: string;
    title: string;
    content: string;
    startTime: string; // ISO 8601 format
  }): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        return false;
      }

      const startDate = new Date(options.startTime);
      // 5분 전 알림
      const reminderDate = new Date(startDate.getTime() - 5 * 60 * 1000);

      if (reminderDate <= new Date()) {
        console.warn('과거 시간으로는 알림을 스케줄할 수 없습니다:', reminderDate);
        return false;
      }

      const notificationId = `todo_${options.todoId}`;
      const title = '할일 리마인더';
      const body = `곧 시작: ${options.content}`;

      console.log(`📅 할일 알림 스케줄 시도: "${options.title}" - ${reminderDate.toLocaleString()}`);
      
      // iOS에서는 웹뷰에서 직접 setTimeout 사용
      const delay = reminderDate.getTime() - Date.now();
      
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          console.log(`🔔 스케줄된 알림 실행: ${title} - ${body}`);
          this.showAchievementNotification(title, body);
          this.scheduledNotifications.delete(notificationId);
          this.notifyChange();
        }, delay);

        // 예약된 알림 추가
        const scheduledNotification: ScheduledNotification = {
          id: notificationId,
          title,
          body,
          scheduledTime: reminderDate,
          timeoutId,
          type: 'reminder'
        };

        this.scheduledNotifications.set(notificationId, scheduledNotification);
        this.notifyChange();
        
        console.log(`📅 ${Math.round(delay / 1000)}초 후 알림 예약됨 (ID: ${notificationId})`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('할일 리마인더 스케줄링 실패:', error);
      return false;
    }
  }

  /**
   * 즉시 알림 표시 (완료/축하 알림)
   */
  async showAchievementNotification(title: string, body: string): Promise<boolean> {
    try {
      if (!this.isNativePlatform()) {
        return false;
      }

      console.log(`🎉 알림 표시 시도: "${title}" - ${body}`);

      // 웹 Notification API 사용
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/apple-touch-icon.png',
            tag: 'daystep-notification'
          });
          console.log(`✅ 웹 알림 표시 성공: "${title}"`);
          return true;
        } else {
          console.log('❌ 알림 권한이 없음');
          return false;
        }
      }

      // iOS WebView에서 웹 알림이 안되면 콘솔에만 출력
      console.log(`📱 iOS 알림: ${title} - ${body}`);
      alert(`📱 ${title}\n${body}`); // 임시로 alert 사용
      return true;
      
    } catch (error) {
      console.error('성취 알림 표시 실패:', error);
      return false;
    }
  }

  /**
   * 특정 알림 취소
   */
  async cancelTodoReminder(todoId: string): Promise<void> {
    try {
      if (!this.isNativePlatform()) {
        return;
      }

      const notificationId = `todo_${todoId}`;
      const scheduledNotification = this.scheduledNotifications.get(notificationId);

      if (scheduledNotification) {
        clearTimeout(scheduledNotification.timeoutId);
        this.scheduledNotifications.delete(notificationId);
        this.notifyChange();
        console.log(`🗑️ 할일 알림 취소: ${todoId}`);
      } else {
        console.log(`⚠️ 취소할 알림을 찾을 수 없음: ${todoId}`);
      }
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }

  /**
   * 특정 ID의 알림 취소
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      if (!this.isNativePlatform()) {
        return;
      }

      const scheduledNotification = this.scheduledNotifications.get(notificationId);

      if (scheduledNotification) {
        clearTimeout(scheduledNotification.timeoutId);
        this.scheduledNotifications.delete(notificationId);
        this.notifyChange();
        console.log(`🗑️ 알림 취소 완료: ${notificationId}`);
      } else {
        console.log(`⚠️ 취소할 알림을 찾을 수 없음: ${notificationId}`);
      }
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  }

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      if (!this.isNativePlatform()) {
        return;
      }

      const cancelCount = this.scheduledNotifications.size;
      
      // 모든 타이머 취소
      for (const [id, notification] of this.scheduledNotifications) {
        clearTimeout(notification.timeoutId);
      }
      
      // 목록 초기화
      this.scheduledNotifications.clear();
      this.notifyChange();
      
      console.log(`🗑️ 모든 알림 취소됨 (${cancelCount}개)`);
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
    }
  }

  /**
   * 예약된 알림 목록 조회
   */
  async getPendingNotifications(): Promise<string[]> {
    try {
      if (!this.isNativePlatform()) {
        return [];
      }

      const pendingIds = Array.from(this.scheduledNotifications.keys());
      console.log(`📋 예약된 알림 확인: ${pendingIds.length}개`);
      return pendingIds;
    } catch (error) {
      console.error('예약된 알림 조회 실패:', error);
      return [];
    }
  }

  /**
   * 앱 배지 업데이트
   */
  async updateBadge(count: number): Promise<void> {
    try {
      if (!this.isNativePlatform()) {
        return;
      }

      await DayStepNotification.updateBadge({ count });
      console.log(`📱 앱 배지 업데이트: ${count}`);
    } catch (error) {
      console.error('앱 배지 업데이트 실패:', error);
    }
  }

  /**
   * 테스트용 즉시 알림
   */
  async testNotification(): Promise<void> {
    const now = new Date();
    // Attempting test notification
    
    try {
      const success = await this.showAchievementNotification(
        '테스트 알림',
        `알림 시스템이 정상 작동합니다 - ${now.toLocaleTimeString()}`
      );
      
      if (success) {
        console.log('✅ 테스트 알림 성공');
      } else {
        console.log('❌ 테스트 알림 실패');
      }
    } catch (error) {
      console.error('🚨 테스트 알림 오류:', error);
    }
  }

  /**
   * 테스트용 예약 알림 (1분 또는 5분 후)
   */
  async scheduleTestNotification(delayMinutes: number): Promise<string | null> {
    try {
      if (!this.isNativePlatform()) {
        return null;
      }

      const scheduleTime = new Date(Date.now() + delayMinutes * 60 * 1000);
      const notificationId = `test_${Date.now()}_${delayMinutes}min`;
      const title = `${delayMinutes}분 테스트 알림`;
      const body = `${delayMinutes}분 후 알림이 정상 작동했습니다!`;

      console.log(`🧪 ${delayMinutes}분 후 테스트 알림 스케줄 시도: ${scheduleTime.toLocaleString()}`);
      
      const delay = scheduleTime.getTime() - Date.now();
      
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          console.log(`🔔 테스트 알림 실행: ${title} - ${body}`);
          this.showAchievementNotification(title, body);
          this.scheduledNotifications.delete(notificationId);
          this.notifyChange();
        }, delay);

        // 예약된 알림 추가
        const scheduledNotification: ScheduledNotification = {
          id: notificationId,
          title,
          body,
          scheduledTime: scheduleTime,
          timeoutId,
          type: 'test'
        };

        this.scheduledNotifications.set(notificationId, scheduledNotification);
        this.notifyChange();
        
        console.log(`🧪 ${delayMinutes}분 후 테스트 알림 예약됨 (ID: ${notificationId})`);
        return notificationId;
      }

      return null;
    } catch (error) {
      console.error(`테스트 알림 스케줄링 실패 (${delayMinutes}분):`, error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const mobileNotificationService = MobileNotificationService.getInstance();