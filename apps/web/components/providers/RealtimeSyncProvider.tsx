'use client';

import React, { useEffect, useRef } from 'react';
import { setupRealtimeSync, stopRealtimeSync } from '@/lib/realtimeSync';

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
      isInitializedRef.current = false;
    };
  }, []);

  // 브라우저 탭/창 닫힐 때 정리
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <>{children}</>;
}