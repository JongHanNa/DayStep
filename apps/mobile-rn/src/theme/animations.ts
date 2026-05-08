/**
 * 일상투두 Animation Presets
 * 웹앱 appleMotion.ts → Reanimated v3 스프링 설정 포팅
 *
 * Reanimated withSpring config:
 *   damping, stiffness, mass, overshootClamping, restDisplacementThreshold, restSpeedThreshold
 */
import {WithSpringConfig, WithTimingConfig, Easing} from 'react-native-reanimated';

// ============================================
// Spring Presets (from APPLE_SPRING)
// ============================================
export const springs = {
  /** 기본 스프링 — 대부분의 전환에 사용 */
  default: {
    damping: 25,
    stiffness: 300,
    mass: 0.5,
  } satisfies WithSpringConfig,

  /** 빠른 반응 — 선택, 탭 피드백 */
  snappy: {
    damping: 30,
    stiffness: 400,
    mass: 0.3,
  } satisfies WithSpringConfig,

  /** 부드러운 전환 — 뷰 전환, 페이지 */
  smooth: {
    damping: 28,
    stiffness: 200,
    mass: 0.8,
  } satisfies WithSpringConfig,

  /** 바운시 — 선택 피드백, 즐거운 인터랙션 */
  bouncy: {
    damping: 15,
    stiffness: 400,
    mass: 0.5,
  } satisfies WithSpringConfig,

  /** 미묘한 — 작은 UI 변화 */
  subtle: {
    damping: 35,
    stiffness: 500,
    mass: 0.2,
  } satisfies WithSpringConfig,

  /** 체크박스 완료 — 만족스러운 바운스 */
  checkbox: {
    damping: 12,
    stiffness: 500,
    mass: 0.4,
  } satisfies WithSpringConfig,

  /** 카드 프레스 — 눌렀을 때 살짝 줄어듦 */
  press: {
    damping: 20,
    stiffness: 600,
    mass: 0.3,
  } satisfies WithSpringConfig,

  /** 네이티브 Glass 높이 전환 — SwiftUI spring(response:0.4, dampingFraction:0.8) 매칭 */
  nativeGlass: {
    damping: 25,
    stiffness: 247,
    mass: 1,
  } satisfies WithSpringConfig,
} as const;

// ============================================
// Timing Presets
// ============================================
export const timings = {
  fast: {
    duration: 200,
    easing: Easing.out(Easing.cubic),
  } satisfies WithTimingConfig,

  normal: {
    duration: 300,
    easing: Easing.inOut(Easing.cubic),
  } satisfies WithTimingConfig,

  slow: {
    duration: 500,
    easing: Easing.inOut(Easing.cubic),
  } satisfies WithTimingConfig,

  fadeIn: {
    duration: 250,
    easing: Easing.out(Easing.quad),
  } satisfies WithTimingConfig,

  fadeOut: {
    duration: 150,
    easing: Easing.in(Easing.quad),
  } satisfies WithTimingConfig,
} as const;

// ============================================
// Stagger Delays
// ============================================
export const stagger = {
  fast: 30,
  normal: 50,
  slow: 80,
  verySlow: 120,
} as const;

// ============================================
// Scale Values
// ============================================
export const scales = {
  /** 카드 프레스 */
  pressIn: 0.97,
  /** 버튼 프레스 */
  buttonPress: 0.95,
  /** 탭 피드백 */
  tap: 0.98,
  /** 강조 확대 */
  highlight: 1.02,
  /** 선택 강조 */
  selected: 1.05,
} as const;

// ============================================
// Card Entrance Presets
// ============================================
export const cardEntrance = {
  /** 초기 상태 */
  from: {
    opacity: 0,
    translateY: 30,
    scale: 0.95,
  },
  /** 최종 상태 */
  to: {
    opacity: 1,
    translateY: 0,
    scale: 1,
  },
  spring: springs.default,
} as const;

// ============================================
// Swipe Config
// ============================================
export const swipeConfig = {
  threshold: 120,
  velocityThreshold: 800,
  maxAngle: 20,
} as const;
