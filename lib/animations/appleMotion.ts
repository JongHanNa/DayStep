/**
 * Apple 스타일 애니메이션 설정
 *
 * iOS/macOS의 자연스러운 물리 기반 애니메이션을 Framer Motion으로 구현
 * - 부드러운 스프링 물리
 * - 자연스러운 바운스와 오버슈트
 * - 섬세한 이징과 stagger delay
 */

import { Transition, Variants } from 'framer-motion';

// ============================================
// 스프링 설정
// ============================================

export const APPLE_SPRING = {
  /** 기본 스프링 - 대부분의 전환에 사용 */
  default: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 300,
    mass: 0.5,
  },
  /** 빠른 반응 - 선택, 탭 피드백 */
  snappy: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 400,
    mass: 0.3,
  },
  /** 부드러운 전환 - 뷰 전환, 페이지 */
  smooth: {
    type: 'spring' as const,
    damping: 28,
    stiffness: 200,
    mass: 0.8,
  },
  /** 바운시 - 선택 피드백, 즐거운 인터랙션 */
  bouncy: {
    type: 'spring' as const,
    damping: 15,
    stiffness: 400,
    mass: 0.5,
  },
  /** 미묘한 - 작은 UI 변화 */
  subtle: {
    type: 'spring' as const,
    damping: 35,
    stiffness: 500,
    mass: 0.2,
  },
} as const;

// ============================================
// 3D 뷰 전환 애니메이션
// ============================================

export const VIEW_TRANSITION_3D: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? -15 : 15,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
    transition: APPLE_SPRING.smooth,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.9,
    rotateY: direction > 0 ? 15 : -15,
    transition: APPLE_SPRING.smooth,
  }),
};

// ============================================
// 선택 피드백 애니메이션
// ============================================

export const SELECTION_FEEDBACK: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 0 0 0px rgba(147, 51, 234, 0)',
  },
  selected: {
    scale: 1.02,
    boxShadow: '0 0 0 3px rgba(147, 51, 234, 0.3)',
    transition: APPLE_SPRING.bouncy,
  },
  tap: {
    scale: 0.98,
    transition: APPLE_SPRING.snappy,
  },
};

// ============================================
// 체크박스 애니메이션
// ============================================

export const CHECKBOX_VARIANTS: Variants = {
  unchecked: {
    scale: 1,
    backgroundColor: 'transparent',
  },
  checked: {
    scale: 1,
    backgroundColor: 'var(--primary)',
    transition: {
      scale: APPLE_SPRING.bouncy,
      backgroundColor: { duration: 0.15 },
    },
  },
};

// ============================================
// 카드 등장 애니메이션
// ============================================

export const CARD_ENTRANCE: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...APPLE_SPRING.default,
      delay: i * 0.08,
    },
  }),
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: APPLE_SPRING.snappy,
  },
};

// ============================================
// 아코디언 애니메이션
// ============================================

export const ACCORDION_CONTENT: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: APPLE_SPRING.snappy,
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: APPLE_SPRING.smooth,
      opacity: { duration: 0.25, delay: 0.1 },
    },
  },
};

export const ACCORDION_CHEVRON: Variants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180, transition: APPLE_SPRING.snappy },
};

// ============================================
// 스태거 설정
// ============================================

export const STAGGER = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
  verySlow: 0.12,
} as const;

export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: (stagger: number = STAGGER.normal) => ({
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: 0.1,
    },
  }),
};

// ============================================
// 칩/태그 애니메이션
// ============================================

export const CHIP_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: APPLE_SPRING.default,
  },
  selected: {
    scale: 1.05,
    transition: APPLE_SPRING.bouncy,
  },
  tap: {
    scale: 0.95,
    transition: APPLE_SPRING.snappy,
  },
};

// ============================================
// 노드 연결선 애니메이션
// ============================================

export const CONNECTION_LINE: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: (i: number = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 0.8,
        delay: i * 0.15,
        ease: [0.43, 0.13, 0.23, 0.96],
      },
      opacity: { duration: 0.2, delay: i * 0.15 },
    },
  }),
};

// ============================================
// 플로팅 노드 애니메이션 (그래프 프리뷰용)
// ============================================

export const FLOATING_NODE: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      ...APPLE_SPRING.bouncy,
      delay: 0.3 + i * 0.1,
    },
  }),
  hover: {
    scale: 1.1,
    transition: APPLE_SPRING.snappy,
  },
  tap: {
    scale: 0.9,
    transition: APPLE_SPRING.snappy,
  },
};

// ============================================
// 하단 바 애니메이션
// ============================================

export const BOTTOM_BAR: Variants = {
  hidden: {
    y: 100,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: APPLE_SPRING.smooth,
  },
  exit: {
    y: 100,
    opacity: 0,
    transition: APPLE_SPRING.snappy,
  },
};

// ============================================
// 뷰 도트 인디케이터 애니메이션
// ============================================

export const DOT_INDICATOR: Variants = {
  inactive: {
    width: 8,
    opacity: 0.4,
    transition: APPLE_SPRING.snappy,
  },
  active: {
    width: 24,
    opacity: 1,
    transition: APPLE_SPRING.bouncy,
  },
};

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 스와이프 파워 계산 (스와이프 감지용)
 */
export const swipePower = (offset: number, velocity: number): number => {
  return Math.abs(offset) * velocity;
};

/**
 * 스와이프 임계값
 */
export const SWIPE_THRESHOLD = 10000;

/**
 * 스와이프 방향 결정
 */
export const getSwipeDirection = (
  offset: number,
  velocity: number
): 'left' | 'right' | null => {
  const power = swipePower(offset, velocity);

  if (power < SWIPE_THRESHOLD) return null;

  return offset < 0 ? 'left' : 'right';
};

/**
 * 커스텀 트랜지션 생성
 */
export const createTransition = (
  preset: keyof typeof APPLE_SPRING,
  overrides?: Partial<Transition>
): Transition => ({
  ...APPLE_SPRING[preset],
  ...overrides,
});

// ============================================
// 트리 뷰 애니메이션
// ============================================

/** 트리 노드 등장/퇴장 애니메이션 */
export const TREE_NODE_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
    height: 0,
  },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: {
      ...APPLE_SPRING.default,
      height: { duration: 0.3 },
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    height: 0,
    transition: {
      duration: 0.2,
      height: { duration: 0.2 },
    },
  },
};

/** 트리 접기/펼치기 컨테이너 애니메이션 */
export const TREE_COLLAPSE: Variants = {
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: APPLE_SPRING.smooth,
      opacity: { duration: 0.25, delay: 0.05 },
      staggerChildren: STAGGER.fast,
      delayChildren: 0.05,
    },
  },
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.25 },
      opacity: { duration: 0.15 },
    },
  },
};

/** 트리 펼치기/접기 화살표 회전 */
export const TREE_CHEVRON: Variants = {
  collapsed: {
    rotate: 0,
    transition: APPLE_SPRING.snappy,
  },
  expanded: {
    rotate: 90,
    transition: APPLE_SPRING.snappy,
  },
};

/** 트리 아이템 선택 피드백 */
export const TREE_ITEM_SELECT: Variants = {
  unselected: {
    scale: 1,
    backgroundColor: 'transparent',
  },
  selected: {
    scale: 1,
    transition: APPLE_SPRING.bouncy,
  },
  tap: {
    scale: 0.98,
    transition: APPLE_SPRING.snappy,
  },
};
