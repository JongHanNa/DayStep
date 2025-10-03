'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import type { Todo } from '@/entities/todo/Todo';

// 웹 빌드에서는 위젯 기능 비활성화
const isWebBuild = process.env.BUILD_TARGET === 'web';

// 위젯 타입 정의 (플러그인이 없는 경우 fallback)
type WidgetTodo = {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
};

type WidgetStatus = 'active' | 'completed' | 'pending';

interface WidgetSyncContextType {
  // 상태
  isLoading: boolean;
  isSupported: boolean;
  lastSync: Date | null;
  error: string | null;
  status: WidgetStatus | null;
  
  // 메소드
  syncTodos: (todos?: Todo[]) => Promise<boolean>;
  getTodosFromWidget: () => Promise<WidgetTodo[]>;
  reloadWidget: () => Promise<boolean>;
  getWidgetStatus: () => Promise<WidgetStatus | null>;
  clearWidget: () => Promise<boolean>;
  openAppSection: (section?: string, todoId?: string) => Promise<boolean>;
  
  // 통계
  stats: {
    todosCount: number;
    widgetTodosCount: number;
    lastSyncTime: Date | null;
    syncedTodosCount: number;
  };
}

const WidgetSyncContext = createContext<WidgetSyncContextType | null>(null);

interface WidgetSyncProviderProps {
  children: ReactNode;
  /** 자동 동기화 활성화 여부 (기본: true) */
  enableAutoSync?: boolean;
  /** 동기화 간격 (밀리초, 기본: 500) */
  syncDebounceMs?: number;
}

/**
 * 위젯 동기화를 제공하는 컨텍스트 프로바이더
 * Todo 스토어와 연동하여 자동으로 위젯을 동기화합니다.
 */
// 웹 빌드용 Mock Provider
const WebMockWidgetSyncProvider: React.FC<WidgetSyncProviderProps> = ({ children }) => {
  const mockContextValue: WidgetSyncContextType = {
    isLoading: false,
    isSupported: false,
    lastSync: null,
    error: null,
    status: null,
    syncTodos: async () => false,
    getTodosFromWidget: async () => [],
    reloadWidget: async () => false,
    getWidgetStatus: async () => null,
    clearWidget: async () => false,
    openAppSection: async () => false,
    stats: { todosCount: 0, widgetTodosCount: 0, lastSyncTime: null, syncedTodosCount: 0 },
  };

  return (
    <WidgetSyncContext.Provider value={mockContextValue}>
      {children}
    </WidgetSyncContext.Provider>
  );
};

// 모바일 빌드용 실제 Provider
const MobileWidgetSyncProvider: React.FC<WidgetSyncProviderProps> = ({ 
  children, 
  enableAutoSync = true,
  syncDebounceMs = 500 
}) => {
  // 동적 import로 useWidgetSync 불러오기
  const { useWidgetSync } = require('@/hooks/useWidgetSync');
  const { useTodoStore } = require('@/state/stores/todoStore');

  const {
    isLoading,
    isSupported,
    lastSync,
    error,
    status,
    syncTodos,
    getTodosFromWidget,
    reloadWidget,
    getWidgetStatus,
    clearWidget,
    openAppSection,
    stats
  } = useWidgetSync();

  const { todos } = useTodoStore();

  // 앱 라이프사이클 이벤트 처리
  useEffect(() => {
    if (!isSupported || !enableAutoSync) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 포그라운드 복귀 시 위젯 새로고침
        reloadWidget();
        
        // 상태 업데이트
        setTimeout(() => {
          getWidgetStatus();
        }, 100);
      }
    };

    const handleFocus = () => {
      if (isSupported) {
        reloadWidget();
      }
    };

    const handlePageHide = () => {
      // 앱이 백그라운드로 이동할 때 최종 동기화
      if (isSupported && todos.length > 0) {
        syncTodos();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isSupported, enableAutoSync, reloadWidget, getWidgetStatus, syncTodos, todos.length]);

  // 초기 동기화
  useEffect(() => {
    if (isSupported && enableAutoSync && todos.length > 0) {
      // 컴포넌트 마운트 시 초기 동기화
      const timer = setTimeout(() => {
        syncTodos();
      }, 1000); // 1초 지연 후 동기화

      return () => clearTimeout(timer);
    }
    
    // 조건이 맞지 않을 때는 cleanup 없음
    return;
  }, [isSupported, enableAutoSync, syncTodos, todos.length]);

  // 네트워크 상태 변화 감지
  useEffect(() => {
    if (!isSupported || !enableAutoSync) return;

    const handleOnline = () => {
      console.log('📶 Network back online - syncing widget...');
      syncTodos();
    };

    const handleOffline = () => {
      console.log('📵 Network offline - widget sync paused');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSupported, enableAutoSync, syncTodos]);

  const contextValue: WidgetSyncContextType = {
    // 상태
    isLoading,
    isSupported,
    lastSync,
    error,
    status,
    
    // 메소드
    syncTodos,
    getTodosFromWidget,
    reloadWidget,
    getWidgetStatus,
    clearWidget,
    openAppSection,
    
    // 통계
    stats
  };

  return (
    <WidgetSyncContext.Provider value={contextValue}>
      {children}
    </WidgetSyncContext.Provider>
  );
};

// 빌드 타겟에 따라 다른 Provider export
export const WidgetSyncProvider = isWebBuild ? WebMockWidgetSyncProvider : MobileWidgetSyncProvider;

/**
 * 위젯 동기화 컨텍스트를 사용하는 Hook
 */
export const useWidgetSyncContext = (): WidgetSyncContextType => {
  const context = useContext(WidgetSyncContext);
  if (!context) {
    throw new Error('useWidgetSyncContext must be used within a WidgetSyncProvider');
  }
  return context;
};