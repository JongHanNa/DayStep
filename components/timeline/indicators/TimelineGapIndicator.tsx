'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineGapIndicatorProps {
  startTime: Date;
  endTime: Date;
  className?: string;
  onAddTask?: (startTime: Date, endTime: Date) => void;
}

const TimelineGapIndicator: React.FC<TimelineGapIndicatorProps> = ({
  startTime,
  endTime,
  className,
  onAddTask
}) => {
  // 시간 차이 계산
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  // 시간 포맷팅
  const formatDuration = () => {
    if (diffHours > 0 && remainingMinutes > 0) {
      return `${diffHours}시간 ${remainingMinutes}분`;
    } else if (diffHours > 0) {
      return `${diffHours}시간`;
    } else {
      return `${remainingMinutes}분`;
    }
  };

  // 20분 미만은 표시하지 않음
  if (diffMinutes < 20) {
    return null;
  }

  const handleAddTask = () => {
    onAddTask?.(startTime, endTime);
  };

  return (
    <div className={cn(
      'relative py-4 px-6 my-2 mx-4',
      'border border-dashed border-muted-foreground/30',
      'rounded-lg bg-muted/20 hover:bg-muted/40',
      'transition-all duration-200 group',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted-foreground/10">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">
              {formatDuration()} 계획 없음
            </div>
            <div className="text-xs text-muted-foreground/70">
              {startTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })} - {endTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
          </div>
        </div>

        {onAddTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddTask}
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'h-8 w-8 p-0 rounded-full',
              'hover:bg-primary hover:text-primary-foreground'
            )}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 상단 연결선 */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-4 bg-muted-foreground/30" />
      </div>

      {/* 하단 연결선 */}
      <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-4 bg-muted-foreground/30" />
      </div>
    </div>
  );
};

export default TimelineGapIndicator;