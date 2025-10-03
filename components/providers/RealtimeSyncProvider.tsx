'use client';

import React, { useEffect, useRef } from 'react';
import { setupRealtimeSync, stopRealtimeSync } from '@/lib/realtimeSync';
import { startCapacitorPolling, stopCapacitorPolling } from '@/lib/realtimeSyncFallback';

interface RealtimeSyncProviderProps {
  children: React.ReactNode;
}

export function RealtimeSyncProvider({ children }: RealtimeSyncProviderProps) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 중복 초기화 방지
    if (isInitializedRef.current) {
      return;
    }

    console.log('🔄 RealtimeSyncProvider 초기화');
    isInitializedRef.current = true;

    // 인증 상태와 무관하게 실시간 동기화 시작
    // (인증이 필요한 작업은 각 스토어에서 처리)
    const startRealtimeSync = () => {
      cleanupRef.current = setupRealtimeSync();
      
      // ✅ 스마트 폴백: Realtime 실패 시에만 폴링 시작
      // 폴링은 setupRealtimeSync 내부에서 연결 상태에 따라 자동 제어됨
    };

    // 즉시 시작
    startRealtimeSync();

    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('🧹 RealtimeSyncProvider 정리');
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      stopRealtimeSync();
      // ✅ 폴링 정리는 stopRealtimeSync 내부에서 자동 처리됨
      isInitializedRef.current = false;
    };
  }, []);

  // 브라우저 탭/창 닫힐 때 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      stopCapacitorPolling();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}