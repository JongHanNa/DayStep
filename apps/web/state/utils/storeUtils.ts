import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enableMapSet } from 'immer';
import { performanceMonitor, batchUpdateManager } from './performanceUtils';
import { localStorageManager } from './persistenceUtils';
import type { PersistConfig, ApiState, LoadingState, ErrorState } from '../types';

// Immer MapSet 플러그인 활성화 (Set, Map 지원)
enableMapSet();

/**
 * API 상태의 초기값을 생성하는 헬퍼 함수
 */
export function createInitialApiState<T = any>(): ApiState<T> {
  return {
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
  };
}

/**
 * 로딩 상태를 관리하는 헬퍼 함수들
 */
export const loadingHelpers = {
  setLoading: <T>(state: T & { loading: boolean }) => {
    state.loading = true;
  },
  
  setSuccess: <T>(state: T & { loading: boolean; error: string | null; lastUpdated: Date | null }) => {
    state.loading = false;
    state.error = null;
    state.lastUpdated = new Date();
  },
  
  setError: <T>(state: T & { loading: boolean; error: string | null }, error: string) => {
    state.loading = false;
    state.error = error;
  },
  
  reset: <T>(state: T & { loading: boolean; error: string | null; lastUpdated: Date | null }) => {
    state.loading = false;
    state.error = null;
    state.lastUpdated = null;
  },
};

/**
 * Zustand 스토어 생성을 위한 헬퍼 함수
 */
export function createStore<T>(
  initializer: (set: any, get: any) => T,
  options: {
    name: string;
    persist?: PersistConfig;
    devtools?: boolean;
  }
) {
  let store = initializer;

  // ✅ 1. Immer 미들웨어를 먼저 적용 (가장 바깥쪽 레이어)
  // draft state를 실제 state로 병합하는 역할
  store = immer(store) as any;

  // ✅ 2. 지속성 미들웨어를 두 번째로 적용 (중간 레이어)
  // immer가 병합한 최신 state를 storage에 저장
  if (options.persist) {
    store = persist(
      store as any,
      {
        name: options.persist.name,
        version: options.persist.version,
        storage: createJSONStorage(() => localStorage),
        partialize: (state: any) => {
          const { blacklist, whitelist } = options.persist!;

          if (whitelist) {
            const result: any = {};
            whitelist.forEach(key => {
              if (key in state) {
                result[key] = state[key];
              }
            });
            return result;
          }

          if (blacklist) {
            const result = { ...state };
            blacklist.forEach(key => {
              delete result[key];
            });
            return result;
          }

          return state;
        },
        migrate: options.persist.migrate,
      }
    ) as any;
  }

  // ✅ 3. 개발 도구 미들웨어를 마지막에 적용 (가장 안쪽 레이어)
  // 디버깅 정보를 기록
  if (options.devtools !== false && process.env.NODE_ENV === 'development') {
    store = devtools(store as any, { name: options.name }) as any;
  }

  return create(store);
}

/**
 * 비동기 작업을 위한 래퍼 함수 (성능 모니터링 포함)
 */
export function createAsyncAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<T>,
  actionName?: string
): any {
  return action;
}

/**
 * 낙관적 업데이트를 위한 헬퍼 함수
 */
export function createOptimisticUpdate<T>() {
  return {
    apply: (state: any, id: string, updates: Partial<T>) => {
      if (Array.isArray(state.data)) {
        const index = state.data.findIndex((item: any) => item.id === id);
        if (index !== -1) {
          state.data[index] = { ...state.data[index], ...updates };
        }
      } else if (state.data && state.data.id === id) {
        state.data = { ...state.data, ...updates };
      }
    },
    
    revert: (state: any, originalData: T[]) => {
      state.data = originalData;
    },
    
    addOptimistic: (state: any, newItem: T) => {
      if (Array.isArray(state.data)) {
        state.data.unshift(newItem);
      }
    },
    
    removeOptimistic: (state: any, id: string) => {
      if (Array.isArray(state.data)) {
        state.data = state.data.filter((item: any) => item.id !== id);
      }
    },
  };
}

