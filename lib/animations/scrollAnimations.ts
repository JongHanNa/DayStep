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

/**
 * 패럴랙스 효과 variants
 * 스크롤 시 요소가 다른 속도로 움직임
 *
 * @param speed - 패럴랙스 속도 (0.5 = 느림, 2 = 빠름)
 * @returns Framer Motion variants object
 */
export const parallaxVariants = (speed = 0.5) => ({
  initial: {
    y: 0,
  },
  animate: {
    y: [0, -100 * speed, 0],
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear',
    },
  },
});

/**
 * 텍스트 단어 단위 reveal 애니메이션
 * Structured.app 스타일의 단어별 나타나기 효과
 *
 * @param stagger - 각 단어 간 딜레이 (초)
 * @returns Framer Motion variants object
 */
export const textRevealVariants = (stagger = 0.03) => ({
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger,
    },
  },
  word: {
    hidden: {
      opacity: 0,
      y: 20,
      filter: 'blur(4px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.5,
        ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
      },
    },
  },
});

/**
 * 회전하는 텍스트 효과 variants
 * 히어로 섹션의 기능 리스트용
 */
export const rotatingTextVariants = {
  enter: {
    y: 20,
    opacity: 0,
    filter: 'blur(4px)',
  },
  center: {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    filter: 'blur(4px)',
    transition: {
      duration: 0.3,
      ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
    },
  },
};

/**
 * 마그네틱 효과 (마우스 추적 버튼/카드)
 * 마우스 위치에 따라 요소가 미묘하게 움직임
 *
 * @param strength - 효과 강도 (0-1)
 * @returns Framer Motion props
 */
export const getMagneticProps = (strength = 0.3) => ({
  whileHover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
    },
  },
  whileTap: {
    scale: 0.95,
  },
});

/**
 * 3D 틸트 효과 variants
 * 카드 hover 시 3D 회전 효과
 */
export const tiltVariants = {
  rest: {
    rotateX: 0,
    rotateY: 0,
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.3,
      ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
    },
  },
};

/**
 * 무한 스크롤 애니메이션 (가로)
 *
 * @param duration - 한 사이클 완료 시간 (초)
 * @param direction - 스크롤 방향 ('left' | 'right')
 * @returns Framer Motion animate props
 */
export const getInfiniteScrollProps = (duration = 20, direction: 'left' | 'right' = 'left') => ({
  animate: {
    x: direction === 'left' ? [0, -1000] : [-1000, 0],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: 'loop' as const,
        duration,
        ease: 'linear' as const,
      },
    },
  },
});

/**
 * 스크롤 진행률 기반 transform 유틸리티
 * useScroll과 useTransform을 함께 사용
 *
 * 사용 예시:
 * ```tsx
 * const { scrollYProgress } = useScroll();
 * const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
 * ```
 */
export const getScrollTransformConfig = (start: number[], end: number[]) => ({
  inputRange: [0, 1],
  outputRange: [start, end],
});

/**
 * 이미지 태그 움직임 효과 (Structured.app 스타일)
 * 스크롤 진행률에 따라 여러 이미지 태그가 모여서 섹션 완성
 *
 * @param index - 태그 인덱스
 * @param total - 전체 태그 수
 * @returns Framer Motion props
 */
export const getImageTagAnimationProps = (index: number, total: number) => {
  const delay = (index / total) * 0.5;
  const angle = (360 / total) * index;

  return {
    initial: {
      opacity: 0,
      x: Math.cos((angle * Math.PI) / 180) * 200,
      y: Math.sin((angle * Math.PI) / 180) * 200,
      rotate: angle,
      scale: 0.5,
    },
    whileInView: {
      opacity: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      transition: {
        duration: 1,
        delay,
        ease: [0.215, 0.61, 0.355, 1] as [number, number, number, number],
      },
    },
    viewport: {
      once: false,
      amount: 0.3,
    },
  };
};
