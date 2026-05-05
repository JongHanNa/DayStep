/**
 * DayStep Color System
 * 웹앱 9개 컬러 테마 포팅 + Calm Luxe 팔레트
 */

// ============================================
// Semantic Colors (Light mode)
// ============================================
export const semanticColors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundTertiary: '#F1F3F5',

    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',

    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',

    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    divider: '#F1F3F5',

    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',

    surface: '#1E293B',
    surfaceElevated: '#334155',

    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    textInverse: '#0F172A',

    border: '#334155',
    borderLight: '#1E293B',
    divider: '#334155',

    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const;

// ============================================
// 9 Color Themes (from web app)
// ============================================
export type ColorTheme =
  | 'luxury-gold'
  | 'ocean-blue'
  | 'nature-green'
  | 'royal-purple'
  | 'rose-pink'
  | 'sunset-orange'
  | 'aqua-teal'
  | 'deep-indigo'
  | 'vibrant-red';

export interface ColorThemeConfig {
  id: ColorTheme;
  name: string;
  nameKo: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  gradient: [string, string];
}

export const COLOR_THEMES: ColorThemeConfig[] = [
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    nameKo: '럭셔리 골드',
    icon: '👑',
    colors: {primary: '#D4AF37', secondary: '#C5A028', accent: '#B8860B'},
    gradient: ['#D4AF37', '#B8860B'],
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    nameKo: '오션 블루',
    icon: '🌊',
    colors: {primary: '#3B82F6', secondary: '#2563EB', accent: '#1D4ED8'},
    gradient: ['#3B82F6', '#1D4ED8'],
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    nameKo: '네이처 그린',
    icon: '🌿',
    colors: {primary: '#22C55E', secondary: '#16A34A', accent: '#15803D'},
    gradient: ['#22C55E', '#15803D'],
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    nameKo: '로열 퍼플',
    icon: '👑',
    colors: {primary: '#9333EA', secondary: '#7C3AED', accent: '#6D28D9'},
    gradient: ['#9333EA', '#6D28D9'],
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    nameKo: '로즈 핑크',
    icon: '🌸',
    colors: {primary: '#EC4899', secondary: '#DB2777', accent: '#BE185D'},
    gradient: ['#EC4899', '#BE185D'],
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    nameKo: '선셋 오렌지',
    icon: '🌅',
    colors: {primary: '#F97316', secondary: '#EA580C', accent: '#C2410C'},
    gradient: ['#F97316', '#C2410C'],
  },
  {
    id: 'aqua-teal',
    name: 'Aqua Teal',
    nameKo: '아쿠아 틸',
    icon: '💎',
    colors: {primary: '#14B8A6', secondary: '#0D9488', accent: '#0F766E'},
    gradient: ['#14B8A6', '#0F766E'],
  },
  {
    id: 'deep-indigo',
    name: 'Deep Indigo',
    nameKo: '딥 인디고',
    icon: '🔮',
    colors: {primary: '#4F46E5', secondary: '#4338CA', accent: '#3730A3'},
    gradient: ['#4F46E5', '#3730A3'],
  },
  {
    id: 'vibrant-red',
    name: 'Vibrant Red',
    nameKo: '바이브런트 레드',
    icon: '❤️',
    colors: {primary: '#EF4444', secondary: '#DC2626', accent: '#B91C1C'},
    gradient: ['#EF4444', '#B91C1C'],
  },
];

export const DEFAULT_COLOR_THEME: ColorTheme = 'ocean-blue';

export const getColorThemeConfig = (themeId: ColorTheme): ColorThemeConfig => {
  return COLOR_THEMES.find(t => t.id === themeId) || COLOR_THEMES[1];
};

// ============================================
// ADHD Feature Colors (따뜻한 그라디언트)
// ============================================
export const featureColors = {
  motivation: {gradient: ['#FDE68A', '#F59E0B'], label: '원동력'},
  relationship: {gradient: ['#FBCFE8', '#EC4899'], label: '관계'},
  planning: {gradient: ['#BFDBFE', '#3B82F6'], label: '계획'},
  reflection: {gradient: ['#C4B5FD', '#7C3AED'], label: '성찰'},
  care: {gradient: ['#BBF7D0', '#22C55E'], label: '돌봄'},
  execution: {gradient: ['#FED7AA', '#F97316'], label: '실행'},
} as const;

// ============================================
// Fixed Colors (테마 무관, 시맨틱 구별 필요)
// ============================================
export const fixedColors = {
  premiumGold: '#F59E0B',
  priorityImportance: '#F59E0B',
  priorityUrgency: '#3B82F6',
  priorityReluctant: '#EF4444',
  statusInProgress: '#3B82F6',
  statusOnHold: '#F59E0B',
  statusCompleted: '#22C55E',
  statusNotStarted: '#6B7280',
  calendarSunday: '#EF4444',
  calendarSaturday: '#3B82F6',
  contactUrgencyHigh: '#EF4444',
  contactUrgencyMedium: '#F59E0B',
} as const;

// ============================================
// Priority Colors
// ============================================
export const priorityColors = {
  urgent_important: '#EF4444',
  not_urgent_important: '#F59E0B',
  urgent_not_important: '#3B82F6',
  not_urgent_not_important: '#9CA3AF',
} as const;

// ============================================
// Time Period Colors
// ============================================
export const timePeriodColors = {
  morning: {gradient: ['#FDE68A', '#FBBF24'], icon: '🌅'},
  afternoon: {gradient: ['#93C5FD', '#3B82F6'], icon: '☀️'},
  evening: {gradient: ['#C4B5FD', '#7C3AED'], icon: '🌙'},
} as const;
