/**
 * DayStep Design Tokens
 * "Calm Luxe + ADHD Care" — 시각적 소음 없이 고급스러움 + ADHD 특성 배려
 */

// ============================================
// Spacing (4px grid)
// ============================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// ============================================
// Border Radius
// ============================================
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
  card: 16,
  button: 12,
  chip: 20,
} as const;

// ============================================
// Shadows (Calm Luxe — 부드러운 그림자)
// ============================================
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  }),
} as const;

// ============================================
// Z-Index
// ============================================
export const zIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  overlay: 50,
  modal: 100,
  toast: 200,
} as const;

// ============================================
// Hit Slop (터치 영역 확장 — ADHD 친화)
// ============================================
export const hitSlop = {
  sm: {top: 4, bottom: 4, left: 4, right: 4},
  md: {top: 8, bottom: 8, left: 8, right: 8},
  lg: {top: 12, bottom: 12, left: 12, right: 12},
} as const;

// ============================================
// Timing (ms)
// ============================================
export const timing = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  lazy: 800,
} as const;

// ============================================
// Layout
// ============================================
export const layout = {
  screenPadding: spacing.lg,
  cardPadding: spacing.lg,
  sectionGap: spacing['2xl'],
  tabBarHeight: 80,
  headerHeight: 56,
} as const;
