'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { initializeRevenueCat } from '@/lib/revenue-cat';

/**
 * Capacitor 앱 라이프사이클 이벤트를 처리하는 컴포넌트
 * - 백그라운드 복귀 시 불필요한 리다이렉트 방지
 * - Revenue Cat 초기화 (구독 결제 시스템)
 */
export function AppLifecycleHandler() {
  useEffect(() => {
    // 브라우저 환경이 아니면 대기
    if (typeof window === 'undefined') return;

    // Capacitor 환경 감지
    const isCapacitor = window.location.protocol === 'capacitor:';
    if (!isCapacitor) {
      console.log('🌐 웹 환경 - AppLifecycleHandler 비활성화');
      return;
    }

    console.log('📱 Capacitor 환경 - AppLifecycleHandler 활성화');

    // Revenue Cat 초기화 (비동기 실행, 블로킹 없음)
    initializeRevenueCat()
      .then(() => {
        console.log('💳 Revenue Cat 초기화 완료');
      })
      .catch((error) => {
        console.error('💳 Revenue Cat 초기화 실패:', error);
      });

    // 앱 상태 변경 이벤트 리스너
    const handleAppStateChange = (state: { isActive: boolean }) => {
      if (state.isActive) {
        // 포그라운드 복귀 시
        console.log('✅ 앱 포그라운드 복귀 - 현재 경로 유지');
        // 현재 경로를 유지하고 추가 작업을 하지 않음
        // 이렇게 하면 랜딩 페이지로 불필요하게 리다이렉트되는 것을 방지
      } else {
        // 백그라운드 전환 시
        console.log('📴 앱 백그라운드 전환');
      }
    };

    // 이벤트 리스너 등록
    App.addListener('appStateChange', handleAppStateChange);

    // 클린업: 컴포넌트 언마운트 시 리스너 제거
    return () => {
      App.removeAllListeners();
    };
  }, []);

  // UI를 렌더링하지 않음 (라이프사이클 이벤트만 처리)
  return null;
}
