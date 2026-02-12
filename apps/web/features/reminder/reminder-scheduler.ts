/**
 * 할일 리마인더 스케줄러
 * 사용자 설정에 따른 할일 리마인더 관리
 */

import { supabase } from '@/lib/supabase';
import type { Todo } from '@/types';

// 확장된 Todo 타입 (예정 시간 포함)
interface TodoWithSchedule extends Todo {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title: string;
}

export interface ReminderSettings {
  enabled: boolean;
  // 작업 전 리마인더 (기존)
  beforeWork: {
    enabled: boolean;
    minutes: number; // 분 단위 (1-60)
  };
  // 작업 시작 알림 (시작 시점에 바로)
  workStart: {
    enabled: boolean;
  };
  // 작업 완료 알림 (예정 완료 시점에 바로)
  workComplete: {
    enabled: boolean;
  };
  encouragementEnabled: boolean;
  encouragementTimes: string[]; // ["09:00", "21:00"] 형태
  // 호환성을 위한 기존 필드
  defaultReminderTime: number;
}

export interface ScheduledReminder {
  id: string;
  todo_id: string;
  user_id: string;
  reminder_time: string;
  notification_id: number;
  created_at: string;
}

/**
 * 할일 리마인더 스케줄러 클래스
 */
export class ReminderScheduler {
  private static instance: ReminderScheduler;
  private isInitialized = false;
  private isWebPlatform = false;
  // 웹 플랫폼용 타이머 저장소
  private webTimers: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): ReminderScheduler {
    if (!ReminderScheduler.instance) {
      ReminderScheduler.instance = new ReminderScheduler();
    }
    return ReminderScheduler.instance;
  }

  /**
   * 스케줄러 초기화
   */
  async initialize(): Promise<boolean> {
    try {
      return await this.initializeWeb();
    } catch (error) {
      console.error('Failed to initialize reminder scheduler:', error);
      return false;
    }
  }

  /**
   * 웹 플랫폼 초기화 (Web Notification API)
   */
  private async initializeWeb(): Promise<boolean> {
    try {
      // Web Notification API 지원 확인
      if (!('Notification' in window)) {
        console.log('Web Notification API is not supported');
        return false;
      }

      // 권한 확인/요청
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        console.warn('Web notification permission not granted');
        return false;
      }

      this.isWebPlatform = true;
      this.isInitialized = true;
      console.log('Web reminder scheduler initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize web reminder scheduler:', error);
      return false;
    }
  }

  /**
   * 웹 알림 스케줄링 (setTimeout 사용)
   */
  private scheduleWebNotification(
    todoId: string,
    title: string,
    body: string,
    scheduledDate: Date,
    reminderType: string
  ): boolean {
    const currentTime = new Date();
    const delay = scheduledDate.getTime() - currentTime.getTime();

    if (delay <= 0) {
      return false;
    }

    const timerId = `${todoId}_${reminderType}`;

    // 기존 타이머가 있으면 취소
    const existingTimer = this.webTimers.get(timerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 새 타이머 설정
    const timer = setTimeout(() => {
      this.showWebNotification(title, body, todoId);
      this.webTimers.delete(timerId);
    }, delay);

    this.webTimers.set(timerId, timer);
    console.log(`Web notification scheduled for ${title} at ${scheduledDate}`);
    return true;
  }

  /**
   * 웹 알림 표시
   */
  private showWebNotification(title: string, body: string, todoId: string): void {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: todoId,
          requireInteraction: false,
        });

        // 클릭 시 앱으로 포커스
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // 5초 후 자동 닫기
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error('Failed to show web notification:', error);
    }
  }

  /**
   * 할일에 대한 단계별 리마인더 스케줄링
   */
  async scheduleTodoReminder(todo: TodoWithSchedule, customSettings?: Partial<ReminderSettings>): Promise<boolean> {
    try {
      // start_time 또는 startTime 필드 모두 지원
      const scheduledTime = todo.start_time || (todo as any).startTime;
      
      if (!this.isInitialized || !scheduledTime) {
        console.log('🚫 알림 스케줄링 스킵:', {
          할일: todo.title,
          초기화됨: this.isInitialized,
          시작시간: scheduledTime
        });
        return false;
      }

      const settings = customSettings ? { ...await this.getReminderSettings(), ...customSettings } : await this.getReminderSettings();
      
      if (!settings.enabled) {
        return false;
      }

      // 🔧 할일 시간을 그대로 사용 (DB에 저장된 값이 이미 올바른 로컬 시간)
      const scheduledDate = new Date(scheduledTime);
      const endTimeSource = todo.end_time || (todo as any).endTime;
      const endTime = endTimeSource ? new Date(endTimeSource) : new Date(scheduledDate.getTime() + (60 * 60 * 1000)); // 기본 1시간
      
      let scheduledCount = 0;

      // 알림 시간 계산 완료 (디버그 모드에서만 상세 로그)

      // 1. 작업 전 리마인더
      if (settings.beforeWork.enabled) {
        const beforeReminderDate = new Date(scheduledDate.getTime() - (settings.beforeWork.minutes * 60 * 1000));
        const currentTime = new Date();

        if (beforeReminderDate > currentTime) {
          const title = '작업 준비 알림 📋';
          const body = `"${todo.title}" 작업이 ${settings.beforeWork.minutes}분 후에 시작돼요!`;

          if (this.scheduleWebNotification(todo.id, title, body, beforeReminderDate, 'before_work')) {
            scheduledCount++;
          }
        }
      }

      // 2. 작업 시작 알림 (시작 시점에 바로) - 부드러운 리마인더
      if (settings.workStart.enabled) {
        const currentTime = new Date();

        if (scheduledDate > currentTime) {
          const title = todo.title;
          const body = `지금 ${todo.title} 시간이에요`;

          if (this.scheduleWebNotification(todo.id, title, body, scheduledDate, 'work_start')) {
            scheduledCount++;
          }
        }
      }

      // 3. 작업 완료 알림 (예정 완료 시점에 바로)
      if (settings.workComplete.enabled) {
        const currentTime = new Date();

        if (endTime > scheduledDate && endTime > currentTime) {
          const title = '작업 완료 시간 ✅';
          const body = `"${todo.title}" 작업 완료 예정 시간이에요!`;

          if (this.scheduleWebNotification(todo.id, title, body, endTime, 'work_complete')) {
            scheduledCount++;
          }
        }
      }

      console.log(`Scheduled ${scheduledCount} reminders for todo ${todo.id}`);
      return scheduledCount > 0;
    } catch (error) {
      console.error('Failed to schedule todo reminders:', error);
      return false;
    }
  }


  /**
   * 특정 할일의 리마인더 취소
   */
  async cancelTodoReminder(todoId: string): Promise<void> {
    try {
      // 웹 플랫폼: 타이머 취소
      const timerTypes = ['before_work', 'work_start', 'work_complete'];
      timerTypes.forEach(type => {
        const timerId = `${todoId}_${type}`;
        const timer = this.webTimers.get(timerId);
        if (timer) {
          clearTimeout(timer);
          this.webTimers.delete(timerId);
        }
      });
      console.log(`Cancelled web timers for todo ${todoId}`);
    } catch (error) {
      console.error('Failed to cancel todo reminder:', error);
    }
  }

  /**
   * 모든 스케줄된 알림 취소
   */
  async cancelAllReminders(): Promise<void> {
    try {
      // 웹 플랫폼: 모든 타이머 취소
      this.webTimers.forEach((timer) => clearTimeout(timer));
      this.webTimers.clear();
      console.log('All web timers cancelled');
    } catch (error) {
      console.error('Failed to cancel all reminders:', error);
    }
  }

  /**
   * 리마인더 설정 조회
   * user_settings 테이블이 없으면 기본 설정 사용
   */
  private async getReminderSettings(): Promise<ReminderSettings> {
    // user_settings 테이블이 없으므로 기본 설정 반환
    // 추후 사용자 설정 기능 추가 시 user_preferences 테이블 활용
    return this.getDefaultSettings();
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultSettings(): ReminderSettings {
    return {
      enabled: true,
      beforeWork: {
        enabled: true,   // 시작 전 알림 활성화 (사용자 요청에 따라)
        minutes: 4       // 사용자 설정값: 4분 전 알림
      },
      workStart: {
        enabled: true
      },
      workComplete: {
        enabled: true
      },
      encouragementEnabled: false, // 다짐 기능 비활성화
      encouragementTimes: [], // 빈 배열로 설정
      // 호환성을 위한 기존 필드
      defaultReminderTime: 30
    };
  }

}

// 싱글톤 인스턴스 export
export const reminderScheduler = ReminderScheduler.getInstance();