/**
 * 고급 낙관적 업데이트 시스템
 */
export interface OptimisticOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
  retryCount: number;
  maxRetries: number;
  timestamp: number;
}

export interface OptimisticState {
  pendingOperations: Map<string, OptimisticOperation<any>>;
  isProcessing: boolean;
  error: string | null;
}

export function createOptimisticManager<T>() {
  // 일반 객체 사용 (readonly 호환성)
  let operations: Record<string, OptimisticOperation<T>> = {};
  
  return {
    /**
     * 낙관적 업데이트 작업 추가
     */
    addOperation: (
      id: string,
      type: 'create' | 'update' | 'delete',
      data: T,
      originalData?: T,
      maxRetries: number = 3
    ): OptimisticOperation<T> => {
      const operation: OptimisticOperation<T> = {
        id,
        type,
        data,
        originalData,
        retryCount: 0,
        maxRetries,
        timestamp: Date.now(),
      };
      
      // 새로운 객체 생성으로 readonly 문제 방지
      operations = {
        ...operations,
        [id]: operation
      };
      return operation;
    },
    
    /**
     * 작업 완료 처리
     */
    completeOperation: (id: string): boolean => {
      if (!(id in operations)) return false;
      
      // 새로운 객체 생성으로 readonly 문제 방지
      const newOperations = { ...operations };
      delete newOperations[id];
      operations = newOperations;
      return true;
    },
    
    /**
     * 작업 실패 처리 (재시도 로직 포함)
     */
    failOperation: (id: string): OptimisticOperation<T> | null => {
      const operation = operations[id];
      if (!operation) return null;
      
      // readonly 속성 오류 방지를 위해 완전한 새 객체 생성
      const updatedOperation: OptimisticOperation<T> = {
        id: operation.id,
        type: operation.type,
        data: operation.data,
        originalData: operation.originalData,
        retryCount: operation.retryCount + 1,
        maxRetries: operation.maxRetries,
        timestamp: operation.timestamp,
      };
      
      if (updatedOperation.retryCount >= updatedOperation.maxRetries) {
        // 새로운 객체 생성으로 readonly 문제 방지
        const newOperations = { ...operations };
        delete newOperations[id];
        operations = newOperations;
        return null;
      }
      
      // 완전한 새 객체 생성으로 업데이트
      operations = {
        ...operations,
        [id]: updatedOperation
      };
      return updatedOperation;
    },
    
    /**
     * 모든 대기 중인 작업 가져오기
     */
    getPendingOperations: (): OptimisticOperation<T>[] => {
      return Object.values(operations);
    },
    
    /**
     * 특정 작업 가져오기
     */
    getOperation: (id: string): OptimisticOperation<T> | undefined => {
      return operations[id];
    },
    
    /**
     * 모든 작업 지우기
     */
    clearOperations: (): void => {
      operations = {};
    },
    
    /**
     * 오래된 작업 정리 (5분 이상 된 작업)
     */
    cleanupStaleOperations: (): void => {
      const now = Date.now();
      const staleThreshold = 5 * 60 * 1000; // 5분
      
      const newOperations = { ...operations };
      
      for (const [id, operation] of Object.entries(newOperations)) {
        if (now - operation.timestamp > staleThreshold) {
          delete newOperations[id];
        }
      }
      
      operations = newOperations;
    },
  };
}

/**
 * 재시도 로직을 포함한 비동기 작업 래퍼
 */
