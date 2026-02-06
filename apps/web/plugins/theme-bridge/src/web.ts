import { WebPlugin } from '@capacitor/core';
import type { ThemeBridgePlugin } from './definitions';

/**
 * 웹 환경용 ThemeBridge 플러그인 (no-op)
 * 웹에서는 CSS가 배경색을 처리하므로 네이티브 설정이 필요 없음
 */
export class ThemeBridgeWeb extends WebPlugin implements ThemeBridgePlugin {
  async setScrollViewBackgroundColor(options: { color: string }): Promise<{ success: boolean; color: string }> {
    console.log('[ThemeBridge Web] setScrollViewBackgroundColor called (no-op):', options.color);
    return { success: true, color: options.color };
  }
}
