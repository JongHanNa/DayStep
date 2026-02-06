'use client';

import React, { useState, useEffect } from 'react';
import { useMemoryMonitor, useBatteryOptimization } from '@/state/utils/memoryUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * 개발 환경에서 성능 및 메모리 사용량을 모니터링하는 컴포넌트
 */
export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  
  const { getMemorySnapshots, getCurrentMemoryUsage } = useMemoryMonitor(2000);
  const { batteryLevel, isCharging, shouldReducePerformance, getOptimalUpdateInterval } = useBatteryOptimization();
  
  // 향상된 성능 분석 데이터
  const [performanceScore, setPerformanceScore] = useState(0);
  const [metricStats, setMetricStats] = useState<any>({});
  
  useEffect(() => {
    // 성능 분석 시스템 초기화 (클라이언트에서만)
    const initAnalytics = async () => {
      if (typeof window !== 'undefined') {
        const { initializePerformanceAnalytics, getPerformanceAnalytics } = await import('@/lib/analytics-enhanced');
        initializePerformanceAnalytics();
        
        // 주기적으로 성능 점수 업데이트
        const interval = setInterval(() => {
          const analytics = getPerformanceAnalytics();
          if (analytics) {
            setPerformanceScore(analytics.calculatePerformanceScore());
            setMetricStats(analytics.getMetricStats());
          }
        }, 5000);
        
        return () => clearInterval(interval);
      }
      
      // 서버 사이드에서는 cleanup 함수 없음
      return;
    };
    
    initAnalytics();
  }, []);

  // 개발 환경이 아니면 렌더링하지 않음
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const currentMemory = getCurrentMemoryUsage();
  const memorySnapshots = getMemorySnapshots();
  const recentSnapshots = memorySnapshots.slice(-10);

  const getMemoryStatus = (memoryMB: number) => {
    if (memoryMB < 50) return { color: 'green', label: '좋음' };
    if (memoryMB < 100) return { color: 'yellow', label: '보통' };
    if (memoryMB < 150) return { color: 'orange', label: '주의' };
    return { color: 'red', label: '위험' };
  };

  const memoryStatus = getMemoryStatus(currentMemory);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          🔍 성능 모니터
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-3 bg-white/95 backdrop-blur-sm shadow-xl min-w-[200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={memoryStatus.color === 'red' ? 'destructive' : 'secondary'}>
                {currentMemory.toFixed(1)}MB
              </Badge>
              <span className="text-sm font-medium">{memoryStatus.label}</span>
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => setIsMinimized(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                📊
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="p-4 bg-white/95 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">성능 모니터</h3>
          <div className="flex gap-1">
            <Button
              onClick={() => setIsMinimized(true)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ➖
            </Button>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {/* 메모리 사용량 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">메모리 사용량</span>
              <Badge variant={memoryStatus.color === 'red' ? 'destructive' : 'secondary'}>
                {memoryStatus.label}
              </Badge>
            </div>
            <div className="text-lg font-bold">
              {currentMemory.toFixed(1)} MB
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  memoryStatus.color === 'green' ? 'bg-green-500' :
                  memoryStatus.color === 'yellow' ? 'bg-yellow-500' :
                  memoryStatus.color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, (currentMemory / 150) * 100)}%` }}
              />
            </div>
          </div>

          {/* 배터리 상태 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">배터리</span>
              <Badge variant={shouldReducePerformance ? 'destructive' : 'secondary'}>
                {isCharging ? '충전 중' : '방전 중'}
              </Badge>
            </div>
            <div className="text-sm">
              {(batteryLevel * 100).toFixed(0)}%
              {shouldReducePerformance && (
                <span className="text-orange-600 ml-2 text-xs">절전 모드</span>
              )}
            </div>
          </div>

          {/* 성능 점수 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">성능 점수</span>
              <Badge variant={performanceScore >= 80 ? 'secondary' : performanceScore >= 60 ? 'outline' : 'destructive'}>
                {performanceScore >= 80 ? '우수' : performanceScore >= 60 ? '보통' : '개선 필요'}
              </Badge>
            </div>
            <div className="text-lg font-bold">
              {performanceScore}/100
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  performanceScore >= 80 ? 'bg-green-500' :
                  performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
          </div>

          {/* Core Web Vitals */}
          {Object.keys(metricStats).length > 0 && (
            <div>
              <span className="text-xs font-medium">Core Web Vitals</span>
              <div className="text-xs mt-1 space-y-1">
                {['LCP', 'INP', 'CLS'].map(metric => {
                  const stats = metricStats[metric];
                  if (!stats) return null;
                  
                  return (
                    <div key={metric} className="flex justify-between">
                      <span>{metric}:</span>
                      <span className={`font-mono ${
                        stats.poor > 0 ? 'text-red-600' :
                        stats.needsImprovement > 0 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {metric === 'CLS' ? stats.latest.toFixed(3) : Math.round(stats.latest)}
                        {metric !== 'CLS' && 'ms'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 최적화 설정 */}
          <div>
            <span className="text-xs font-medium">최적화 설정</span>
            <div className="text-xs text-gray-600 mt-1">
              <div>업데이트 간격: {getOptimalUpdateInterval()}ms</div>
              <div>메모리 스냅샷: {memorySnapshots.length}개</div>
              <div>분석 메트릭: {Object.keys(metricStats).length}개</div>
            </div>
          </div>

          {/* 메모리 히스토리 차트 (간단한 텍스트 기반) */}
          {recentSnapshots.length > 0 && (
            <div>
              <span className="text-xs font-medium">메모리 추이</span>
              <div className="mt-1 text-xs font-mono">
                {recentSnapshots.map((snapshot, index) => {
                  const memoryMB = snapshot.heapUsed / 1024 / 1024;
                  const bar = '█'.repeat(Math.ceil(memoryMB / 10));
                  return (
                    <div key={snapshot.timestamp} className="truncate">
                      {bar} {memoryMB.toFixed(1)}MB
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 경고 메시지 */}
          {currentMemory > 100 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="text-xs text-yellow-800">
                <strong>주의:</strong> 메모리 사용량이 높습니다. 
                페이지를 새로고침하거나 불필요한 탭을 닫아보세요.
              </div>
            </div>
          )}

          {shouldReducePerformance && (
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <div className="text-xs text-orange-800">
                <strong>절전 모드:</strong> 배터리 절약을 위해 성능이 제한됩니다.
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * 성능 모니터링을 전역적으로 활성화하는 Provider
 */
export function PerformanceMonitorProvider({ 
  children, 
  enabled = process.env.NODE_ENV === 'development' 
}: { 
  children: React.ReactNode;
  enabled?: boolean;
}) {
  return (
    <>
      {children}
      {enabled && <PerformanceMonitor />}
    </>
  );
}