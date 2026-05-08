/**
 * 일상투두 Theme Provider
 * 컬러 테마 + 다크/라이트 모드 관리
 */
import React, {createContext, useContext, useMemo, useState, useCallback} from 'react';
import {useColorScheme} from 'react-native';
import {
  semanticColors,
  type ColorTheme,
  DEFAULT_COLOR_THEME,
  getColorThemeConfig,
  type ColorThemeConfig,
} from './colors';
import {useSettingsStore, getMainColorForPreset} from '@/stores/settingsStore';

type ColorMode = 'light' | 'dark';

interface ThemeContextValue {
  colorMode: ColorMode;
  colorTheme: ColorThemeConfig;
  colors: typeof semanticColors.light;
  primaryColor: string;
  setColorTheme: (theme: ColorTheme) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const systemColorScheme = useColorScheme();
  const [colorModeOverride, setColorModeOverride] = useState<ColorMode | null>(null);
  const [themeId, setThemeId] = useState<ColorTheme>(DEFAULT_COLOR_THEME);
  const backgroundPreset = useSettingsStore(s => s.backgroundPreset);

  const colorMode = colorModeOverride ?? (systemColorScheme === 'dark' ? 'dark' : 'light');
  const colorTheme = useMemo(() => getColorThemeConfig(themeId), [themeId]);
  const colors = semanticColors[colorMode];

  // primaryColor를 배경 프리셋의 mainColor에서 가져옴
  const presetPrimaryColor = useMemo(
    () => getMainColorForPreset(backgroundPreset),
    [backgroundPreset],
  );

  const toggleColorMode = useCallback(() => {
    setColorModeOverride(prev => {
      if (prev === null) return systemColorScheme === 'dark' ? 'light' : 'dark';
      return prev === 'light' ? 'dark' : 'light';
    });
  }, [systemColorScheme]);

  const value = useMemo(
    () => ({
      colorMode,
      colorTheme,
      colors,
      primaryColor: presetPrimaryColor,
      setColorTheme: setThemeId,
      toggleColorMode,
    }),
    [colorMode, colorTheme, colors, presetPrimaryColor, toggleColorMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
