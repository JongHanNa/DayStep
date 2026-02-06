'use client';

import React from 'react';

interface TimeProgressBarProps {
  /** 진행률 (0-100) */
  percent: number;
  /** 막대 높이 */
  height?: 'sm' | 'md' | 'lg';
  /** 색상 테마 */
  variant?: 'warning' | 'success' | 'error' | 'primary';
  /** 애니메이션 활성화 */
  animated?: boolean;
  /** 추가 클래스 */
  className?: string;
}

const heightMap = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const variantMap = {
  warning: 'bg-warning',
  success: 'bg-success',
  error: 'bg-error',
  primary: 'bg-primary',
};

const variantBgMap = {
  warning: 'bg-warning/20',
  success: 'bg-success/20',
  error: 'bg-error/20',
  primary: 'bg-primary/20',
};

/**
 * 시간 진행률을 표시하는 프로그레스 바 컴포넌트
 */
export function TimeProgressBar({
  percent,
  height = 'sm',
  variant = 'warning',
  animated = true,
  className = '',
}: TimeProgressBarProps) {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={`w-full rounded-full overflow-hidden ${heightMap[height]} ${variantBgMap[variant]} ${className}`}
    >
      <div
        className={`${heightMap[height]} ${variantMap[variant]} rounded-full transition-all duration-300 ease-out ${
          animated ? 'animate-pulse' : ''
        }`}
        style={{ width: `${clampedPercent}%` }}
      />
    </div>
  );
}
