'use client';

import { createContext, useContext } from 'react';
import type { BackgroundPreset } from '@/lib/color-presets';
import type { SemanticColorMap } from '@/lib/colors';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;

  /** 현재 배경 프리셋 */
  backgroundPreset: BackgroundPreset;
  /** 배경 프리셋 변경 */
  setBackgroundPreset: (preset: BackgroundPreset) => void;
  /** 배경 프리셋에서 파생된 메인컬러 (CSS 변수 --color-primary와 동일 값) */
  primaryColor: string;
  /** 다크모드를 반영한 시맨틱 컬러 (error/success/warning/info) */
  colors: SemanticColorMap;
  /** primary 색상에 opacity 적용한 rgba 문자열 */
  hexWithOpacity: (hex: string, opacity: number) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { ThemeContext };
export type { Theme, ThemeContextType };
