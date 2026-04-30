/**
 * Background Preset → Main Color 매핑
 * 모바일 RN(`apps/mobile-rn/src/stores/settingsStore.ts`)과 단일 소스 공유
 */

export type BackgroundPreset =
  | 'warmBackground'
  | 'calmBackground'
  | 'eveningBackground'
  | 'executionBackground';

export const PRESET_MAIN_COLORS: Record<BackgroundPreset, string> = {
  calmBackground: '#3B82F6',
  warmBackground: '#D97706',
  eveningBackground: '#8B5CF6',
  executionBackground: '#EA580C',
};

export const DEFAULT_BACKGROUND_PRESET: BackgroundPreset = 'calmBackground';

export function getMainColorForPreset(preset: BackgroundPreset): string {
  return PRESET_MAIN_COLORS[preset] ?? PRESET_MAIN_COLORS[DEFAULT_BACKGROUND_PRESET];
}

export interface BackgroundPresetMeta {
  labelKo: string;
  description: string;
  icon: string;
}

export const BACKGROUND_PRESET_META: Record<BackgroundPreset, BackgroundPresetMeta> = {
  calmBackground: {
    labelKo: '차분한 블루',
    description: '집중과 계획에 어울리는 차분한 톤',
    icon: '🌊',
  },
  warmBackground: {
    labelKo: '따뜻한 앰버',
    description: '아침과 동기 부여에 어울리는 따뜻한 톤',
    icon: '🌅',
  },
  eveningBackground: {
    labelKo: '저녁 바이올렛',
    description: '저녁과 회고에 어울리는 부드러운 톤',
    icon: '🌙',
  },
  executionBackground: {
    labelKo: '실행 오렌지',
    description: '실행과 추진에 어울리는 활기찬 톤',
    icon: '🔥',
  },
};

export const BACKGROUND_PRESET_ORDER: BackgroundPreset[] = [
  'calmBackground',
  'warmBackground',
  'eveningBackground',
  'executionBackground',
];

/**
 * Legacy 9-theme ColorTheme → BackgroundPreset 매핑
 * persist migrate(v1 → v2)에서 사용
 */
export function migrateColorThemeToPreset(legacyTheme: string | undefined): BackgroundPreset {
  switch (legacyTheme) {
    case 'ocean-blue':
    case 'aqua-teal':
    case 'deep-indigo':
      return 'calmBackground';
    case 'luxury-gold':
    case 'sunset-orange':
      return 'warmBackground';
    case 'royal-purple':
    case 'rose-pink':
      return 'eveningBackground';
    case 'nature-green':
    case 'vibrant-red':
      return 'executionBackground';
    default:
      return DEFAULT_BACKGROUND_PRESET;
  }
}
