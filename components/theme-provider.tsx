'use client';

import { ThemeContext, Theme, ThemeContextType } from '@/hooks/useTheme';
import { useEffect, useState } from 'react';
import { updateCSSVariables } from '@/lib/theme-colors';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

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
    
    // CSS 클래스 적용
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // CSS 변수 업데이트 - 중앙화된 색상 관리 사용
    updateCSSVariables(root);

    // 강제 리플로우 (브라우저가 변경사항을 즉시 적용하도록)
    root.style.display = 'none';
    root.offsetHeight; // 강제 리플로우 트리거
    root.style.display = '';

    // 텍스트 색상만 테마별로 설정
    if (effectiveTheme === 'dark') {
      root.style.setProperty('--foreground', '#ededed');
    } else {
      root.style.setProperty('--foreground', '#171717');
    }
  }, [theme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const systemTheme = getSystemTheme();
        setResolvedTheme(systemTheme);
        
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
        
        // CSS 변수 업데이트 - 중앙화된 색상 관리 사용
        updateCSSVariables(root);

        // 강제 리플로우 (브라우저가 변경사항을 즉시 적용하도록)
        root.style.display = 'none';
        root.offsetHeight; // 강제 리플로우 트리거
        root.style.display = '';

        // 텍스트 색상만 테마별로 설정
        if (systemTheme === 'dark') {
          root.style.setProperty('--foreground', '#ededed');
        } else {
          root.style.setProperty('--foreground', '#171717');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    
    // theme이 'system'이 아닐 때는 cleanup 없음
    return;
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