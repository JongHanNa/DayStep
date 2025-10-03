import { useRef, useEffect, useCallback } from 'react';
import { useSpring } from '@react-spring/web';

interface UseElasticScrollOptions {
  /**
   * 탄성 바운스의 최대 거리 (픽셀)
   * @default 60
   */
  bounceDistance?: number;
  
  /**
   * 탄성 효과의 강도 (0-1)
   * @default 0.3
   */
  bounceStrength?: number;
  
  /**
   * 바운스 애니메이션 지속 시간 (ms)
   * @default 400
   */
  bounceDuration?: number;
  
  /**
   * 데스크탑에서만 활성화할지 여부
   * @default true
   */
  desktopOnly?: boolean;
  
  /**
   * 활성화 상태 (모달이 열렸을 때만 이벤트 리스너 등록)
   * @default true
   */
  enabled?: boolean;
}

/**
 * 데스크탑 브라우저에서 모바일과 같은 스크롤 탄성 바운스 효과를 구현하는 훅
 * react-spring을 사용하여 부드러운 물리 기반 애니메이션 제공
 */
export function useElasticScroll(options: UseElasticScrollOptions = {}) {
  const {
    bounceDistance = 60,
    bounceStrength = 0.3,
    desktopOnly = true,
    enabled = true
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const scrollY = useRef(0);

  // react-spring을 사용한 탄성 애니메이션
  const [springs, api] = useSpring(() => ({
    y: 0,
    config: {
      mass: 1,
      friction: 26,
      tension: 170,
      velocity: 0
    }
  }));

  // 디바이스 감지
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || 'ontouchstart' in window;
  }, []);

  // 스크롤 바운스 효과 적용
  const applyBounce = useCallback((distance: number) => {
    if (!containerRef.current) return;
    
    const bounceAmount = Math.min(Math.abs(distance) * bounceStrength, bounceDistance);
    // 바운스 방향을 반대로: 위로 스크롤(distance < 0) → 아래로 바운스(+)
    // 아래로 스크롤(distance > 0) → 위로 바운스(-)
    const direction = distance > 0 ? -1 : 1;
    
    // Spring 설정:
    // mass: 무게감 (1=기본, 낮을수록 빠른 애니메이션)
    // friction: 저항력 (높을수록 빨리 멈춤)
    // tension: 장력 (높을수록 빠른 복귀)
    // 바운스 효과 시작
    api.start({
      y: bounceAmount * direction,
      immediate: false,
      config: {
        mass: 2,
        friction: 25,
        tension: 180
      },
      onRest: () => {
        // 바운스 후 원래 위치로 복귀
        api.start({
          y: 0,
          config: {
            mass: 1.5,
            friction: 30,
            tension: 200
          }
        });
      }
    });
  }, [api, bounceStrength, bounceDistance]);

  // 시간 선택기 영역 체크 함수
  const isTimePickerArea = useCallback((target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    return target.closest('.time-picker-wrapper') !== null;
  }, []);

  // 휠 이벤트 핸들러 (데스크탑)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current || (desktopOnly && isMobile())) return;

    // 시간 선택기 영역에서는 탄성 스크롤 비활성화
    if (isTimePickerArea(e.target)) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const deltaY = e.deltaY;


    // 스크롤이 맨 위나 맨 아래에 도달했을 때 바운스 효과
    if (
      (scrollTop <= 0 && deltaY < 0) || // 맨 위에서 위로 스크롤 (deltaY < 0)
      (scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0) // 맨 아래에서 아래로 스크롤 (deltaY > 0)
    ) {
      e.preventDefault();
      applyBounce(deltaY);
    }
  }, [applyBounce, desktopOnly, isMobile, isTimePickerArea]);

  // 터치 이벤트 핸들러 (모바일 지원)
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (desktopOnly && !isMobile()) return;

    // 시간 선택기 영역에서는 탄성 스크롤 비활성화
    if (isTimePickerArea(e.target)) return;

    isDragging.current = true;
    startY.current = e.touches[0].clientY;
    scrollY.current = containerRef.current?.scrollTop || 0;
  }, [desktopOnly, isMobile, isTimePickerArea]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    // 시간 선택기 영역에서는 탄성 스크롤 비활성화
    if (isTimePickerArea(e.target)) return;

    const currentY = e.touches[0].clientY;
    const deltaY = startY.current - currentY;
    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // 스크롤 경계에서 탄성 효과
    if (
      (scrollTop === 0 && deltaY < 0) ||
      (scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0)
    ) {
      e.preventDefault();
      applyBounce(deltaY);
    }
  }, [applyBounce, isTimePickerArea]);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  // 이벤트 리스너 등록 - enabled가 true이고 컨테이너가 준비된 후에만
  useEffect(() => {
    // enabled가 false면 리스너 등록하지 않음
    if (!enabled) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isRegistered = false;

    const registerListeners = () => {
      // 이미 등록되었거나 정리 중이면 중단
      if (isRegistered) return;
      
      const container = containerRef.current;
      if (!container) {
        // 컨테이너가 아직 준비되지 않았으면 잠시 후 재시도
        timeoutId = setTimeout(registerListeners, 100);
        return;
      }

      // 휠 이벤트 (데스크탑) - passive: false가 중요!
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      // 터치 이벤트 (모바일 지원)
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });

      isRegistered = true;
    };

    registerListeners();

    // 정리 함수
    return () => {
      // setTimeout 정리
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      // 이벤트 리스너 정리
      const container = containerRef.current;
      if (container && isRegistered) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      }
      
      isRegistered = false;
    };
  }, [enabled, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    springs,
    /**
     * 수동으로 바운스 효과 트리거
     */
    triggerBounce: (distance: number) => applyBounce(distance),
    /**
     * 현재 애니메이션 상태 리셋
     */
    resetBounce: () => api.start({ y: 0, immediate: true }),
    /**
     * 테스트용 즉시 바운스
     */
    testBounce: () => {
      api.start({
        y: 50,
        config: { mass: 1, friction: 26, tension: 170 },
        onRest: () => {
          api.start({ y: 0, config: { mass: 1, friction: 26, tension: 170 } });
        }
      });
    }
  };
}