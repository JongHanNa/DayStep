import React from 'react';
import { CircularProgress } from './CircularProgress';
import { TimerDisplay } from './TimerDisplay';
import { TimerType } from '@/types/pomodoro';
import { cn } from '@/lib/utils';

interface PomodoroDisplayProps {
  /** Current progress (0-1) */
  progress: number;
  /** Remaining time in milliseconds */
  remainingTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Timer type */
  timerType: TimerType;
  /** Whether the timer is running */
  isRunning: boolean;
  /** Whether the timer is paused */
  isPaused: boolean;
  /** Size of the circular progress */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

const TIMER_TYPE_COLORS: Record<TimerType, string> = {
  POMODORO: '#ef4444', // Red
  SHORT_BREAK: '#10b981', // Green
  LONG_BREAK: '#3b82f6', // Blue
};

export const PomodoroDisplay = React.memo<PomodoroDisplayProps>(({
  progress,
  remainingTime,
  duration,
  timerType,
  isRunning,
  isPaused,
  size = 200,
  className,
}) => {
  const progressColor = TIMER_TYPE_COLORS[timerType];

  return (
    <div className={cn('flex flex-col items-center space-y-6', className)}>
      {/* Circular Progress with Timer Display */}
      <div className="relative">
        <CircularProgress
          progress={progress}
          size={size}
          strokeWidth={12}
          progressColor={progressColor}
          animationDuration={500}
          showGradient={false}
          className="drop-shadow-lg"
        >
          <TimerDisplay
            remainingTime={remainingTime}
            timerType={timerType}
            isRunning={isRunning}
            isPaused={isPaused}
            className="px-4"
          />
        </CircularProgress>
        
        {/* Pulse animation for active timer */}
        {isRunning && !isPaused && (
          <div 
            className="absolute inset-0 rounded-full opacity-20 animate-ping"
            style={{
              backgroundColor: progressColor,
              width: size,
              height: size,
            }}
          />
        )}
      </div>
      
      {/* Progress Percentage */}
      <div className="text-center">
        <div className="text-2xl font-bold text-foreground">
          {Math.round(progress * 100)}%
        </div>
        <div className="text-sm text-muted-foreground">
          완료
        </div>
      </div>
    </div>
  );
});

PomodoroDisplay.displayName = 'PomodoroDisplay';

export default PomodoroDisplay;