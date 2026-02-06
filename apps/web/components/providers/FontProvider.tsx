'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/state/stores/settingsStore';

export function FontProvider({ children }: { children: React.ReactNode }) {
  const { fontFamily, wordSpacing, letterSpacing, fontSize } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // 이전 폰트 클래스 제거
    root.classList.remove('font-system', 'font-opendyslexic');
    body.classList.remove('font-system', 'font-opendyslexic');
    
    // 단어 간격 설정 (-0.5 ~ 0.5em 범위)
    const wordSpacingValue = wordSpacing === 0 ? 'normal' : `${wordSpacing}em`;
    body.style.wordSpacing = wordSpacingValue;
    root.style.setProperty('--current-word-spacing', wordSpacingValue);
    
    // 글자 간격 설정 (-0.2 ~ 0.3em 범위)
    const letterSpacingValue = letterSpacing === 0 ? 'normal' : `${letterSpacing}em`;
    body.style.letterSpacing = letterSpacingValue;
    root.style.setProperty('--current-letter-spacing', letterSpacingValue);
    
    // 글자 크기 설정 (12 ~ 24px 범위)
    const fontSizeValue = `${fontSize}px`;
    body.style.fontSize = fontSizeValue;
    root.style.setProperty('--current-font-size', fontSizeValue);
    
    // 새로운 폰트 클래스 추가 및 CSS 변수 설정
    switch (fontFamily) {
      case 'opendyslexic':
        root.classList.add('font-opendyslexic');
        body.classList.add('font-opendyslexic');
        root.style.setProperty('--current-font-family', '"OpenDyslexic", Arial, sans-serif');
        // 직접 body에도 적용
        body.style.fontFamily = '"OpenDyslexic", Arial, sans-serif';
        break;
      case 'system':
      default:
        root.classList.add('font-system');
        body.classList.add('font-system');
        root.style.setProperty('--current-font-family', 'Arial, Helvetica, sans-serif');
        // 직접 body에도 적용
        body.style.fontFamily = 'Arial, Helvetica, sans-serif';
        break;
    }
    
    console.log('🎨 글꼴 변경됨:', fontFamily, '단어 간격:', wordSpacingValue, '글자 간격:', letterSpacingValue, '글자 크기:', fontSizeValue, '적용된 폰트:', body.style.fontFamily);
  }, [fontFamily, wordSpacing, letterSpacing, fontSize]);

  return <>{children}</>;
}