'use client';

import { useEffect, useCallback } from 'react';
import { reminderScheduler } from '@/features/reminder/reminder-scheduler';
import { useTodoStore } from '@/state/stores/todoStore';
import { generateRecurrenceInstances } from '@/lib/recurrence-utils';
import type { Todo } from '@/types';

// 확장된 Todo 타입 (예정 시간 포함)
interface TodoWithSchedule extends Todo {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  title?: string;
}

/**
 * 리마인더 관리 훅
 * 할일 상태 변화에 따라 자동으로 리마인더를 스케줄링/취소
 */
export function useReminder() {
  const { todos } = useTodoStore();

  /**
   * 리마인더 스케줄러 초기화
   */
  const initializeReminder = useCallback(async () => {
    try {
      const initialized = await reminderScheduler.initialize();
      if (initialized) {
        // 격려 알림 생성 완전 차단됨 - 절대 호출하지 않음
      }
    } catch (error) {
      console.error('Failed to initialize reminder system:', error);
    }
  }, []);

  /**
   * 특정 할일에 대한 리마인더 스케줄링
   */
  const scheduleReminder = useCallback(async (todo: TodoWithSchedule, reminderMinutes?: number) => {
    try {
      // 필드명 확인: startTime (변환된 객체) 또는 start_time (원본 DB 필드)
      const scheduledTime = (todo as any).startTime || todo.start_time;
      if (!scheduledTime || todo.completed) {
        return false;
      }


      const success = await reminderScheduler.scheduleTodoReminder(todo);
      return success;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      return false;
    }
  }, []);

  /**
   * 특정 할일의 리마인더 취소
   */
  const cancelReminder = useCallback(async (todoId: string) => {
    try {
      await reminderScheduler.cancelTodoReminder(todoId);
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
    }
  }, []);

  /**
   * 모든 리마인더 취소
   */
  const cancelAllReminders = useCallback(async () => {
    try {
      await reminderScheduler.cancelAllReminders();
    } catch (error) {
      console.error('Failed to cancel all reminders:', error);
    }
  }, []);

  /**
   * 할일 목록 변화에 따른 리마인더 자동 관리
   */
  const syncReminders = useCallback(async () => {
    try {
      // 기존 리마인더 모두 취소
      await cancelAllReminders();

      // 🔄 반복 할일과 일반 할일 분리 및 인스턴스 생성
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // 오늘 23:59:59
      
      const regularTodos: TodoWithSchedule[] = [];
      const recurringTodos: any[] = [];
      
      
      for (const todo of todos) {
        const recurrencePattern = (todo as any).recurrence_pattern || (todo as any).recurrencePattern;
        
        
        if (recurrencePattern && recurrencePattern !== 'none') {
          recurringTodos.push(todo as any);
        } else {
          regularTodos.push(todo as unknown as TodoWithSchedule);
        }
      }
      
      
      // 🔄 반복 할일 인스턴스 생성 (오늘만)
      const allRecurringInstances: TodoWithSchedule[] = [];
      
      
      for (const recurringTodo of recurringTodos) {
        try {
          
          const instances = generateRecurrenceInstances({
            originalTodo: recurringTodo,
            rangeStart: today,
            rangeEnd: todayEnd,
            excludedDates: []
          });
          
          
          for (const instance of instances) {
            try {
              
              // 반복 할일 인스턴스를 TodoWithSchedule 형태로 변환
              // end_time도 오늘 기준으로 계산 (시작 시간에서 원본 duration만큼 추가)
              
              // ✅ 타임라인과 동일한 방식: instance.data 사용 (올바른 시간 정보 포함)
              
              const instanceTodo: TodoWithSchedule = {
                ...recurringTodo,
                // ✅ instance.data에서 올바른 시간 정보 사용
                id: instance.data.id,
                start_time: instance.data.start_time,
                startTime: instance.data.start_time,
                end_time: instance.data.end_time,
                endTime: instance.data.end_time,
                is_recurrence_instance: instance.data.is_recurrence_instance,
                recurrence_source_id: instance.data.recurrence_source_id,
                recurrence_occurrence_date: instance.data.recurrence_occurrence_date,
              } as unknown as TodoWithSchedule;
              
              
              allRecurringInstances.push(instanceTodo);
              
            } catch (instanceError) {
              console.error(`❌ [${recurringTodo.content?.substring(0, 15)}] 인스턴스 변환 실패:`, {
                instanceId: instance.id.substring(0, 20),
                error: instanceError,
                errorMessage: instanceError instanceof Error ? instanceError.message : String(instanceError),
                errorStack: instanceError instanceof Error ? instanceError.stack : undefined,
                originalTodo: {
                  id: recurringTodo.id?.substring(0, 8),
                  start_time: recurringTodo.start_time,
                  end_time: recurringTodo.end_time
                }
              });
            }
          }
        } catch (error) {
          console.error(`반복 할일 인스턴스 생성 실패: ${recurringTodo.id}`, error);
        }
      }

      // 📋 모든 할일 합치기 (일반 할일 + 반복 할일 인스턴스)
      const allTodos = [...regularTodos, ...allRecurringInstances];
      

      // 활성 할일들 필터링 (미래 시간인 할일만)
      const activeTodos = allTodos.filter(todo => {        
        // 1. 시간이 설정된 할일인지 확인 (start_time 또는 startTime 필드)
        const scheduledTime = todo.start_time || (todo as any).startTime;
        if (!scheduledTime || todo.completed) {
          return false;
        }
        
        // 2. 현재 시간과 비교 (미래 시간인 할일만)
        const startTime = new Date(scheduledTime);
        const isFutureTime = startTime > now;
        
        
        return isFutureTime;
      });


      for (const todo of activeTodos) {
        await scheduleReminder(todo);
      }

      // 격려 알림 생성 완전 차단됨 - 절대 호출하지 않음
      
    } catch (error) {
      console.error('Failed to sync reminders:', error);
    }
  }, [todos, scheduleReminder, cancelAllReminders]);

  /**
   * 할일 완료 시 리마인더 취소
   */
  const handleTodoComplete = useCallback(async (todoId: string) => {
    await cancelReminder(todoId);
  }, [cancelReminder]);

  /**
   * 할일 시간 변경 시 리마인더 업데이트
   */
  const handleTodoTimeChange = useCallback(async (todo: TodoWithSchedule) => {
    // 기존 리마인더 취소
    await cancelReminder(todo.id);
    
    // 새 시간으로 리마인더 스케줄링 (올바른 필드명)
    if (todo.start_time && !todo.completed) {
      await scheduleReminder(todo);
    }
  }, [cancelReminder, scheduleReminder]);

  // 초기화
  useEffect(() => {
    initializeReminder();
  }, [initializeReminder]);

  // 할일 목록 변화 감지 및 동기화
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncReminders();
    }, 1000); // 1초 디바운스

    return () => clearTimeout(timeoutId);
  }, [todos.length, syncReminders]); // todos 배열 길이 변화 + syncReminders 의존성 추가

  return {
    scheduleReminder,
    cancelReminder,
    cancelAllReminders,
    syncReminders,
    handleTodoComplete,
    handleTodoTimeChange,
    initializeReminder
  };
}

/**
 * 리마인더 초기화 훅 (앱 전체에서 한 번만 실행)
 */
export function useReminderInitializer() {
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if (mounted) {
          await reminderScheduler.initialize();
          // 격려 알림 생성 완전 차단됨 - 절대 호출하지 않음
        }
      } catch (error) {
        console.error('Failed to initialize reminder system:', error);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);
}