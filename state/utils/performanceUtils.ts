/**
 * 상태 관리 성능 최적화 유틸리티
 * 메모이제이션, 배치 업데이트, 가상화 등 성능 향상 기능
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';

/**
 * 간단한 디바운스 구현
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout;

  const debouncedFunction = ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), wait);
  }) as T & { cancel: () => void };

  debouncedFunction.cancel = () => {
    clearTimeout(timeoutId);
  };

  return debouncedFunction;
}

/**
 * 간단한 스로틀 구현
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;

  const throttledFunction = ((...args: any[]) => {
    const now = Date.now();

    if (now - lastCallTime >= wait) {
      lastCallTime = now;
      func.apply(null, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        timeoutId = null;
        func.apply(null, args);
      }, wait - (now - lastCallTime));
    }
  }) as T & { cancel: () => void };

  throttledFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFunction;
}

/**
 * 성능 메트릭 수집기
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 성능 측정 시작
   */
  startMeasure(key: string): void {
    this.startTimes.set(key, performance.now());
  }

  /**
   * 성능 측정 종료 및 기록
   */
  endMeasure(key: string): number {
    const startTime = this.startTimes.get(key);
    if (!startTime) {
      console.warn(`성능 측정이 시작되지 않음: ${key}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const measurements = this.metrics.get(key)!;
    measurements.push(duration);
    
    // 최근 100개 측정값만 유지
    if (measurements.length > 100) {
      measurements.shift();
    }

    this.startTimes.delete(key);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${key}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * 성능 통계 조회
   */
  getStats(key: string): {
    average: number;
    min: number;
    max: number;
    count: number;
    p95: number;
  } | null {
    const measurements = this.metrics.get(key);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      average: sorted.reduce((sum, val) => sum + val, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      count,
      p95: sorted[Math.floor(count * 0.95)],
    };
  }

  /**
   * 모든 성능 통계 조회
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key] of this.metrics) {
      stats[key] = this.getStats(key);
    }

    return stats;
  }

  /**
   * 성능 경고 체크
   */
  checkPerformanceWarnings(): string[] {
    const warnings: string[] = [];
    
    for (const [key, measurements] of this.metrics) {
      if (measurements.length < 5) continue;
      
      const recent = measurements.slice(-5);
      const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      
      // 스토어 액션이 100ms를 초과하면 경고
      if (key.includes('Store') && average > 100) {
        warnings.push(`${key}: 평균 ${average.toFixed(2)}ms (임계값: 100ms)`);
      }
      
      // 렌더링이 16ms를 초과하면 경고 (60fps 기준)
      if (key.includes('Render') && average > 16) {
        warnings.push(`${key}: 평균 ${average.toFixed(2)}ms (임계값: 16ms)`);
      }
    }

    return warnings;
  }
}

/**
 * 성능 모니터 인스턴스
 */
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * 성능 측정 데코레이터
 */
export function measurePerformance(key: string) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value;
    
    descriptor.value = (function(this: any, ...args: any[]) {
      const measureKey = `${target.constructor.name}.${propertyName}`;
      performanceMonitor.startMeasure(measureKey);
      
      const result = method?.apply(this, args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.endMeasure(measureKey);
        });
      } else {
        performanceMonitor.endMeasure(measureKey);
        return result;
      }
    }) as any;

    return descriptor;
  };
}

/**
 * 배치 업데이트 관리자
 */
class BatchUpdateManager {
  private static instance: BatchUpdateManager;
  private pendingUpdates: Map<string, (() => void)[]> = new Map();
  private scheduledFlush: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): BatchUpdateManager {
    if (!BatchUpdateManager.instance) {
      BatchUpdateManager.instance = new BatchUpdateManager();
    }
    return BatchUpdateManager.instance;
  }

  /**
   * 업데이트를 배치에 추가
   */
  addUpdate(batchKey: string, update: () => void, delay = 16): void {
    if (!this.pendingUpdates.has(batchKey)) {
      this.pendingUpdates.set(batchKey, []);
    }

    this.pendingUpdates.get(batchKey)!.push(update);

    // 이미 스케줄된 플러시가 있으면 취소하고 새로 스케줄
    const existingTimer = this.scheduledFlush.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.flushUpdates(batchKey);
    }, delay);

    this.scheduledFlush.set(batchKey, timer);
  }

  /**
   * 배치 업데이트 실행
   */
  private flushUpdates(batchKey: string): void {
    const updates = this.pendingUpdates.get(batchKey);
    if (!updates || updates.length === 0) return;

    performanceMonitor.startMeasure(`BatchUpdate.${batchKey}`);

    // 모든 업데이트를 한 번에 실행
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.error(`배치 업데이트 오류 (${batchKey}):`, error);
      }
    });

    performanceMonitor.endMeasure(`BatchUpdate.${batchKey}`);

    // 정리
    this.pendingUpdates.delete(batchKey);
    this.scheduledFlush.delete(batchKey);
  }

  /**
   * 즉시 모든 배치 업데이트 실행
   */
  flushAll(): void {
    for (const batchKey of this.pendingUpdates.keys()) {
      this.flushUpdates(batchKey);
    }
  }
}

/**
 * 배치 업데이트 관리자 인스턴스
 */
export const batchUpdateManager = BatchUpdateManager.getInstance();

/**
 * 메모이제이션 헬퍼
 */
export class MemoizationHelper {
  private cache: Map<string, { value: any; timestamp: number; maxAge: number }> = new Map();

  /**
   * 값 메모이제이션
   */
  memoize<T>(
    key: string,
    factory: () => T,
    options: {
      maxAge?: number; // 밀리초
      deps?: any[];    // 의존성 배열
    } = {}
  ): T {
    const { maxAge = 5000, deps = [] } = options;
    const depKey = `${key}_${JSON.stringify(deps)}`;
    
    const cached = this.cache.get(depKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < cached.maxAge) {
      return cached.value;
    }

    const value = factory();
    this.cache.set(depKey, {
      value,
      timestamp: now,
      maxAge,
    });

    return value;
  }

  /**
   * 캐시 무효화
   */
  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(keyPattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp >= cached.maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 메모이제이션 헬퍼 인스턴스
 */
export const memoHelper = new MemoizationHelper();

/**
 * React 훅: 디바운스된 값
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * React 훅: 스로틀된 콜백
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const throttledFn = useMemo(
    () => throttle(callback, delay),
    [callback, delay, ...deps]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      throttledFn.cancel();
    };
  }, [throttledFn]);

  return throttledFn as T;
}

/**
 * React 훅: 디바운스된 콜백
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const debouncedFn = useMemo(
    () => debounce(callback, delay),
    [callback, delay, ...deps]
  );

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn as T;
}

/**
 * React 훅: 성능 측정
 */
export function usePerformanceMeasure(key: string, enabled = true) {
  const measureKey = useRef<string>('');

  const start = useCallback(() => {
    if (!enabled) return;
    measureKey.current = `${key}_${Date.now()}`;
    performanceMonitor.startMeasure(measureKey.current);
  }, [key, enabled]);

  const end = useCallback(() => {
    if (!enabled || !measureKey.current) return;
    const duration = performanceMonitor.endMeasure(measureKey.current);
    measureKey.current = '';
    return duration;
  }, [enabled]);

  return { start, end };
}

/**
 * React 훅: 배치 업데이트
 */
export function useBatchUpdate(batchKey: string) {
  const pendingUpdates = useRef<(() => void)[]>([]);

  const addUpdate = useCallback((update: () => void) => {
    pendingUpdates.current.push(update);
    
    batchUpdateManager.addUpdate(batchKey, () => {
      const updates = [...pendingUpdates.current];
      pendingUpdates.current = [];
      
      updates.forEach(update => update());
    });
  }, [batchKey]);

  return { addUpdate };
}

/**
 * 가상화를 위한 아이템 계산 헬퍼
 */
export function calculateVirtualItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  overscan = 3
): {
  virtualItems: Array<{
    index: number;
    start: number;
    end: number;
    item: T;
  }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
} {
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
      end: (i + 1) * itemHeight,
      item: items[i],
    });
  }

  return {
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
  };
}

/**
 * 성능 관련 상수
 */
export const PERFORMANCE_CONSTANTS = {
  // 디바운스/스로틀 지연 시간
  SEARCH_DEBOUNCE: 300,
  SCROLL_THROTTLE: 16,
  RESIZE_THROTTLE: 100,
  SAVE_DEBOUNCE: 1000,

  // 가상화 설정
  VIRTUAL_ITEM_HEIGHT: 50,
  VIRTUAL_OVERSCAN: 5,

  // 배치 업데이트 설정
  BATCH_UPDATE_DELAY: 16,
  
  // 메모이제이션 TTL
  MEMO_SHORT_TTL: 1000,   // 1초
  MEMO_MEDIUM_TTL: 5000,  // 5초
  MEMO_LONG_TTL: 30000,   // 30초

  // 성능 임계값
  SLOW_ACTION_THRESHOLD: 100,   // 100ms
  SLOW_RENDER_THRESHOLD: 16,    // 16ms (60fps)
} as const;

/**
 * 개발 환경에서 성능 모니터링 시작
 */
export function startPerformanceMonitoring(): void {
  if (process.env.NODE_ENV !== 'development') return;

  // 정기적으로 성능 경고 체크
  setInterval(() => {
    const warnings = performanceMonitor.checkPerformanceWarnings();
    if (warnings.length > 0) {
      console.warn('성능 경고:', warnings);
    }
  }, 10000); // 10초마다

  // 정기적으로 메모이제이션 캐시 정리
  setInterval(() => {
    memoHelper.cleanup();
  }, 30000); // 30초마다

  console.log('성능 모니터링이 시작되었습니다.');
}