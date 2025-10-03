/**
 * 할일 리마인더 스케줄러
 * 사용자 설정에 따른 할일 리마인더 관리
 */

import { QuietLocalNotifications as LocalNotifications } from '@/lib/quietCapacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import type { Todo } from '@/types';

// 확장된 Todo 타입 (예정 시간 포함)
interface TodoWithSchedule extends Todo {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
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
      if (!Capacitor.isNativePlatform()) {
        console.log('Local notifications are only available on native platforms');
        return false;
      }

      // 권한 요청
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return false;
      }

      // 알림 액션 리스너 등록
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        this.handleNotificationAction(notification);
      });

      this.isInitialized = true;
      console.log('Reminder scheduler initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize reminder scheduler:', error);
      return false;
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
          할일: todo.title || todo.content,
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
        // 작업 전 리마인더 시간 체크 완료
        
        if (beforeReminderDate > currentTime) {
          const notificationId = Math.floor(Math.random() * 1000000);
          
          await LocalNotifications.schedule({
            notifications: [{
              title: '작업 준비 알림 📋',
              body: `"${todo.title || todo.content}" 작업이 ${settings.beforeWork.minutes}분 후에 시작돼요!`,
              id: notificationId,
              schedule: { at: beforeReminderDate },
              actionTypeId: 'BEFORE_WORK_REMINDER',
              extra: {
                todoId: todo.id,
                action: 'before_work',
                type: 'before',
                scheduledTime: scheduledTime
              }
            }]
          });

          await this.saveReminderSchedule(todo.id, beforeReminderDate, notificationId, 'before_work');
          scheduledCount++;
        }
      }

      // 2. 작업 시작 알림 (시작 시점에 바로)
      if (settings.workStart.enabled) {
        const currentTime = new Date();
        // 작업 시작 리마인더 시간 체크 완료
        
        if (scheduledDate > currentTime) {
          const notificationId = Math.floor(Math.random() * 1000000);
          
          await LocalNotifications.schedule({
            notifications: [{
              title: '작업 시작 알림 🚀',
              body: `"${todo.title || todo.content}" 작업을 시작할 시간이에요!`,
              id: notificationId,
              schedule: { at: scheduledDate },
              actionTypeId: 'WORK_START_REMINDER',
              extra: {
                todoId: todo.id,
                action: 'work_start',
                type: 'start',
                scheduledTime: scheduledTime
              }
            }]
          });

          await this.saveReminderSchedule(todo.id, scheduledDate, notificationId, 'work_start');
          scheduledCount++;
        }
      }

      // 3. 작업 완료 알림 (예정 완료 시점에 바로)
      if (settings.workComplete.enabled) {
        const currentTime = new Date();
        // 작업 완료 리마인더 시간 체크 완료
        
        // 완료 알림 조건 확인 완료
        
        if (endTime > scheduledDate && endTime > currentTime) {
          const notificationId = Math.floor(Math.random() * 1000000);
          
          await LocalNotifications.schedule({
            notifications: [{
              title: '작업 완료 시간 ✅',
              body: `"${todo.title || todo.content}" 작업 완료 예정 시간이에요!`,
              id: notificationId,
              schedule: { at: endTime },
              actionTypeId: 'WORK_COMPLETE_REMINDER',
              extra: {
                todoId: todo.id,
                action: 'work_complete',
                type: 'complete',
                scheduledTime: scheduledTime
              }
            }]
          });

          await this.saveReminderSchedule(todo.id, endTime, notificationId, 'work_complete');
          scheduledCount++;
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
      // 스케줄된 리마인더 정보 조회
      const { data: schedules } = await (supabase as any)
        .from('scheduled_reminders')
        .select('notification_id')
        .eq('todo_id', todoId);

      if (schedules && schedules.length > 0) {
        const notificationIds = schedules.map((s: any) => s.notification_id);
        
        await LocalNotifications.cancel({
          notifications: notificationIds.map((id: number) => ({ id }))
        });

        // DB에서 스케줄 정보 삭제
        await (supabase as any)
          .from('scheduled_reminders')
          .delete()
          .eq('todo_id', todoId);

        console.log(`Cancelled reminders for todo ${todoId}`);
      }
    } catch (error) {
      console.error('Failed to cancel todo reminder:', error);
    }
  }

  /**
   * 모든 스케줄된 알림 취소
   */
  async cancelAllReminders(): Promise<void> {
    try {
      // ✅ 웹 환경에서는 아무 작업도 하지 않고 즉시 리턴
      if (!Capacitor.isNativePlatform()) {
        console.debug('cancelAllReminders skipped - not a native platform');
        return;
      }

      // 모든 대기 중인 알림 가져오기
      const pendingNotifications = await LocalNotifications.getPending();
      // Checking pending notifications

      // 모든 알림 취소 (notification ID 배열로 전달)
      if (pendingNotifications.notifications.length > 0) {
        const notificationIds = pendingNotifications.notifications.map(n => ({ id: n.id }));
        await LocalNotifications.cancel({
          notifications: notificationIds
        });
      }

      // DB에서 모든 스케줄 정보 삭제 (테이블 없으면 무시)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await (supabase as any)
            .from('scheduled_reminders')
            .delete()
            .eq('user_id', user.id);
        }
      } catch (dbError) {
        // scheduled_reminders 테이블이 아직 생성되지 않은 경우 조용히 무시
        console.debug('scheduled_reminders table not found - skipping DB cleanup');
      }

      console.log('All reminders cancelled');
    } catch (error) {
      console.error('Failed to cancel all reminders:', error);
    }
  }

  /**
   * 알림 액션 처리
   */
  private async handleNotificationAction(notificationAction: any): Promise<void> {
    const { notification, actionId } = notificationAction;
    const { todoId, action } = notification.extra || {};

    console.log('Handling notification action:', { actionId, todoId, action });

    try {
      if (action === 'remind' && todoId) {
        switch (actionId) {
          case 'complete':
            // 할일 완료 처리
            await this.completeTodoFromNotification(todoId);
            break;
          case 'snooze':
            // 10분 후 다시 알림
            await this.snoozeReminder(todoId, 10);
            break;
        }
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  /**
   * 알림에서 할일 완료 처리
   */
  private async completeTodoFromNotification(todoId: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('todos')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', todoId);

      if (error) {
        console.error('Failed to complete todo from notification:', error);
      } else {
        console.log(`Todo ${todoId} completed from notification`);
        
        // 성공 피드백 알림
        await LocalNotifications.schedule({
          notifications: [{
            title: '완료! 🎉',
            body: '할일이 성공적으로 완료되었습니다!',
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) }, // 1초 후
            actionTypeId: 'COMPLETION_FEEDBACK'
          }]
        });
      }
    } catch (error) {
      console.error('Error completing todo from notification:', error);
    }
  }

  /**
   * 리마인더 미루기
   */
  private async snoozeReminder(todoId: string, delayMinutes: number): Promise<void> {
    try {
      const { data: todo } = await (supabase as any)
        .from('todos')
        .select('title')
        .eq('id', todoId)
        .single();

      if (!todo) return;

      const snoozeDate = new Date(Date.now() + (delayMinutes * 60 * 1000));
      const notificationId = Math.floor(Math.random() * 1000000);

      await LocalNotifications.schedule({
        notifications: [{
          title: '할일 알림 🔔',
          body: `"${todo.title}" 미루기 완료! 이제 할 시간이에요!`,
          id: notificationId,
          schedule: { at: snoozeDate },
          actionTypeId: 'TODO_REMINDER',
          extra: {
            todoId: todoId,
            action: 'remind',
            snoozed: true
          }
        }]
      });

      console.log(`Snoozed reminder for todo ${todoId} by ${delayMinutes} minutes`);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
    }
  }


  /**
   * 리마인더 설정 조회
   */
  private async getReminderSettings(): Promise<ReminderSettings> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.getDefaultSettings();
      }

      const { data } = await (supabase as any)
        .from('user_settings')
        .select('reminder_settings')
        .eq('user_id', user.id)
        .single();

      const settings = data?.reminder_settings || this.getDefaultSettings();
      return settings;
    } catch (error) {
      console.error('Error getting reminder settings:', error);
      return this.getDefaultSettings();
    }
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

  /**
   * 스케줄 정보 저장
   */
  private async saveReminderSchedule(todoId: string, reminderTime: Date, notificationId: number, reminderType: string = 'before_work'): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const scheduleData: Omit<ScheduledReminder, 'created_at'> & { reminder_type?: string } = {
        id: `${todoId}_${reminderType}_${Date.now()}`,
        todo_id: todoId,
        user_id: user.id,
        reminder_time: reminderTime.toISOString(),
        notification_id: notificationId,
        reminder_type: reminderType
      };

      const { error } = await (supabase as any)
        .from('scheduled_reminders')
        .insert(scheduleData);

      if (error) {
        console.error('Failed to save reminder schedule:', error);
      }
    } catch (error) {
      console.error('Error saving reminder schedule:', error);
    }
  }
}

// 싱글톤 인스턴스 export
export const reminderScheduler = ReminderScheduler.getInstance();