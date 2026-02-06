'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PomodoroTimerProps {
  /** 현재 진행률 (0-1) */
  progress: number;
  /** 크기 (기본: 24) */
  size?: number;
  /** 클래스명 */
  className?: string;
  /** 활성화 여부 */
  isActive?: boolean;
  /** 완료 여부 */
  isCompleted?: boolean;
  /** 중앙에 표시할 아이콘 요소 */
  iconElement?: React.ReactNode;
  /** 커스텀 색상 (hex 형식, 예: #DBAC6C) */
  color?: string;
}

/**
 * 포모도로 타이머 원형 진행률 표시 컴포넌트
 */
export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  progress,
  size = 24,
  className,
  isActive = false,
  isCompleted = false,
  iconElement,
  color
}) => {
  // SVG 관련 계산
  const strokeWidth = 4; // stroke 두께를 4로 증가 (더 굵게)
  const radius = (size - strokeWidth * 2) / 2; // stroke 두께를 고려한 반지름
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  // 진행률에 따른 색상 결정 - 그린 계열로 복원
  const progressColor = useMemo(() => {
    if (isCompleted) return '#22C55E'; // green-500 (완료 시)
    if (isActive) return '#22C55E'; // green-500 (활성화 시 - 그린 계열)
    return '#E5E7EB'; // gray-200 (비활성)
  }, [isActive, isCompleted]);

  return (
    <div 
      className={cn(
        'relative flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* 배경 원 */}
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* 배경 원 - 활성화된 경우에만 연한 그린으로 표시 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isActive ? "#86EFAC" : "transparent"}
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-60"
        />
        
        {/* 진행률 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-300 ease-out',
            isActive && 'drop-shadow-sm'
          )}
          style={{
            filter: isActive ? `drop-shadow(0 0 2px ${progressColor}40)` : undefined
          }}
        />
      </svg>
      
      {/* 중앙 아이콘/인디케이터 */}
      <div 
        className={cn(
          'absolute inset-0 flex items-center justify-center text-xs font-medium transition-all duration-300',
          isCompleted && 'text-green-600',
          isActive && !isCompleted && 'text-current',
          !isActive && !isCompleted && 'text-gray-400'
        )}
      >
        {iconElement ? (
          // 커스텀 아이콘이 제공된 경우 - 배경 색상과 함께 표시
          <div 
            className={cn(
              "flex items-center justify-center rounded-full",
              "text-black" // 아이콘은 항상 검은색
            )}
            style={{
              backgroundColor: color || '#E5E7EB', // 배경색을 할일 색상 또는 기본 회색으로
              width: size - strokeWidth * 3, // 게이지와 겹치지 않도록 여백 조정
              height: size - strokeWidth * 3,
            }}
          >
            {iconElement}
          </div>
        ) : isCompleted ? (
          // 완료 시 체크 마크
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        ) : isActive ? (
          // 활성화 시 진행률 퍼센트 (아이콘이 없는 경우만)
          <span className="text-[8px] leading-none">
            {Math.round(progress * 100)}
          </span>
        ) : (
          // 비활성 시 도트
          <div className="w-1 h-1 bg-current rounded-full opacity-60" />
        )}
      </div>
      
      {/* 활성화 시 배경 효과 (펄스 제거) */}
      {isActive && !isCompleted && (
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: progressColor,
            opacity: 0.05
          }}
        />
      )}
    </div>
  );
};

export default PomodoroTimer;