export function createRetryableAction<T, Args extends any[]>(
  action: (...args: Args) => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error) => void;
    onError?: (error: Error, attempt: number) => void;
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    onRetry,
    onError,
  } = options;
  
  return async (...args: Args): Promise<T> => {
    let attempt = 0;
    let delay = retryDelay;
    
    while (attempt < maxRetries) {
      try {
        return await action(...args);
      } catch (error) {
        attempt++;
        const isLastAttempt = attempt >= maxRetries;
        
        if (isLastAttempt) {
          onError?.(error as Error, attempt);
          throw error;
        }
        
        onRetry?.(attempt, error as Error);
        
        // 지수 백오프 적용
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
    
    throw new Error('Max retries exceeded');
  };
}

/**
 * 실시간 구독을 위한 헬퍼 함수
 */
export function createRealtimeHelpers() {
  return {
    handleInsert: <T>(state: any, newItem: T) => {
      if (Array.isArray(state.data)) {
        state.data.unshift(newItem);
      }
    },
    
    handleUpdate: <T>(state: any, updatedItem: T) => {
      if (Array.isArray(state.data)) {
        const index = state.data.findIndex((item: any) => item.id === (updatedItem as any).id);
        if (index !== -1) {
          state.data[index] = updatedItem;
        }
      }
    },
    
    handleDelete: (state: any, deletedId: string) => {
      if (Array.isArray(state.data)) {
        state.data = state.data.filter((item: any) => item.id !== deletedId);
      }
    },
  };
}

/**
 * 실시간 동기화 상태 및 연결 관리
 */
export interface RealtimeConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastConnected: Date | null;
  retryCount: number;
  maxRetries: number;
  retryDelay: number;
  error: string | null;
}

export interface RealtimeSyncState {
  isInitialSyncComplete: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  conflictCount: number;
  isRealtime: boolean;
}

export function createRealtimeManager() {
  let connectionState: RealtimeConnectionState = {
    status: 'disconnected',
    lastConnected: null,
    retryCount: 0,
    maxRetries: 5,
    retryDelay: 1000,
    error: null,
  };

  let syncState: RealtimeSyncState = {
    isInitialSyncComplete: false,
    lastSyncTime: null,
    pendingChanges: 0,
    conflictCount: 0,
    isRealtime: false,
  };

  let retryTimeout: NodeJS.Timeout | null = null;

  return {
    /**
     * 연결 상태 업데이트
     */
    updateConnectionState: (updates: Partial<RealtimeConnectionState>) => {
      connectionState = { ...connectionState, ...updates };
      return connectionState;
    },

    /**
     * 동기화 상태 업데이트
     */
    updateSyncState: (updates: Partial<RealtimeSyncState>) => {
      syncState = { ...syncState, ...updates };
      return syncState;
    },

    /**
     * 연결 상태 가져오기
     */
    getConnectionState: () => ({ ...connectionState }),

    /**
     * 동기화 상태 가져오기
     */
    getSyncState: () => ({ ...syncState }),

    /**
     * 재연결 로직
     */
    scheduleReconnect: (callback: () => void) => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      if (connectionState.retryCount >= connectionState.maxRetries) {
        connectionState.status = 'error';
        connectionState.error = '최대 재연결 시도 횟수를 초과했습니다.';
        return false;
      }

      const delay = connectionState.retryDelay * Math.pow(2, connectionState.retryCount);
      connectionState.retryCount++;
      connectionState.status = 'connecting';

      retryTimeout = setTimeout(() => {
        callback();
      }, delay);

      return true;
    },

    /**
     * 재연결 취소
     */
    cancelReconnect: () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    },

    /**
     * 연결 성공 처리
     */
    handleConnectionSuccess: () => {
      const newConnectionState = {
        ...connectionState,
        status: 'connected' as const,
        lastConnected: new Date(),
        retryCount: 0,
        error: null
      };
      
      const newSyncState = {
        ...syncState,
        isRealtime: true
      };
      
      // 내부 상태 교체
      connectionState = newConnectionState;
      syncState = newSyncState;
      
      return { connectionState: newConnectionState, syncState: newSyncState };
    },

    /**
     * 연결 실패 처리
     */
    handleConnectionError: (error: string) => {
      const newConnectionState = {
        ...connectionState,
        status: 'error' as const,
        error
      };
      
      const newSyncState = {
        ...syncState,
        isRealtime: false
      };
      
      // 내부 상태 교체
      connectionState = newConnectionState;
      syncState = newSyncState;
      
      return { connectionState: newConnectionState, syncState: newSyncState };
    },

    /**
     * 초기 동기화 완료 처리
     */
    markInitialSyncComplete: () => {
      const newSyncState = {
        ...syncState,
        isInitialSyncComplete: true,
        lastSyncTime: new Date()
      };
      
      // 내부 상태 교체
      syncState = newSyncState;
      
      return newSyncState;
    },

    /**
     * 리소스 정리
     */
    cleanup: () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = null;
      }
    },
  };
}

