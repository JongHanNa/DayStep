/**
 * Framer Motion 스크롤 애니메이션 유틸리티
 *
 * Structured 스타일의 화려한 애니메이션 효과 제공
 * - Framer Motion 기반 (Next.js 15 + React 19 완벽 호환)
 * - 선언적 API로 React와 완벽한 통합
 * - SSR/Hydration 문제 없음
 */

/**
 * Reduced Motion 설정 확인
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * 모바일 기기 확인
 * 터치 기능과 화면 크기를 모두 체크하여 더 정확한 모바일 감지
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 터치 기기 여부 우선 체크
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 화면 크기 체크
  const isSmallScreen = window.matchMedia('(max-width: 768px)').matches;

  // 터치 기능과 작은 화면을 모두 가진 경우만 모바일로 판정
  return isTouchDevice && isSmallScreen;
};

/**
 * Framer Motion variants for fade in + slide up animation
 *
 * @param distance - 슬라이드 거리 (px)
 * @returns Framer Motion variants object
 */
export const fadeInUpVariants = (distance = 60) => ({
  hidden: {
    opacity: 0,
    y: distance,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.2,
      ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number], // Custom cubic-bezier easing
    },
  },
});

/**
 * Framer Motion variants for stagger fade in + slide up animation
 *
 * @param distance - 슬라이드 거리 (px)
 * @param stagger - 각 아이템 간 딜레이 (초)
 * @returns Framer Motion variants object
 */
export const staggerFadeInUpVariants = (distance = 60, stagger = 0.15) => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
    },
  },
  item: {
    hidden: {
      opacity: 0,
      y: distance,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 1,
        ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
      },
    },
  },
});

/**
 * Framer Motion variants for scale fade in animation
 *
 * @param scaleStart - 시작 scale 값
 * @returns Framer Motion variants object
 */
export const scaleFadeInVariants = (scaleStart = 0.85) => ({
  hidden: {
    opacity: 0,
    scale: scaleStart,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 1.2,
      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number], // Elastic easing
    },
  },
});

/**
 * 숫자 카운트업 애니메이션용 커스텀 훅
 * useMotionValue와 useTransform을 사용하여 구현
 */
export const getCountUpProps = (endValue: number, decimals = 0, suffix = '') => {
  return {
    initial: { value: 0 },
    whileInView: { value: endValue },
    viewport: { once: true, amount: 0.5 },
    transition: {
      duration: 2,
      ease: 'easeOut',
    },
  };
};

/**
 * 타이핑 애니메이션 variants
 *
 * @param speed - 타이핑 속도 (문자당 ms)
 * @param delay - 시작 딜레이 (초)
 * @returns Framer Motion variants object
 */
export const typeWriterVariants = (speed = 0.05, delay = 0.5) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay,
      duration: 0.1,
    },
  },
  char: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: speed,
      },
    },
  },
});

/**
 * Viewport options for scroll-triggered animations
 *
 * @param once - 한 번만 트리거할지 여부 (false면 양방향 애니메이션)
 * @param amount - 요소가 얼마나 보여야 트리거될지 (0-1)
 * @returns Framer Motion viewport object
 */
export const getViewportOptions = (once = true, amount: number | 'some' | 'all' = 0.3) => ({
  once,
  amount,
  margin: '0px 0px -100px 0px', // 요소가 뷰포트에 진입하기 전에 트리거
});

/**
 * 양방향 스크롤 애니메이션용 Viewport 옵션
 * 스크롤 업/다운 시 모두 애니메이션 트리거
 *
 * @param amount - 요소가 얼마나 보여야 트리거될지 (0-1)
 * @returns Framer Motion viewport object
 */
export const getBidirectionalViewportOptions = (amount: number | 'some' | 'all' = 0.3) => ({
  once: false, // 양방향 애니메이션을 위해 반복 트리거
  amount,
  margin: '0px 0px -100px 0px',
});
