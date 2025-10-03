import localFont from 'next/font/local';

export const openDyslexic = localFont({
  src: [
    {
      path: '../public/fonts/OpenDyslexic/OpenDyslexic-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/OpenDyslexic/OpenDyslexic-Bold.woff2',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-opendyslexic',
  display: 'swap',
  fallback: ['Arial', 'sans-serif']
});

// CSS 클래스명을 반환하는 헬퍼 함수
export function getFontClass(fontFamily: 'system' | 'opendyslexic') {
  switch (fontFamily) {
    case 'opendyslexic':
      return 'font-opendyslexic';
    case 'system':
    default:
      return '';
  }
}

// CSS 변수를 반환하는 헬퍼 함수
export function getFontVariable(fontFamily: 'system' | 'opendyslexic') {
  switch (fontFamily) {
    case 'opendyslexic':
      return 'var(--font-opendyslexic)';
    case 'system':
    default:
      return 'Arial, Helvetica, sans-serif';
  }
}