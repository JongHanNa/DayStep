import React from 'react';
import { TimerType } from '@/types/pomodoro';
import { cn } from '@/lib/utils';

interface TimerDisplayProps {
  /** Remaining time in milliseconds */
  remainingTime: number;
  /** Timer type */
  timerType: TimerType;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Whether the timer is paused */
  isPaused: boolean;
  /** Additional CSS classes */
  className?: string;
}

const TIMER_TYPE_LABELS: Record<TimerType, string> = {
  POMODORO: '포모도로',
  SHORT_BREAK: '짧은 휴식',
  LONG_BREAK: '긴 휴식',
};

const TIMER_TYPE_COLORS: Record<TimerType, string> = {
  POMODORO: 'text-red-600 dark:text-red-400',
  SHORT_BREAK: 'text-green-600 dark:text-green-400',
  LONG_BREAK: 'text-blue-600 dark:text-blue-400',
};

export const TimerDisplay = React.memo<TimerDisplayProps>(({
  remainingTime,
  timerType,
  isRunning,
  isPaused,
  className,
}) => {
  const formatTime = (timeInMs: number): string => {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    if (!isRunning) return '대기 중';
    if (isPaused) return '일시정지';
    return '진행 중';
  };

  const getStatusColor = (): string => {
    if (!isRunning) return 'text-muted-foreground';
    if (isPaused) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className={cn('text-center space-y-2', className)}>
      {/* Timer Type */}
      <div className={cn(
        'text-sm font-medium uppercase tracking-wide',
        TIMER_TYPE_COLORS[timerType]
      )}>
        {TIMER_TYPE_LABELS[timerType]}
      </div>
      
      {/* Time Display */}
      <div className="text-4xl md:text-5xl font-mono font-bold text-foreground">
        {formatTime(remainingTime)}
      </div>
      
      {/* Status */}
      <div className={cn(
        'text-xs font-medium uppercase tracking-wider',
        getStatusColor()
      )}>
        {getStatusText()}
      </div>
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay;