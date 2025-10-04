'use client';

import React, { useMemo } from 'react';
import { TimelineItem } from '@/types/timeline-view';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BubbleTimelineItemProps {
  item: TimelineItem;
  prevItem: TimelineItem | null;
  isDragging: boolean;
  dragOffset: number;
  isToday: boolean;
  currentTime: Date;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
}

/**
 * 버블 스타일 타임라인 아이템 컴포넌트
 *
 * 주요 기능:
 * - 버블 아이콘 + 할일 제목 카드 형태
 * - 시간 진행에 따른 색상 변화 (회색 → 할일 색상)
 * - 롱프레스 드래그 지원
 */
export const BubbleTimelineItem: React.FC<BubbleTimelineItemProps> = ({
  item,
  prevItem,
  isDragging,
  dragOffset,
  isToday,
  currentTime,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}) => {
  // 아이콘 결정
  const IconComponent = useMemo(() => {
    // Todo 타입에서 아이콘 정보 가져오기
    const iconName = item.type === 'todo' ? item.data.icon : null;
    if (iconName && iconName in Icons) {
      return Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    }
    return Icons.Circle;
  }, [item.type, item.data]);

  // 할일 색상
  const itemColor = item.color || '#3B82F6';

  // 시작/종료 시간
  const startTime = item.startTime ? new Date(item.startTime) : null;
  const endTime = item.endTime ? new Date(item.endTime) : null;

  // 현재 시간 기준 진행률 계산 (0-100)
  const progressPercentage = useMemo(() => {
    if (!isToday || !startTime || !endTime) return 0;

    const now = currentTime.getTime();
    const start = startTime.getTime();
    const end = endTime.getTime();

    if (now < start) return 0;
    if (now >= end) return 100;

    return Math.round(((now - start) / (end - start)) * 100);
  }, [isToday, startTime, endTime, currentTime]);

  // 연결 막대 색상 결정 (이전 할일과의 연결)
  const connectorColor = useMemo(() => {
    if (!prevItem || !prevItem.endTime) return 'transparent';

    const prevEnd = new Date(prevItem.endTime);

    // 오늘이고 현재 시간이 이전 할일 종료 이후라면 이전 할일 색상
    if (isToday && currentTime.getTime() > prevEnd.getTime()) {
      return prevItem.color || '#3B82F6';
    }

    return 'transparent';
  }, [prevItem, isToday, currentTime]);

  // 버블 색상 결정
  const bubbleStyle = useMemo(() => {
    // 진행 중이거나 완료된 경우 할일 색상
    if (progressPercentage > 0) {
      return {
        backgroundColor: itemColor,
        borderColor: itemColor,
      };
    }

    // 아직 시작 전이면 회색
    return {
      backgroundColor: '#E5E5E5',
      borderColor: '#E5E5E5',
    };
  }, [progressPercentage, itemColor]);

  // 시간 포맷
  const formatTime = (date: Date | null) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 py-2',
        'cursor-pointer select-none transition-all',
        !isDragging && 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
      )}
      style={{
        transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        zIndex: isDragging ? 50 : undefined,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
    >
      {/* 왼쪽: 버블 아이콘 */}
      <div className="flex flex-col items-center" style={{ width: '64px' }}>
        {/* 이전 할일과의 연결 막대 */}
        {prevItem && (
          <div
            className="w-0.5 h-4"
            style={{
              backgroundColor: connectorColor || '#E5E5E5',
              transition: 'background-color 0.3s ease',
            }}
          />
        )}

        {/* 버블 아이콘 */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300"
          style={bubbleStyle}
        >
          <IconComponent className={cn('w-8 h-8', progressPercentage > 0 ? 'text-white' : 'text-gray-500')} />
        </div>

        {/* 드래그 중일 때만 시작 시간 표시 */}
        {isDragging && startTime && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            {formatTime(startTime)}
          </div>
        )}

        {/* 다음 할일과의 연결 막대 */}
        <div
          className="w-0.5 flex-1 min-h-4"
          style={{
            backgroundColor: progressPercentage >= 100 ? itemColor : '#E5E5E5',
            transition: 'background-color 0.3s ease',
          }}
        />

        {/* 드래그 중일 때만 종료 시간 표시 */}
        {isDragging && endTime && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-semibold">
            {formatTime(endTime)}
          </div>
        )}
      </div>

      {/* 오른쪽: 할일 카드 */}
      <div className={cn(
        "flex-1 min-h-16 flex items-center",
        isDragging && "opacity-0"
      )}>
        <div className={cn(
          "bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 w-full shadow-sm transition-shadow",
          !isDragging && "hover:shadow-md"
        )}>
          {/* 시간 표시 - 할일 제목 위 */}
          {startTime && endTime && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              {formatTime(startTime)} ~ {formatTime(endTime)} 🔄
            </div>
          )}

          <h3 className="font-medium text-base text-gray-900 dark:text-gray-100">
            {item.title}
          </h3>
        </div>
      </div>
    </div>
  );
};
