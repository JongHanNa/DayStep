import { registerPlugin } from '@capacitor/core';
import type { ThemeBridgePlugin } from './definitions';

const ThemeBridge = registerPlugin<ThemeBridgePlugin>('ThemeBridge', {
  web: () => import('./web').then(m => new m.ThemeBridgeWeb()),
});

export * from './definitions';
export { ThemeBridge };

// 참고: 색상 결정 로직과 syncWebViewBackgroundColor 함수는
// lib/capacitor/theme-bridge.ts에서 관리합니다.
// 이 플러그인은 순수하게 네이티브 브리지 역할만 합니다.
