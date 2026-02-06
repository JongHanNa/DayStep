// components/ui/pull-to-refresh.tsx - 동기화 상태 인디케이터
"use client";

import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 동기화 상태 표시 컴포넌트
 */
export function SyncStatusIndicator({
  className
}: {
  className?: string
}) {
  // 간단한 온라인/오프라인 상태만 표시
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 초기 상태 설정
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null; // 온라인일 때는 표시하지 않음
  }

  return (
    <div className={cn(
      "flex items-center gap-1 text-warning text-xs",
      className
    )}>
      <WifiOff className="w-3 h-3" />
      <span>오프라인</span>
    </div>
  );
}
