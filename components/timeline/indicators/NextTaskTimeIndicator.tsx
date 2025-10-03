'use client';

import React, { memo, useState, useEffect } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NextTaskTimeIndicatorProps {
  nextTaskTime: Date;
  nextTaskTitle?: string;
  onAddTask: () => void;
}

// 다음 작업까지 남은 시간 표시 컴포넌트
const NextTaskTimeIndicator = memo(({ 
  nextTaskTime, 
  nextTaskTitle, 
  onAddTask 
}: NextTaskTimeIndicatorProps) => {
  const [now, setNow] = useState(new Date());
  
  // 1초마다 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const diffMinutes = Math.floor((nextTaskTime.getTime() - now.getTime()) / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (diffMinutes < 20) return null;
  
  return (
    <div className="my-2 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-brand" />
            <div>
              <p className="text-base font-semibold text-brand">
                {nextTaskTitle ? `다음 작업까지` : '다음 작업까지'}
              </p>
              <p className="text-sm text-brand/80">
                {hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`} 남음
              </p>
            </div>
          </div>
          {nextTaskTitle && (
            <div className="block">
              <p className="text-sm text-brand/70">
                → {nextTaskTitle}
              </p>
            </div>
          )}
        </div>
        <Button
          onClick={onAddTask}
          size="sm"
          variant="ghost"
          className="flex items-center gap-1 text-brand hover:bg-brand-light"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

NextTaskTimeIndicator.displayName = 'NextTaskTimeIndicator';

export default NextTaskTimeIndicator;