/**
 * Last-Write-Wins 충돌 해결 알고리즘
 */
export function createConflictResolver<T extends { id: string; updatedAt: Date }>() {
  /**
   * 두 아이템 간의 충돌 해결 (더 최근 것이 우선)
   */
  const resolveConflict = (localItem: T, remoteItem: T): T => {
    const localTime = localItem.updatedAt.getTime();
    const remoteTime = remoteItem.updatedAt.getTime();
    
    // 더 최근 업데이트된 아이템이 승리
    return remoteTime >= localTime ? remoteItem : localItem;
  };

  return {
    resolveConflict,

    /**
     * 배열에서 충돌 해결
     */
    resolveArrayConflicts: (localItems: T[], remoteItems: T[]): T[] => {
      const mergedMap = new Map<string, T>();
      
      // 로컬 아이템 먼저 추가
      localItems.forEach(item => {
        mergedMap.set(item.id, item);
      });
      
      // 원격 아이템과 충돌 해결
      remoteItems.forEach(remoteItem => {
        const localItem = mergedMap.get(remoteItem.id);
        if (localItem) {
          // 충돌 해결
          const resolved = resolveConflict(localItem, remoteItem);
          mergedMap.set(remoteItem.id, resolved);
        } else {
          // 새 아이템 추가
          mergedMap.set(remoteItem.id, remoteItem);
        }
      });
      
      return Array.from(mergedMap.values());
    },

    /**
     * 충돌 감지
     */
    detectConflict: (localItem: T, remoteItem: T): boolean => {
      if (localItem.id !== remoteItem.id) return false;
      
      const localTime = localItem.updatedAt.getTime();
      const remoteTime = remoteItem.updatedAt.getTime();
      
      // 업데이트 시간이 다르면 충돌
      return Math.abs(localTime - remoteTime) > 1000; // 1초 이상 차이
    },
  };
}

/**
 * 필터링 및 정렬을 위한 헬퍼 함수
 */
export function createFilterHelpers<T>() {
  return {
    filterData: (
      data: T[],
      filters: {
        searchQuery?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        customFilters?: Record<string, any>;
      }
    ): T[] => {
      let filteredData = [...data];

      // 검색 필터링
      if (filters.searchQuery) {
        filteredData = filteredData.filter((item: any) =>
          Object.values(item).some(value =>
            String(value).toLowerCase().includes(filters.searchQuery!.toLowerCase())
          )
        );
      }

      // 커스텀 필터링
      if (filters.customFilters) {
        Object.entries(filters.customFilters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            filteredData = filteredData.filter((item: any) => {
              const itemValue = item[key];
              if (Array.isArray(itemValue)) {
                return itemValue.includes(value);
              }
              return itemValue === value;
            });
          }
        });
      }

      // 정렬
      if (filters.sortBy) {
        filteredData.sort((a: any, b: any) => {
          const aValue = a[filters.sortBy!];
          const bValue = b[filters.sortBy!];
          
          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;
          
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      return filteredData;
    },
  };
}

/**
 * 개발 환경에서 스토어 상태를 로깅하는 헬퍼 (간소화)
 */
export function logStoreAction(storeName: string, actionName: string, payload?: any) {
  if (process.env.NODE_ENV === 'development') {
    // 핵심 정보만 간단히 로깅
    console.log(`[${storeName}] ${actionName}`);
  }
}