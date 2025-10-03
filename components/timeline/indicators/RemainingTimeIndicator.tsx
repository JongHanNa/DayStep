'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Sunset, Coffee, Moon } from 'lucide-react';

interface RemainingTimeIndicatorProps {
  className?: string;
}

const RemainingTimeIndicator: React.FC<RemainingTimeIndicatorProps> = ({ className }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date()); // 클라이언트에서 실제 시간으로 업데이트
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // 하루 중 남은 시간 계산
  const endOfDay = new Date(currentTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  const remainingMs = endOfDay.getTime() - currentTime.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // 시간대별 아이콘 및 메시지
  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return Coffee; // 오전
    if (hour >= 12 && hour < 18) return Clock; // 오후
    if (hour >= 18 && hour < 22) return Sunset; // 저녁
    return Moon; // 밤
  };

  const getTimeMessage = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return '좋은 아침입니다';
    if (hour >= 12 && hour < 18) return '좋은 오후입니다';
    if (hour >= 18 && hour < 22) return '좋은 저녁입니다';
    return '편안한 밤 되세요';
  };

  const formatRemainingTime = () => {
    if (remainingHours > 0) {
      return `${remainingHours}시간 ${remainingMins}분`;
    }
    return `${remainingMins}분`;
  };

  const TimeIcon = getTimeIcon();

  return (
    <div className={cn(
      'p-4 mx-4 mb-4 rounded-lg',
      'bg-gradient-to-r from-primary/5 to-primary/10',
      'border border-primary/20',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <TimeIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-lg font-semibold text-foreground">
              {currentTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
            <div className="text-sm text-muted-foreground">
              {getTimeMessage()}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-foreground">
            하루 중 {formatRemainingTime()} 남음
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round((remainingMinutes / (24 * 60)) * 100)}% 남음
          </div>
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-3 w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.max(0, 100 - (remainingMinutes / (24 * 60)) * 100)}%` 
          }}
        />
      </div>
    </div>
  );
};

export default RemainingTimeIndicator;