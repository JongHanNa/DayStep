'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useReminder, useReminderInitializer } from '@/hooks/useReminder';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAuth } from '@/app/context/AuthContext';

interface ReminderContextType {
  isInitialized: boolean;
  syncReminders: () => Promise<void>;
  handleTodoTimeChange: (todo: any) => Promise<void>;
}

const ReminderContext = createContext<ReminderContextType | null>(null);

export function useReminderContext() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminderContext must be used within ReminderProvider');
  }
  return context;
}

interface ReminderProviderProps {
  children: React.ReactNode;
}

export function ReminderProvider({ children }: ReminderProviderProps) {
  
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated } = useAuth();
  const { todos } = useTodoStore();
  const { syncReminders, handleTodoTimeChange, initializeReminder } = useReminder();
  
  // 앱 시작 시 리마인더 시스템 초기화
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      const initialize = async () => {
        try {
          console.log('🔔 [ReminderProvider] 리마인더 시스템 초기화 시작');
          await initializeReminder();
          setIsInitialized(true);
          console.log('✅ [ReminderProvider] 리마인더 시스템 초기화 완료');
        } catch (error) {
          console.error('❌ [ReminderProvider] 리마인더 시스템 초기화 실패:', error);
        }
      };

      initialize();
    }
  }, [isAuthenticated, isInitialized, initializeReminder]);

  // 인증된 사용자의 할일 목록이 로드되면 리마인더 동기화
  useEffect(() => {
    if (isAuthenticated && isInitialized && todos.length > 0) {
      // 중복 실행 방지를 위한 더 긴 디바운스
      const timeoutId = setTimeout(async () => {
        try {
          console.log('🔄 [ReminderProvider] 할일 목록 변경 감지 - 리마인더 동기화 시작');
          console.log('📊 [ReminderProvider] 동기화 요청 시간:', new Date().toISOString());
          await syncReminders();
          console.log('✅ [ReminderProvider] 리마인더 동기화 완료');
        } catch (error) {
          console.error('❌ [ReminderProvider] 리마인더 동기화 실패:', error);
        }
      }, 5000); // 5초 디바운스로 증가 (중복 실행 방지)

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isAuthenticated, isInitialized, todos.length, syncReminders]);

  const contextValue: ReminderContextType = {
    isInitialized,
    syncReminders,
    handleTodoTimeChange,
  };

  return (
    <ReminderContext.Provider value={contextValue}>
      {children}
    </ReminderContext.Provider>
  );
}