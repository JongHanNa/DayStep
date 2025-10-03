/**
 * 성능 최적화 유틸리티
 * React 컴포넌트와 비즈니스 로직의 성능을 향상시키는 도구들
 */

import { useCallback, useRef, useState, useEffect, DependencyList } from 'react';
import { logger } from './logger';

/**
 * 디바운스 함수
 * 연속된 호출을 지연시켜 마지막 호출만 실행
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, wait);
  };
}

/**
 * 스로틀 함수
 * 일정 시간 간격으로만 함수를 실행
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 디바운스된 콜백 훅
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList
): (...args: Parameters<T>) => void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, [...deps]);
  return useCallback(
    debounce(memoizedCallback, delay),
    [memoizedCallback, delay]
  );
}

/**
 * 스로틀된 콜백 훅
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: DependencyList
): (...args: Parameters<T>) => void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, [...deps]);
  return useCallback(
    throttle(memoizedCallback, limit),
    [memoizedCallback, limit]
  );
}

/**
 * 성능 측정 래퍼
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    logger.time(label);
    const result = func.apply(null, args);
    logger.timeEnd(label);
    return result;
  }) as T;
}

/**
 * 비동기 성능 측정 래퍼
 */
export function measureAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
  func: T,
  label: string
): T {
  return (async (...args: Parameters<T>) => {
    logger.time(label);
    try {
      const result = await func.apply(null, args);
      logger.timeEnd(label);
      return result;
    } catch (error) {
      logger.timeEnd(label);
      throw error;
    }
  }) as T;
}

/**
 * 메모이제이션된 값을 관리하는 훅 (의존성이 깊은 비교에 유용)
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<{ deps: DependencyList; value: T }>({ deps: [], value: factory() });

  if (!shallowEqual(ref.current.deps, Array.from(deps))) {
    ref.current = {
      deps,
      value: factory(),
    };
  }

  return ref.current.value;
}

/**
 * 얕은 비교 함수
 */
function shallowEqual(a: readonly any[], b: readonly any[]): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * 배치 작업을 위한 유틸리티
 * 대량의 작업을 작은 청크로 나누어 처리
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R> | R,
  batchSize: number = 10,
  delayBetweenBatches: number = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    // 배치 간 지연 (메인 스레드 블로킹 방지)
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
}

/**
 * requestAnimationFrame을 사용한 스케줄링
 */
export function scheduleWork(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * requestIdleCallback을 사용한 유휴 시간 스케줄링 (지원되는 경우)
 */
export function scheduleIdleWork(callback: () => void): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    // 폴백: setTimeout 사용
    setTimeout(callback, 1);
  }
}

/**
 * 메모리 사용량 모니터링 (개발 환경에서만)
 */
export function logMemoryUsage(label: string): void {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
    const memory = (performance as any).memory;
    logger.performance(`${label} - Memory Usage`, {
      used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`,
    });
  }
}

/**
 * 지연 로딩을 위한 Intersection Observer 훅
 */
export function useLazyLoad(
  threshold: number = 0.1
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible];
}