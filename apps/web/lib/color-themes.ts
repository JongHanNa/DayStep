// 컬러 테마 정의
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
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  icon: string;
}

export const COLOR_THEMES: ColorThemeConfig[] = [
  {
    id: 'luxury-gold',
    name: 'Luxury Gold',
    nameKo: '럭셔리 골드',
    description: '고급스러운 골드 테마',
    colors: {
      primary: '#D4AF37',
      secondary: '#C5A028',
      accent: '#B8860B',
    },
    icon: '👑',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    nameKo: '오션 블루',
    description: '신뢰감 있는 블루 테마',
    colors: {
      primary: '#3B82F6',
      secondary: '#2563EB',
      accent: '#1D4ED8',
    },
    icon: '🌊',
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    nameKo: '네이처 그린',
    description: '자연친화적인 테마',
    colors: {
      primary: '#22C55E',
      secondary: '#16A34A',
      accent: '#15803D',
    },
    icon: '🌿',
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    nameKo: '로열 퍼플',
    description: '우아한 퍼플 테마',
    colors: {
      primary: '#9333EA',
      secondary: '#7C3AED',
      accent: '#6D28D9',
    },
    icon: '👑',
  },
  {
    id: 'rose-pink',
    name: 'Rose Pink',
    nameKo: '로즈 핑크',
    description: '부드러운 로즈 테마',
    colors: {
      primary: '#EC4899',
      secondary: '#DB2777',
      accent: '#BE185D',
    },
    icon: '🌸',
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    nameKo: '선셋 오렌지',
    description: '활기찬 오렌지 테마',
    colors: {
      primary: '#F97316',
      secondary: '#EA580C',
      accent: '#C2410C',
    },
    icon: '🌅',
  },
  {
    id: 'aqua-teal',
    name: 'Aqua Teal',
    nameKo: '아쿠아 틸',
    description: '청량한 틸 테마',
    colors: {
      primary: '#14B8A6',
      secondary: '#0D9488',
      accent: '#0F766E',
    },
    icon: '💎',
  },
  {
    id: 'deep-indigo',
    name: 'Deep Indigo',
    nameKo: '딥 인디고',
    description: '깊이 있는 인디고 테마',
    colors: {
      primary: '#4F46E5',
      secondary: '#4338CA',
      accent: '#3730A3',
    },
    icon: '🔮',
  },
  {
    id: 'vibrant-red',
    name: 'Vibrant Red',
    nameKo: '바이브런트 레드',
    description: '강렬한 레드 테마',
    colors: {
      primary: '#EF4444',
      secondary: '#DC2626',
      accent: '#B91C1C',
    },
    icon: '❤️',
  },
];

// 기본 테마
export const DEFAULT_COLOR_THEME: ColorTheme = 'ocean-blue';

// 테마 ID로 테마 설정 가져오기
export const getColorThemeConfig = (themeId: ColorTheme): ColorThemeConfig => {
  return COLOR_THEMES.find((t) => t.id === themeId) || COLOR_THEMES[1]; // ocean-blue as default
};
