/**
 * 메모리 효율적인 상태 관리를 위한 유틸리티 함수들
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { StoreApi, UseBoundStore } from 'zustand';

/**
 * 메모리 사용량 모니터링 타입
 */
interface MemoryMonitor {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  timestamp: number;
}

/**
 * 선택적 구독을 위한 훅
 * 특정 상태만 구독하여 불필요한 리렌더링을 방지
 */
export function useSelectiveSubscription<T, U>(
  store: UseBoundStore<StoreApi<T>>,
  selector: (state: T) => U,
  equalityFn?: (a: U, b: U) => boolean
): U {
  // @ts-ignore - Zustand store selector 타입 불일치
  return store(selector, equalityFn);
}

/**
 * 메모리 누수 방지를 위한 이벤트 리스너 자동 해제 훅
 */
export function useEventListener<T extends keyof WindowEventMap>(
  eventType: T,
  handler: (event: WindowEventMap[T]) => void,
  element: Element | Window | null = window,
  options?: boolean | AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element?.addEventListener) return;

    const eventListener = (event: Event) => 
      savedHandler.current(event as WindowEventMap[T]);

    element.addEventListener(eventType, eventListener, options);

    return () => {
      element.removeEventListener(eventType, eventListener, options);
    };
  }, [eventType, element, options]);
}

/**
 * 지능적 디바운싱 - 네트워크 상태에 따라 딜레이 조정
 */
export function useAdaptiveDebounce<T extends (...args: any[]) => any>(
  callback: T,
  baseDelay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout>(null);
  
  const getAdaptiveDelay = useCallback(() => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (!connection) return baseDelay;
    
    const effectiveType = connection.effectiveType as string;
    const multiplierMap: Record<string, number> = {
      'slow-2g': 3,
      '2g': 2.5,
      '3g': 1.5,
      '4g': 1
    };
    const multiplier = multiplierMap[effectiveType] || 1;
    
    return baseDelay * multiplier;
  }, [baseDelay]);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, getAdaptiveDelay());
  }, [callback, getAdaptiveDelay]) as T;
}

/**
 * 메모리 효율적인 대량 데이터 처리를 위한 청크 분할
 */
export function processInChunks<T, R>(
  items: T[],
  processor: (chunk: T[]) => R[],
  chunkSize: number = 100
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let index = 0;

    const processChunk = () => {
      const chunk = items.slice(index, index + chunkSize);
      if (chunk.length === 0) {
        resolve(results);
        return;
      }

      const chunkResults = processor(chunk);
      results.push(...chunkResults);
      index += chunkSize;

      // 다음 청크를 비동기로 처리하여 메인 스레드 블로킹 방지
      setTimeout(processChunk, 0);
    };

    processChunk();
  });
}

/**
 * 가상 스크롤링을 위한 윈도우 계산 훅
 */
export function useVirtualWindow(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const totalHeight = totalItems * itemHeight;
    
    return {
      visibleItems,
      totalHeight,
      overscan,
      getVisibleRange: (scrollTop: number) => {
        const start = Math.floor(scrollTop / itemHeight);
        const end = Math.min(start + visibleItems + overscan, totalItems);
        const adjustedStart = Math.max(0, start - overscan);
        
        return {
          start: adjustedStart,
          end,
          offsetY: adjustedStart * itemHeight
        };
      }
    };
  }, [totalItems, itemHeight, containerHeight, overscan]);
}

/**
 * 메모리 사용량 모니터링 (개발 환경에서만)
 */
export function useMemoryMonitor(interval: number = 5000) {
  const memoryRef = useRef<MemoryMonitor[]>([]);

  // 메모리 모니터링 임시 비활성화
  useEffect(() => {
    // if (process.env.NODE_ENV !== 'development') return;
    
    // const monitor = () => {
    //   if ('memory' in performance && (performance as any).memory) {
    //     const memory = (performance as any).memory;
    //     const snapshot: MemoryMonitor = {
    //       heapUsed: memory.usedJSHeapSize,
    //       heapTotal: memory.totalJSHeapSize,
    //       rss: memory.jsHeapSizeLimit,
    //       external: 0,
    //       timestamp: Date.now()
    //     };
    //     
    //     memoryRef.current.push(snapshot);
    //     
    //     // 최근 100개만 유지하여 메모리 누수 방지
    //     if (memoryRef.current.length > 100) {
    //       memoryRef.current = memoryRef.current.slice(-50);
    //     }
    //     
    //     // 메모리 사용량이 임계치를 넘으면 경고 (임시 사용중지)
    //     const memoryUsageMB = snapshot.heapUsed / 1024 / 1024;
    //     // if (memoryUsageMB > 150) {
    //     //   console.warn(
    //     //     `[Memory Monitor] High memory usage detected: ${memoryUsageMB.toFixed(2)}MB`
    //     //   );
    //     // }
    //   }
    // };

    // const intervalId = setInterval(monitor, interval);
    // monitor(); // 즉시 실행

    // return () => clearInterval(intervalId);
  }, [interval]);

  return {
    getMemorySnapshots: () => [...memoryRef.current],
    getCurrentMemoryUsage: () => {
      const latest = memoryRef.current[memoryRef.current.length - 1];
      return latest ? latest.heapUsed / 1024 / 1024 : 0;
    }
  };
}

/**
 * 스토어 상태 정리를 위한 cleanup 훅
 */
export function useStoreCleanup<T>(
  store: UseBoundStore<StoreApi<T>>,
  resetFn?: (state: T) => Partial<T>
) {
  useEffect(() => {
    return () => {
      if (resetFn) {
        store.setState(resetFn as any);
      }
    };
  }, [store, resetFn]);
}

/**
 * 지능적 캐시 관리 - LRU 기반
 */
export class IntelligentCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number; accessCount: number }>();
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize: number = 100, maxAge: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  set(key: K, value: V): void {
    const now = Date.now();
    
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1
    });
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    const now = Date.now();
    
    // 만료된 항목 제거
    if (now - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    // 접근 카운트 증가
    item.accessCount++;
    item.timestamp = now;
    
    return item.value;
  }

  private evictLRU(): void {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;
    let lowestAccess = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < lowestAccess || 
          (item.accessCount === lowestAccess && item.timestamp < oldestTime)) {
        oldestKey = key;
        oldestTime = item.timestamp;
        lowestAccess = item.accessCount;
      }
    }
    
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * 배터리 상태에 따른 성능 조절
 */
export function useBatteryOptimization() {
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [isCharging, setIsCharging] = useState(true);

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(battery.level);
        setIsCharging(battery.charging);

        const updateBattery = () => {
          setBatteryLevel(battery.level);
          setIsCharging(battery.charging);
        };

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  const shouldReducePerformance = useMemo(() => {
    return !isCharging && batteryLevel < 0.2; // 20% 미만 및 충전 중이 아닐 때
  }, [batteryLevel, isCharging]);

  return {
    batteryLevel,
    isCharging,
    shouldReducePerformance,
    getOptimalUpdateInterval: () => shouldReducePerformance ? 1000 : 300,
    getOptimalAnimationFrames: () => shouldReducePerformance ? 30 : 60
  };
}