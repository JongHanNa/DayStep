'use client';

import React, { memo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeGapIndicatorProps {
  startTime: Date;
  endTime: Date;
  onAddTask: () => void;
}

// 간격 표시 컴포넌트 (할일 간 간격용) - 미니멀 디자인
const TimeGapIndicator = memo(({
  startTime,
  endTime,
  onAddTask
}: TimeGapIndicatorProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const diffMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (diffMinutes < 20) return null;

  return (
    <div
      className="my-2 mx-4 group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAddTask}
    >
      {/* 미니멀한 점선 구분선 */}
      <div className="flex items-center justify-center relative">
        <div className={`
          w-full h-px border-t-2 border-dashed transition-all duration-200
          ${isHovered
            ? 'border-blue-300 dark:border-blue-500'
            : 'border-gray-300 dark:border-gray-600'
          }
        `} />

        {/* 중앙 시간 표시 도트 */}
        <div className={`
          absolute bg-white dark:bg-gray-900 px-2 transition-all duration-200
          ${isHovered ? 'scale-105' : ''}
        `}>
          <div className={`
            w-2 h-2 rounded-full transition-all duration-200
            ${isHovered
              ? 'bg-blue-400 dark:bg-blue-500 shadow-lg'
              : 'bg-gray-400 dark:bg-gray-500'
            }
          `} />
        </div>
      </div>

      {/* 시간 정보와 버튼 */}
      <div className="flex items-center justify-between mt-1 px-1">
        <div className={`
          text-xs transition-all duration-200 font-medium
          ${isHovered
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-500 dark:text-gray-400'
          }
        `}>
          <span>{hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`} 여유</span>
          {isHovered && (
            <span className="ml-2 text-xs opacity-75">클릭하여 할일 추가</span>
          )}
        </div>

        <Button
          size="sm"
          variant="ghost"
          className={`
            transition-all duration-200 h-6 w-6 p-0 rounded-full
            ${isHovered
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 scale-110'
              : 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800/20'
            }
          `}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
});

TimeGapIndicator.displayName = 'TimeGapIndicator';

export default TimeGapIndicator;