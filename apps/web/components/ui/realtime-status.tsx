'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { RealtimeConnectionState, RealtimeSyncState } from '@/state/utils/storeUtils';

export interface RealtimeStatusProps {
  connectionState: RealtimeConnectionState;
  syncState: RealtimeSyncState;
  onReconnect?: () => void;
  className?: string;
  compact?: boolean;
}

export function RealtimeStatus({
  connectionState,
  syncState,
  onReconnect,
  className,
  compact = false
}: RealtimeStatusProps) {
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    if (syncState.lastSyncTime) {
      const updateTime = () => {
        const now = new Date();
        const diff = now.getTime() - syncState.lastSyncTime!.getTime();
        
        if (diff < 60000) { // 1분 미만
          setLastUpdate('방금 전');
        } else if (diff < 3600000) { // 1시간 미만
          setLastUpdate(`${Math.floor(diff / 60000)}분 전`);
        } else {
          setLastUpdate(`${Math.floor(diff / 3600000)}시간 전`);
        }
      };

      updateTime();
      const interval = setInterval(updateTime, 30000); // 30초마다 업데이트
      
      return () => clearInterval(interval);
    }
    
    // syncState.lastSyncTime이 없을 때는 cleanup 함수 반환하지 않음
    return;
  }, [syncState.lastSyncTime]);

  const getStatusColor = () => {
    switch (connectionState.status) {
      case 'connected':
        return 'text-green-500 bg-green-50 border-green-200';
      case 'connecting':
        return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-500 bg-red-50 border-red-200';
      case 'disconnected':
      default:
        return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (connectionState.status) {
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      case 'disconnected':
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (connectionState.status) {
      case 'connected':
        return compact ? '연결됨' : `실시간 동기화 활성화`;
      case 'connecting':
        return compact ? '연결 중' : `연결 중... (${connectionState.retryCount}/${connectionState.maxRetries})`;
      case 'error':
        return compact ? '연결 실패' : `연결 실패: ${connectionState.error}`;
      case 'disconnected':
      default:
        return compact ? '연결 안됨' : '실시간 동기화 비활성화';
    }
  };

  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-2 py-1 rounded-md border text-xs',
        getStatusColor(),
        className
      )}>
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
        {connectionState.status === 'error' && onReconnect && (
          <button
            onClick={onReconnect}
            className="p-0.5 hover:bg-black/10 rounded transition-colors"
            title="재연결 시도"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all',
      getStatusColor(),
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">{getStatusText()}</span>
        </div>
        
        {connectionState.status === 'error' && onReconnect && (
          <button
            onClick={onReconnect}
            className="px-2 py-1 text-xs hover:bg-black/10 rounded transition-colors"
            title="재연결 시도"
          >
            재연결
          </button>
        )}
      </div>
      
      {/* 동기화 정보 */}
      {connectionState.status === 'connected' && (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3" />
            <span>마지막 동기화: {lastUpdate}</span>
          </div>
          
          {syncState.conflictCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              <span>충돌 해결: {syncState.conflictCount}회</span>
            </div>
          )}
          
          {connectionState.lastConnected && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>연결 시간: {connectionState.lastConnected.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}
      
      {/* 연결 중 상태 */}
      {connectionState.status === 'connecting' && (
        <div className="text-xs">
          <div>재시도 중... ({connectionState.retryCount}/{connectionState.maxRetries})</div>
        </div>
      )}
    </div>
  );
}

export default RealtimeStatus;