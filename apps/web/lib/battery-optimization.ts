/**
 * 배터리 효율성 최적화를 위한 유틸리티 함수들
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Page Visibility API를 활용한 백그라운드 감지
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleFocus = () => setIsActive(true);
    const handleBlur = () => setIsActive(false);

    // Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Window focus/blur for additional detection
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // 초기 상태 설정
    setIsVisible(!document.hidden);
    setIsActive(document.hasFocus());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    isVisible,
    isActive,
    isBackground: !isVisible || !isActive
  };
}

/**
 * 배터리 절약 모드에 따른 업데이트 간격 조정
 */
export function useAdaptiveInterval(
  callback: () => void,
  baseInterval: number,
  isBackground: boolean,
  batterySaveMode: boolean = false
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // 콜백 참조 업데이트
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 배경/배터리 절약 모드에 따른 간격 조정
    let interval = baseInterval;
    
    if (isBackground) {
      interval = Math.max(baseInterval * 5, 30000); // 최소 30초
    } else if (batterySaveMode) {
      interval = baseInterval * 2;
    }

    intervalRef.current = setInterval(() => {
      callbackRef.current();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [baseInterval, isBackground, batterySaveMode]);
}

/**
 * 네트워크 요청 디바운싱 - 배터리 절약
 */
export function useNetworkOptimizedDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
  isBackground: boolean = false
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 백그라운드에서는 더 긴 딜레이 적용
    const effectiveDelay = isBackground ? delay * 3 : delay;

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, effectiveDelay);
  }, [delay, isBackground]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * RequestAnimationFrame 기반 애니메이션 최적화
 */
export function useAnimationFrame(
  callback: (deltaTime: number) => void,
  isActive: boolean = true
) {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = time - previousTimeRef.current;
      callbackRef.current(deltaTime);
    }
    previousTimeRef.current = time;
    
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isActive, animate]);
}

/**
 * 리소스 사용량 기반 성능 조절
 */
export function useResourceMonitor() {
  const [resourceInfo, setResourceInfo] = useState({
    memory: 0,
    battery: 1,
    isCharging: true,
    shouldReducePerformance: false
  });

  useEffect(() => {
    const updateResourceInfo = () => {
      let memory = 0;
      let battery = 1;
      let isCharging = true;

      // 메모리 정보 수집
      if ('memory' in performance && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        memory = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      }

      // 배터리 정보 수집
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((batteryInfo: any) => {
          battery = batteryInfo.level;
          isCharging = batteryInfo.charging;
          
          const shouldReducePerformance = 
            !isCharging && battery < 0.2 || // 20% 미만 + 충전 중 아님
            memory > 150; // 메모리 150MB 초과

          setResourceInfo({
            memory,
            battery,
            isCharging,
            shouldReducePerformance
          });
        });
      } else {
        const shouldReducePerformance = memory > 150;
        
        setResourceInfo({
          memory,
          battery,
          isCharging,
          shouldReducePerformance
        });
      }
    };

    updateResourceInfo();
    const interval = setInterval(updateResourceInfo, 10000); // 10초마다 체크

    return () => clearInterval(interval);
  }, []);

  return resourceInfo;
}

/**
 * CPU 집약적 작업을 위한 워커 스레드 활용
 */
export function useWebWorker<T, R>(
  workerFunction: (data: T) => R,
  shouldUseWorker: boolean = true
): (data: T) => Promise<R> {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!shouldUseWorker || !window.Worker) return;

    // Worker 스크립트 생성
    const workerScript = `
      self.onmessage = function(e) {
        const result = (${workerFunction.toString()})(e.data);
        self.postMessage(result);
      };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [workerFunction, shouldUseWorker]);

  return useCallback((data: T): Promise<R> => {
    if (!shouldUseWorker || !workerRef.current) {
      // Worker 없이 메인 스레드에서 실행
      return Promise.resolve(workerFunction(data));
    }

    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not available'));
        return;
      }

      const handleMessage = (e: MessageEvent) => {
        workerRef.current?.removeEventListener('message', handleMessage);
        resolve(e.data);
      };

      const handleError = (error: ErrorEvent) => {
        workerRef.current?.removeEventListener('error', handleError);
        reject(error);
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.addEventListener('error', handleError);
      workerRef.current.postMessage(data);
    });
  }, [workerFunction, shouldUseWorker]);
}

/**
 * 화면 밝기와 어두움 감지 (다크모드 + 배터리 절약)
 */
export function useScreenBrightness() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateDarkMode = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    const updateReducedMotion = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    // 초기 상태 설정
    setIsDarkMode(darkModeQuery.matches);
    setPrefersReducedMotion(reducedMotionQuery.matches);

    // 리스너 등록
    darkModeQuery.addEventListener('change', updateDarkMode);
    reducedMotionQuery.addEventListener('change', updateReducedMotion);

    return () => {
      darkModeQuery.removeEventListener('change', updateDarkMode);
      reducedMotionQuery.removeEventListener('change', updateReducedMotion);
    };
  }, []);

  return {
    isDarkMode,
    prefersReducedMotion,
    shouldUseMinimalAnimations: prefersReducedMotion
  };
}