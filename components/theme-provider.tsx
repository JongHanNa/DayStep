'use client';

import { ThemeContext, Theme, ThemeContextType } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/state/stores/settingsStore';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'dark' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');
  const colorTheme = useSettingsStore((state) => state.colorTheme);

  // 시스템 테마 감지
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // 로컬 스토리지에서 테마 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme;
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        setTheme(storedTheme);
      }
    }
  }, []);

  // 테마 적용
  useEffect(() => {
    const root = document.documentElement;

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'system') {
      effectiveTheme = getSystemTheme();
    } else {
      effectiveTheme = theme;
    }

    setResolvedTheme(effectiveTheme);

    // CSS 클래스 + data-theme 속성 적용 (DaisyUI는 data-theme 필수)
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    root.setAttribute('data-theme', effectiveTheme); // DaisyUI가 CSS 변수 읽기 위해 필수
  }, [theme]);

  // 컬러 테마 적용
  useEffect(() => {
    const root = document.documentElement;
    if (colorTheme) {
      root.setAttribute('data-color-theme', colorTheme);
    }
  }, [colorTheme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const systemTheme = getSystemTheme();
      setResolvedTheme(systemTheme);

      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme); // DaisyUI가 CSS 변수 읽기 위해 필수
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme: updateTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}