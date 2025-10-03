'use client';

import { useEffect, useCallback, useRef } from 'react';
// Dynamic import for Capacitor App
let App: any = null;
let AppState: any = null;
import { Capacitor } from '@capacitor/core';
import { WidgetBridge } from '../plugins/widget-bridge/src';

/**
 * 앱 라이프사이클 상태
 */
export type AppLifecycleState = 'active' | 'inactive' | 'background';

/**
 * 앱 라이프사이클 이벤트 핸들러 타입
 */
export interface AppLifecycleHandlers {
  onForeground?: () => void | Promise<void>;
  onBackground?: () => void | Promise<void>;
  onStateChange?: (state: AppLifecycleState) => void | Promise<void>;
}

/**
 * 앱 라이프사이클 이벤트를 처리하는 Hook
 * 네이티브 앱과 웹 환경에서 모두 동작
 */
export const useAppLifecycle = (handlers: AppLifecycleHandlers = {}) => {
  const { onForeground, onBackground, onStateChange } = handlers;
  const currentStateRef = useRef<AppLifecycleState>('active');
  const isNative = Capacitor.isNativePlatform();

  /**
   * 포그라운드 진입 시 처리
   */
  const handleForeground = useCallback(async () => {
    if (currentStateRef.current === 'active') return;
    
    currentStateRef.current = 'active';
    console.log('📱 App entered foreground');

    try {
      // Widget 동기화 및 새로고침
      if (isNative) {
        await WidgetBridge.reloadWidget();
        await WidgetBridge.getWidgetStatus();
      }

      // 사용자 정의 핸들러 실행
      await onForeground?.();
      await onStateChange?.('active');
    } catch (error) {
      console.error('❌ Error handling foreground event:', error);
    }
  }, [isNative, onForeground, onStateChange]);

  /**
   * 백그라운드 진입 시 처리
   */
  const handleBackground = useCallback(async () => {
    if (currentStateRef.current === 'background') return;

    const previousState = currentStateRef.current;
    currentStateRef.current = 'background';
    console.log('📱 App entered background');

    try {
      // 백그라운드 동기화 스케줄링
      if (isNative) {
        await WidgetBridge.scheduleUpdate({
          intervalMinutes: 30,
          allowBackgroundUpdate: true
        });
      }

      // 사용자 정의 핸들러 실행
      await onBackground?.();
      await onStateChange?.('background');
    } catch (error) {
      console.error('❌ Error handling background event:', error);
    }
  }, [isNative, onBackground, onStateChange]);

  /**
   * 앱 상태 변경 처리
   */
  const handleStateChange = useCallback(async (state: any) => {
    const newState: AppLifecycleState = state.isActive ? 'active' : 'background';
    
    if (newState === currentStateRef.current) return;

    console.log(`📱 App state changed: ${currentStateRef.current} -> ${newState}`);

    if (newState === 'active') {
      await handleForeground();
    } else {
      await handleBackground();
    }
  }, [handleForeground, handleBackground]);

  // 네이티브 앱 이벤트 리스너 등록
  useEffect(() => {
    if (!isNative) return;

    let stateChangeListener: any;

    const setupNativeListeners = async () => {
      try {
        // 앱 상태 변경 리스너
        stateChangeListener = await App.addListener('appStateChange', handleStateChange);
        
        console.log('✅ Native app lifecycle listeners registered');
      } catch (error) {
        console.error('❌ Failed to register native app listeners:', error);
      }
    };

    setupNativeListeners();

    return () => {
      stateChangeListener?.remove();
    };
  }, [isNative, handleStateChange]);

  // 웹 환경 이벤트 리스너 등록
  useEffect(() => {
    if (isNative) return;

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible) {
        handleForeground();
      } else {
        handleBackground();
      }
    };

    const handleFocus = () => {
      handleForeground();
    };

    const handleBlur = () => {
      currentStateRef.current = 'inactive';
      onStateChange?.('inactive');
    };

    const handlePageHide = () => {
      handleBackground();
    };

    // 웹 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    
    // beforeunload는 사용자가 페이지를 떠날 때 실행
    window.addEventListener('beforeunload', handlePageHide);

    console.log('✅ Web app lifecycle listeners registered');

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [isNative, handleForeground, handleBackground, onStateChange]);

  return {
    currentState: currentStateRef.current,
    isNative,
    
    // 수동 상태 변경 메소드
    triggerForeground: handleForeground,
    triggerBackground: handleBackground,
  };
};