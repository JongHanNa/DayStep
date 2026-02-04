'use client';

import React from 'react';
import type { CircularProgressTimerProps } from '@/types/adhd';
import { formatTime } from '@/types/adhd';

/**
 * 원형 프로그레스 타이머 컴포넌트
 *
 * 경과/남은 시간을 원형 프로그레스로 표시합니다.
 */
export function CircularProgressTimer({
  progress,
  elapsedTime,
  remainingTime,
  displayMode,
  size = 200,
  strokeWidth = 12,
}: CircularProgressTimerProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 배경 원 */}
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-base-300"
        />
      </svg>

      {/* 프로그레스 원 */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-[stroke-dashoffset] duration-1000"
        />
      </svg>

      {/* 시간 표시 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {displayMode === 'elapsed' && (
          <>
            <span className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-xs text-base-content/50 mt-1">경과</span>
          </>
        )}
        {displayMode === 'remaining' && (
          <>
            <span className="text-4xl font-mono font-bold tabular-nums">
              {formatTime(remainingTime)}
            </span>
            <span className="text-xs text-base-content/50 mt-1">남음</span>
          </>
        )}
        {displayMode === 'both' && (
          <>
            <span className="text-3xl font-mono font-bold tabular-nums">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-xs text-base-content/50 my-1">경과</span>
            <span className="text-lg font-mono tabular-nums text-base-content/70">
              -{formatTime(remainingTime)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default CircularProgressTimer;
