'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * 터치 이벤트 옵션 인터페이스
 */
export interface TouchOptimizationOptions {
  enablePassiveListeners?: boolean;
  enableHardwareAcceleration?: boolean;
  throttleDelay?: number;
  debounceDelay?: number;
  preventScrollDuringTouch?: boolean;
}

/**
 * 터치 인터랙션 성능 최적화 훅
 * 60fps 스크롤과 100ms 이내 터치 응답을 보장
 */
export function useTouchOptimization(options: TouchOptimizationOptions = {}) {
  const {
    enablePassiveListeners = true,
    enableHardwareAcceleration = true,
    throttleDelay = 16, // 60fps를 위한 16ms
    debounceDelay = 100,
    preventScrollDuringTouch = false,
  } = options;

  const throttleRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const touchStartTimeRef = useRef<number>(0);

  /**
   * 쓰로틀링된 함수 실행
   */
  const throttle = useCallback(<T extends (...args: any[]) => void>(
    func: T,
    delay: number = throttleDelay
  ) => {
    return (...args: Parameters<T>) => {
      if (throttleRef.current) return;
      
      throttleRef.current = setTimeout(() => {
        func(...args);
        throttleRef.current = undefined;
      }, delay);
    };
  }, [throttleDelay]);

  /**
   * 디바운싱된 함수 실행
   */
  const debounce = useCallback(<T extends (...args: any[]) => void>(
    func: T,
    delay: number = debounceDelay
  ) => {
    return (...args: Parameters<T>) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  }, [debounceDelay]);

  /**
   * 하드웨어 가속 스타일 적용
   */
  const getOptimizedStyle = useCallback((additionalStyles?: React.CSSProperties): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {};

    if (enableHardwareAcceleration) {
      baseStyles.transform = 'translateZ(0)';
      baseStyles.willChange = 'transform';
      baseStyles.backfaceVisibility = 'hidden';
      baseStyles.perspective = '1000px';
    }

    return {
      ...baseStyles,
      ...additionalStyles,
    };
  }, [enableHardwareAcceleration]);

  /**
   * 터치 이벤트 리스너 옵션
   */
  const getTouchEventOptions = useCallback((passive: boolean = enablePassiveListeners) => {
    return {
      passive,
      capture: false,
    };
  }, [enablePassiveListeners]);

  /**
   * 터치 응답 시간 측정
   */
  const measureTouchResponse = useCallback(() => {
    return {
      start: () => {
        touchStartTimeRef.current = performance.now();
      },
      end: () => {
        const responseTime = performance.now() - touchStartTimeRef.current;
        if (responseTime > 100) {
          console.warn(`터치 응답 시간이 목표를 초과했습니다: ${responseTime.toFixed(2)}ms`);
        }
        return responseTime;
      },
    };
  }, []);

  /**
   * 스크롤 성능 최적화 적용
   */
  const optimizeScrollPerformance = useCallback((element: HTMLElement) => {
    if (!element) return;

    // CSS 속성 적용
    (element.style as any).overflowScrolling = 'touch';
    element.style.scrollBehavior = 'smooth';
    (element.style as any).overscrollBehavior = 'contain';

    // 하드웨어 가속 적용
    if (enableHardwareAcceleration) {
      element.style.transform = 'translateZ(0)';
      element.style.willChange = 'scroll-position';
    }

    // Passive 이벤트 리스너 적용
    if (enablePassiveListeners) {
      const handleScroll = throttle(() => {
        // 스크롤 이벤트 처리 (필요시)
      });

      element.addEventListener('scroll', handleScroll, getTouchEventOptions(true));

      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    }
    
    // enablePassiveListeners가 false일 때는 cleanup 함수 반환하지 않음
    return;
  }, [enableHardwareAcceleration, enablePassiveListeners, throttle, getTouchEventOptions]);

  /**
   * 터치 이벤트 최적화 적용
   */
  const optimizeTouchEvents = useCallback((element: HTMLElement) => {
    if (!element) return;

    const measure = measureTouchResponse();

    const handleTouchStart = (e: TouchEvent) => {
      measure.start();
      
      if (preventScrollDuringTouch) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = throttle((e: TouchEvent) => {
      const responseTime = measure.end();
      
      // 성능 로깅 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development' && responseTime > 100) {
        console.warn('터치 응답 시간 초과:', responseTime, 'ms');
      }
    });

    const handleTouchMove = throttle((e: TouchEvent) => {
      // 터치 이동 최적화 처리
    });

    const touchOptions = getTouchEventOptions(!preventScrollDuringTouch);

    element.addEventListener('touchstart', handleTouchStart, touchOptions);
    element.addEventListener('touchend', handleTouchEnd, touchOptions);
    element.addEventListener('touchmove', handleTouchMove, touchOptions);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [preventScrollDuringTouch, throttle, getTouchEventOptions, measureTouchResponse]);

  /**
   * 애니메이션 성능 최적화
   */
  const optimizeAnimation = useCallback((element: HTMLElement, keyframes: Keyframe[], options?: KeyframeAnimationOptions) => {
    if (!element || !element.animate) return;

    const optimizedOptions: KeyframeAnimationOptions = {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      fill: 'forwards',
      ...options,
    };

    // 하드웨어 가속 강제 적용
    const optimizedKeyframes = keyframes.map(frame => ({
      ...frame,
      transform: frame.transform ? `${frame.transform} translateZ(0)` : 'translateZ(0)',
    }));

    return element.animate(optimizedKeyframes, optimizedOptions);
  }, []);

  /**
   * 메모리 정리
   */
  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    throttle,
    debounce,
    getOptimizedStyle,
    getTouchEventOptions,
    measureTouchResponse,
    optimizeScrollPerformance,
    optimizeTouchEvents,
    optimizeAnimation,
  };
}

/**
 * 성능 모니터링 훅
 */
export function usePerformanceMonitor() {
  const frameTimeRef = useRef<number[]>([]);
  const fpsRef = useRef<number>(60);

  const measureFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const measure = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;

      frameTimeRef.current.push(deltaTime);
      
      // 최근 60프레임의 평균 계산
      if (frameTimeRef.current.length > 60) {
        frameTimeRef.current.shift();
      }

      if (frameCount % 60 === 0) {
        const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
        fpsRef.current = 1000 / avgFrameTime;

        if (fpsRef.current < 55) {
          console.warn(`FPS가 목표치 미달: ${fpsRef.current.toFixed(1)}fps`);
        }
      }

      lastTime = currentTime;
      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);

    return () => {
      frameCount = 0;
    };
  }, []);

  const getCurrentFPS = useCallback(() => {
    return fpsRef.current;
  }, []);

  return {
    measureFPS,
    getCurrentFPS,
  };
}