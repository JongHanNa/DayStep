import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  /** Progress value between 0 and 1 */
  progress: number;
  /** Size of the progress circle in pixels */
  size?: number;
  /** Stroke width of the progress circle */
  strokeWidth?: number;
  /** Color of the progress stroke */
  progressColor?: string;
  /** Color of the background track */
  trackColor?: string;
  /** Content to display in the center */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Animation duration in milliseconds */
  animationDuration?: number;
  /** Show a gradient effect on the progress */
  showGradient?: boolean;
}

export const CircularProgress = React.memo<CircularProgressProps>(({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  progressColor = 'hsl(var(--primary))',
  trackColor = 'hsl(var(--muted))',
  children,
  className,
  animationDuration = 300,
  showGradient = true,
}) => {
  const circularProgressData = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressValue = Math.min(Math.max(progress, 0), 1);
    const strokeDashoffset = circumference - (progressValue * circumference);

    return {
      radius,
      circumference,
      strokeDashoffset,
      centerX: size / 2,
      centerY: size / 2,
      progressValue,
    };
  }, [size, strokeWidth, progress]);

  const gradientId = `circular-progress-gradient-${Math.random().toString(36).substr(2, 9)}`;

  const getProgressColor = (progress: number): string => {
    if (!showGradient) return progressColor;
    
    // Color transition based on progress
    if (progress < 0.3) return '#10b981'; // Green
    if (progress < 0.7) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const currentProgressColor = getProgressColor(circularProgressData.progressValue);

  return (
    <div 
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-labelledby="progress-title"
        role="progressbar"
        aria-valuenow={Math.round(circularProgressData.progressValue * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {showGradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentProgressColor} stopOpacity={0.8} />
              <stop offset="100%" stopColor={currentProgressColor} stopOpacity={1} />
            </linearGradient>
          </defs>
        )}
        
        {/* Background track */}
        <circle
          cx={circularProgressData.centerX}
          cy={circularProgressData.centerY}
          r={circularProgressData.radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        
        {/* Progress circle */}
        <circle
          cx={circularProgressData.centerX}
          cy={circularProgressData.centerY}
          r={circularProgressData.radius}
          stroke={showGradient ? `url(#${gradientId})` : currentProgressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circularProgressData.circumference}
          strokeDashoffset={circularProgressData.strokeDashoffset}
          strokeLinecap="round"
          className="transition-all ease-out"
          style={{
            transitionDuration: `${animationDuration}ms`,
          }}
        />
        
        {/* Glow effect for active progress */}
        {circularProgressData.progressValue > 0 && (
          <circle
            cx={circularProgressData.centerX}
            cy={circularProgressData.centerY}
            r={circularProgressData.radius}
            stroke={currentProgressColor}
            strokeWidth={strokeWidth / 2}
            fill="none"
            strokeDasharray={circularProgressData.circumference}
            strokeDashoffset={circularProgressData.strokeDashoffset}
            strokeLinecap="round"
            className="opacity-30 blur-sm transition-all ease-out"
            style={{
              transitionDuration: `${animationDuration}ms`,
            }}
          />
        )}
      </svg>
      
      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
});

CircularProgress.displayName = 'CircularProgress';

export default CircularProgress;