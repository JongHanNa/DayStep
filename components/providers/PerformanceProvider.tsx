'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance';

/**
 * 성능 모니터링 Provider
 * 앱 시작 시 성능 모니터링을 초기화합니다.
 */
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 성능 모니터링 초기화 (한 번만 실행)
    initPerformanceMonitoring();
  }, []);

  return <>{children}</>;
}