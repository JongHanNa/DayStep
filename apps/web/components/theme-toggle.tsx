'use client';

import { useTheme } from '@/hooks/useTheme';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const themes = [
    { value: 'light', label: '라이트', icon: Sun },
    { value: 'dark', label: '다크', icon: Moon },
    { value: 'system', label: '시스템', icon: Monitor },
  ] as const;

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  // 키보드 네비게이션 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(themes.findIndex(t => t.value === theme));
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % themes.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + themes.length) % themes.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setTheme(themes[focusedIndex].value);
        setIsOpen(false);
        break;
      case 'Tab':
        // Tab으로 메뉴 밖으로 나갈 때 메뉴 닫기
        setIsOpen(false);
        break;
    }
  };

  // 메뉴가 열릴 때 포커스된 아이템으로 스크롤
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const focusedElement = menuRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, focusedIndex]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    // 메뉴가 닫혀있을 때는 cleanup 없음
    return;
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="touch-target flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={`현재 테마: ${currentTheme?.label || '시스템'}. 테마 변경 메뉴 ${isOpen ? '닫기' : '열기'}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <CurrentIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" aria-hidden="true" />
      </button>

      {isOpen && (
        <>
          {/* 오버레이 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* 드롭다운 메뉴 */}
          <div 
            className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20"
            role="menu"
            aria-label="테마 선택"
            onKeyDown={handleKeyDown}
          >
            {themes.map(({ value, label, icon: Icon }, index) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  setIsOpen(false);
                }}
                className={`touch-target w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none first:rounded-t-lg last:rounded-b-lg ${
                  theme === value 
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 dark:text-gray-300'
                } ${
                  focusedIndex === index 
                    ? 'bg-gray-100 dark:bg-gray-600 ring-2 ring-blue-500 ring-inset' 
                    : ''
                }`}
                role="menuitem"
                aria-label={`${label} 테마로 변경`}
                aria-current={theme === value ? 'true' : undefined}
                tabIndex={-1}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">{label}</span>
                {theme === value && (
                  <div 
                    className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" 
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}