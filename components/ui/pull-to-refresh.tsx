// components/ui/pull-to-refresh.tsx - Pull to Refresh UI 컴포넌트
"use client";

import React from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useServerSentEvents } from '@/hooks/useServerSentEvents';
import { RefreshCw, ChevronDown, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    canRefresh,
    isActive,
    isRealtimeActive,
    manualRefresh,
    containerRef,
    pullProgress,
    rotationAngle
  } = usePullToRefresh({ onRefresh, disabled });

  // Pull to Refresh가 비활성화되어 있으면 숨김
  if (!isActive) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative", className)}
      style={{
        transform: isPulling ? `translateY(${Math.min(pullDistance * 0.5, 60)}px)` : undefined,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        // 🎈 고무줄 효과를 위한 스크롤 설정
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'auto'
      }}
    >
      {/* Pull to Refresh 헤더 */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 z-10",
          "flex items-center justify-center",
          "bg-background/80 backdrop-blur-sm",
          "transition-all duration-300 ease-out",
          isPulling ? "opacity-100" : "opacity-0"
        )}
        style={{
          height: Math.min(pullDistance, 80),
          transform: `translateY(-${80 - Math.min(pullDistance, 80)}px)`
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {/* 새로고침 아이콘 */}
          <div className="relative">
            {isRefreshing ? (
              <RefreshCw 
                className="w-5 h-5 text-primary animate-spin" 
              />
            ) : canRefresh ? (
              <ChevronDown 
                className="w-5 h-5 text-primary" 
                style={{ transform: 'rotate(180deg)' }}
              />
            ) : (
              <ChevronDown 
                className="w-5 h-5 text-muted-foreground transition-transform duration-200" 
                style={{ transform: `rotate(${Math.min(rotationAngle, 180)}deg)` }}
              />
            )}
          </div>
          
          {/* 상태 텍스트 */}
          <div className="text-xs text-center font-medium">
            {isRefreshing ? (
              <span className="text-primary">동기화 중...</span>
            ) : canRefresh ? (
              <span className="text-primary">놓으면 새로고침</span>
            ) : (
              <span className="text-muted-foreground">아래로 당겨서 새로고침</span>
            )}
          </div>
          
          {/* 진행률 표시기 */}
          {isPulling && !isRefreshing && (
            <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-100 ease-out rounded-full"
                style={{ width: `${pullProgress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className={cn(
        "transition-transform duration-300 ease-out",
        isPulling && "transform-gpu"
      )}>
        {children}
      </div>

      {/* 수동 새로고침 버튼 비활성화 - Pull to Refresh만 사용 */}
    </div>
  );
}

// 실시간 동기화 상태 표시 컴포넌트
export function SyncStatusIndicator() {
  // SSE 상태를 직접 최신으로 가져오기 (재연결 후 즉시 업데이트 보장)
  const sseState = useServerSentEvents();
  const { reconnect: manualReconnect, isActive } = sseState;
  
  // 실시간 동기화 활성 여부를 직접 계산 (최신 상태 반영)
  const isRealtimeActive = isActive;

  // 상태별 표시 결정
  const getStatusInfo = () => {
    if (isRealtimeActive) {
      if (sseState.isActive) {
        return {
          color: "bg-green-500",
          text: "SSE 실시간 동기화",
          detail: `연결됨 ${sseState.lastHeartbeat ? '• 정상' : '• 연결중'}`
        };
      } else {
        return {
          color: "bg-green-500", 
          text: "실시간 동기화",
          detail: "Supabase Realtime"
        };
      }
    } else {
      if (sseState.isConnecting) {
        return {
          color: "bg-blue-500",
          text: "SSE 연결 중...",
          detail: `시도 ${sseState.reconnectAttempts}/5`
        };
      } else if (sseState.error) {
        // SSE 서버 연결 실패, 기본 저장만 가능
        return {
          color: "bg-orange-500",
          text: "실시간 동기화 비활성",
          detail: "작업 내용은 자동 저장됨"
        };
      } else {
        return {
          color: "bg-yellow-500",
          text: "수동 동기화",
          detail: "아래로 당겨서 새로고침"
        };
      }
    }
  };

  const { color, text, detail } = getStatusInfo();
  const showReconnectButton = sseState.error && !sseState.isConnecting;

  // 수동 재연결 핸들러
  const handleManualReconnect = () => {
    console.log('🔄 수동 SSE 재연결 시도');
    manualReconnect();
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <div className="flex flex-col">
        <span className="font-medium">{text}</span>
        <span className="text-[10px] opacity-70">{detail}</span>
      </div>
      
      {/* SSE 수동 재연결 버튼 */}
      {showReconnectButton && (
        <button
          onClick={handleManualReconnect}
          className={cn(
            "ml-2 p-1 rounded-md transition-colors",
            "bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50",
            "text-orange-600 dark:text-orange-400",
            "active:scale-95"
          )}
          title="실시간 동기화 다시 연결"
        >
          <Wifi className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}