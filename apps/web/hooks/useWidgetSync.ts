'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { WidgetBridge, type WidgetTodo, type SyncOptions, type WidgetStatus } from '../plugins/widget-bridge/src';
import { useTodoStore } from '@/state/stores/todoStore';
import type { Todo } from '@/entities/todo/Todo';

/**
 * Widget 동기화 상태
 */
interface WidgetSyncState {
  isLoading: boolean;
  isSupported: boolean;
  lastSync: Date | null;
  error: string | null;
  status: WidgetStatus | null;
}

/**
 * Widget 동기화를 위한 React Hook
 * Todo 스토어와 연동하여 자동 동기화 기능 제공
 */
export const useWidgetSync = () => {
  const [syncState, setSyncState] = useState<WidgetSyncState>({
    isLoading: false,
    isSupported: Capacitor.isNativePlatform(),
    lastSync: null,
    error: null,
    status: null
  });

  const { todos } = useTodoStore();
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastSyncedTodosRef = useRef<string>('');

  /**
   * Todo 데이터를 Widget용 형태로 변환
   */
  const transformTodosForWidget = useCallback((todos: Todo[]): WidgetTodo[] => {
    return todos
      .filter(todo => {
        // 완료되지 않은 할일 우선
        // 오늘 또는 가까운 날짜의 할일만 포함
        if (todo.completed) return false;
        
        if ((todo as any).due_date) {
          const dueDate = new Date((todo as any).due_date);
          const today = new Date();
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          // 오늘부터 7일 이내의 할일만 포함
          return daysDiff >= 0 && daysDiff <= 7;
        }
        
        return true; // due_date가 없는 경우 포함
      })
      .sort((a, b) => {
        // 우선순위 정렬 (high > medium > low)
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[(a as any).priority as keyof typeof priorityOrder] || 2;
        const bPriority = priorityOrder[(b as any).priority as keyof typeof priorityOrder] || 2;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // 마감일 정렬 (가까운 순)
        if ((a as any).due_date && (b as any).due_date) {
          return new Date((a as any).due_date).getTime() - new Date((b as any).due_date).getTime();
        }
        
        if ((a as any).due_date && !(b as any).due_date) return -1;
        if (!(a as any).due_date && (b as any).due_date) return 1;
        
        // 생성일 정렬 (최신 순)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 20) // 최대 20개만
      .map((todo): WidgetTodo => ({
        id: todo.id,
        title: (todo as any).title || todo.title,
        completed: todo.completed,
        priority: ((todo as any).priority as 'high' | 'medium' | 'low') || 'medium',
        dueDate: (todo as any).due_date || undefined,
        createdAt: new Date(todo.createdAt).toISOString(),
        updatedAt: new Date(todo.updatedAt).toISOString(),
        category: (todo as any).category || undefined,
        tags: (todo as any).tags ? (Array.isArray((todo as any).tags) ? (todo as any).tags : [(todo as any).tags]) : undefined
      }));
  }, []);

  /**
   * Widget과 할일 데이터 동기화
   */
  const syncTodos = useCallback(async (todosToSync?: Todo[], options?: Partial<SyncOptions>): Promise<boolean> => {
    if (!syncState.isSupported) {
      console.log('Widget sync skipped - not supported on this platform');
      return false;
    }

    try {
      setSyncState(prev => ({ ...prev, isLoading: true, error: null }));

      const targetTodos = todosToSync || todos;
      const widgetTodos = transformTodosForWidget(targetTodos);
      
      // 데이터가 변경되지 않았으면 스킵
      const todosHash = JSON.stringify(widgetTodos);
      if (todosHash === lastSyncedTodosRef.current) {
        setSyncState(prev => ({ ...prev, isLoading: false }));
        return true;
      }

      const syncOptions: SyncOptions = {
        todos: widgetTodos,
        maxItems: 20,
        force: false,
        ...options
      };

      const result = await WidgetBridge.syncTodos(syncOptions);

      if (result.success) {
        lastSyncedTodosRef.current = todosHash;
        setSyncState(prev => ({
          ...prev,
          isLoading: false,
          lastSync: new Date(),
          error: null
        }));
        
        console.log(`✅ Widget sync successful: ${widgetTodos.length} todos`);
        return true;
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setSyncState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      console.error('❌ Widget sync failed:', errorMessage);
      return false;
    }
  }, [syncState.isSupported, todos, transformTodosForWidget]);

  /**
   * 디바운스된 동기화
   */
  const debouncedSync = useCallback((todos: Todo[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      syncTodos(todos);
    }, 500); // 500ms 디바운스
  }, [syncTodos]);

  /**
   * Widget에서 할일 데이터 가져오기
   */
  const getTodosFromWidget = useCallback(async (): Promise<WidgetTodo[]> => {
    if (!syncState.isSupported) return [];

    try {
      const result = await WidgetBridge.getTodos();
      console.log(`✅ Retrieved ${result.count} todos from widget`);
      return result.todos;
    } catch (error) {
      console.error('❌ Failed to get todos from widget:', error);
      return [];
    }
  }, [syncState.isSupported]);

  /**
   * Widget 새로고침
   */
  const reloadWidget = useCallback(async (): Promise<boolean> => {
    if (!syncState.isSupported) return false;

    try {
      const result = await WidgetBridge.reloadWidget();
      if (result.success) {
        console.log('✅ Widget reload requested');
        return true;
      } else {
        throw new Error(result.message || 'Reload failed');
      }
    } catch (error) {
      console.error('❌ Widget reload failed:', error);
      return false;
    }
  }, [syncState.isSupported]);

  /**
   * Widget 상태 가져오기
   */
  const getWidgetStatus = useCallback(async (): Promise<WidgetStatus | null> => {
    if (!syncState.isSupported) return null;

    try {
      const status = await WidgetBridge.getWidgetStatus();
      setSyncState(prev => ({ ...prev, status }));
      return status;
    } catch (error) {
      console.error('❌ Failed to get widget status:', error);
      return null;
    }
  }, [syncState.isSupported]);

  /**
   * Widget 모든 데이터 삭제
   */
  const clearWidget = useCallback(async (): Promise<boolean> => {
    if (!syncState.isSupported) return false;

    try {
      const result = await WidgetBridge.clearTodos();
      if (result.success) {
        lastSyncedTodosRef.current = '';
        setSyncState(prev => ({ ...prev, lastSync: new Date() }));
        console.log('✅ Widget data cleared');
        return true;
      } else {
        throw new Error(result.message || 'Clear failed');
      }
    } catch (error) {
      console.error('❌ Widget clear failed:', error);
      return false;
    }
  }, [syncState.isSupported]);

  /**
   * 앱 특정 섹션 열기
   */
  const openAppSection = useCallback(async (section: string = 'todos', todoId?: string): Promise<boolean> => {
    if (!syncState.isSupported) {
      // 웹에서는 라우터를 통한 네비게이션
      if (typeof window !== 'undefined') {
        const path = todoId ? `/${section}?id=${todoId}` : `/${section}`;
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return true;
      }
      return false;
    }

    try {
      const result = await WidgetBridge.openApp({ section, todoId });
      return result.success;
    } catch (error) {
      console.error('❌ Failed to open app section:', error);
      return false;
    }
  }, [syncState.isSupported]);

  // Todo 스토어 변경 감지 및 자동 동기화
  useEffect(() => {
    if (!syncState.isSupported) return;

    // Todo가 변경될 때마다 디바운스된 동기화 실행
    debouncedSync(todos);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [syncState.isSupported, todos, debouncedSync]);

  // Widget 이벤트 리스너 등록
  useEffect(() => {
    if (!syncState.isSupported) return;

    const setupEventListeners = async () => {
      try {
        // Widget 데이터 변경 이벤트
        await WidgetBridge.addListener('widgetDataChanged', (data) => {
          console.log('📱 Widget data changed:', data);
          setSyncState(prev => ({ ...prev, lastSync: new Date(data.timestamp) }));
        });

        // Widget 탭 이벤트
        await WidgetBridge.addListener('widgetTapped', (data) => {
          console.log('👆 Widget tapped:', data);
          openAppSection(data.section, data.todoId);
        });

        console.log('✅ Widget event listeners registered');
      } catch (error) {
        console.error('❌ Failed to register widget event listeners:', error);
      }
    };

    setupEventListeners();

    return () => {
      WidgetBridge.removeAllListeners();
    };
  }, [syncState.isSupported, openAppSection]);

  // 초기 상태 로드
  useEffect(() => {
    if (syncState.isSupported) {
      getWidgetStatus();
    }
  }, [syncState.isSupported, getWidgetStatus]);

  return {
    // 상태
    ...syncState,
    
    // 메소드
    syncTodos,
    getTodosFromWidget,
    reloadWidget,
    getWidgetStatus,
    clearWidget,
    openAppSection,
    
    // 유틸리티
    transformTodosForWidget,
    
    // 통계
    stats: {
      todosCount: todos.length,
      widgetTodosCount: transformTodosForWidget(todos).length,
      lastSyncTime: syncState.lastSync,
      syncedTodosCount: syncState.status?.syncedTodosCount || 0
    }
  };
};