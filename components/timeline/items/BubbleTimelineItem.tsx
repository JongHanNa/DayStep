'use client';

import React, { useMemo } from 'react';
import { TimelineItem } from '@/types/timeline-view';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BubbleTimelineItemProps {
  item: TimelineItem;
  prevItem: TimelineItem | null;
  nextItem: TimelineItem | null;
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
  nextItem,
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

  // 시작/종료 시간 (원본)
  const originalStartTime = item.startTime ? new Date(item.startTime) : null;
  const originalEndTime = item.endTime ? new Date(item.endTime) : null;

  // 같은 날인지 확인하는 함수
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // 시간 정규화: startTime과 endTime을 같은 날로 변환
  // (반복 할일의 경우 endTime이 반복 종료일로 설정되어 있어서 정규화 필요)
  const startTime = originalStartTime;
  const endTime = useMemo(() => {
    if (!originalStartTime || !originalEndTime) return null;

    // 이미 같은 날이면 그대로 사용
    if (isSameDay(originalStartTime, originalEndTime)) {
      return originalEndTime;
    }

    // 다른 날이면 startTime의 날짜에 endTime의 시간을 적용
    const normalized = new Date(
      originalStartTime.getFullYear(),
      originalStartTime.getMonth(),
      originalStartTime.getDate(),
      originalEndTime.getHours(),
      originalEndTime.getMinutes(),
      originalEndTime.getSeconds()
    );

    console.log(`🔧 [${item.title}] 시간 정규화:`, {
      원본_endTime: originalEndTime.toISOString(),
      정규화_endTime: normalized.toISOString()
    });

    return normalized;
  }, [originalStartTime, originalEndTime, item.title]);

  // 할일 시간 간격(분) 계산
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 10; // 기본값 10분

    // 디버깅: 실제 시간 데이터 출력
    console.log(`⏰ [${item.title}] 시간 데이터:`, {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sameDay: isSameDay(startTime, endTime)
    });

    // 같은 날이 아니면 기본값 (반복 할일 등의 경우)
    if (!isSameDay(startTime, endTime)) {
      console.warn(`⚠️ [${item.title}] 시작/종료가 다른 날 → 기본값 사용`);
      return 10;
    }

    const minutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));

    // 비정상 값 체크 (24시간 = 1440분 초과 또는 음수)
    if (minutes > 1440 || minutes < 0) {
      console.error(`❌ [${item.title}] 비정상 시간: ${minutes}분 → 기본값 사용`);
      return 10;
    }

    return Math.max(1, minutes); // 최소 1분
  }, [startTime, endTime, item.title]);

  // 다음 할일까지의 간격(분) 계산
  const gapMinutes = useMemo(() => {
    if (!endTime || !nextItem?.startTime) return 10; // 기본 간격 10분

    const originalNextStart = new Date(nextItem.startTime);

    // 다음 할일 시작 시간도 현재 할일 종료 날짜 기준으로 정규화
    const nextStart = isSameDay(endTime, originalNextStart)
      ? originalNextStart
      : new Date(
          endTime.getFullYear(),
          endTime.getMonth(),
          endTime.getDate(),
          originalNextStart.getHours(),
          originalNextStart.getMinutes(),
          originalNextStart.getSeconds()
        );

    // 디버깅: 실제 간격 데이터 출력
    console.log(`🔗 [${item.title} → ${nextItem.title}] 간격 데이터:`, {
      currentEnd: endTime.toISOString(),
      원본_nextStart: originalNextStart.toISOString(),
      정규화_nextStart: nextStart.toISOString(),
      sameDay: isSameDay(endTime, nextStart)
    });

    const gap = Math.round((nextStart.getTime() - endTime.getTime()) / (60 * 1000));

    // 비정상 값 체크 (24시간 = 1440분 초과 또는 음수)
    if (gap > 1440 || gap < 0) {
      console.error(`❌ [${item.title} → ${nextItem.title}] 비정상 간격: ${gap}분 → 기본값 사용`);
      return 10;
    }

    return Math.max(1, gap); // 최소 1분
  }, [endTime, nextItem, item.title]);

  // 버블 높이 계산 (10분 단위로 20px씩 증가, 최대 200px)
  const bubbleHeight = useMemo(() => {
    const baseHeight = 64; // 1-10분: 64px (원형)

    // 11분 이상일 때만 추가 높이 적용
    if (durationMinutes <= 10) {
      console.log(`🎈 [${item.title}] 원형 버블:`, { durationMinutes, height: baseHeight });
      return baseHeight;
    }

    // 10분 초과분에 대해 10분당 20px 추가
    // 예: 11-20분 → 20px 추가 → 84px
    //     21-30분 → 40px 추가 → 104px
    //     31-40분 → 60px 추가 → 124px
    const extraMinutes = durationMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 20;
    const finalHeight = Math.min(baseHeight + extraHeight, 200); // 최대 200px

    console.log(`🎈 [${item.title}] 타원형 버블:`, {
      durationMinutes,
      extraMinutes,
      extraHeight,
      finalHeight
    });

    return finalHeight;
  }, [durationMinutes, item.title]);

  // 버블 너비 (고정)
  const bubbleWidth = 64;

  // borderRadius 계산 (타원형 효과)
  const borderRadius = useMemo(() => {
    if (durationMinutes <= 10) return '50%'; // 완전한 원형
    // 타원형: 가로 반지름 / 세로 반지름
    return `${bubbleWidth / 2}px / ${Math.min(bubbleHeight / 2, bubbleWidth / 2)}px`;
  }, [durationMinutes, bubbleHeight]);

  // 연결 막대 높이 계산 (간격에 비례, 최대 200px)
  const connectorHeight = useMemo(() => {
    const baseHeight = 16; // 1-10분: 16px (기본)

    // 11분 이상일 때만 추가 높이 적용
    if (gapMinutes <= 10) {
      console.log(`📏 [${item.title}] 연결 막대 (짧음):`, { gapMinutes, height: baseHeight, nextItem: nextItem?.title });
      return baseHeight;
    }

    // 10분 초과분에 대해 10분당 20px 추가
    // 예: 11-20분 → 20px 추가 → 36px
    //     21-30분 → 40px 추가 → 56px
    //     31-40분 → 60px 추가 → 76px
    const extraMinutes = gapMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 20;
    const finalHeight = Math.min(baseHeight + extraHeight, 200); // 최대 200px

    console.log(`📏 [${item.title}] 연결 막대 (긴):`, {
      gapMinutes,
      extraMinutes,
      extraHeight,
      finalHeight,
      nextItem: nextItem?.title
    });

    return finalHeight;
  }, [gapMinutes, item.title, nextItem?.title]);

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

  // 버블 스타일 결정 (색상 + 크기)
  const bubbleStyle = useMemo(() => {
    const baseStyle = {
      width: `${bubbleWidth}px`,
      height: `${bubbleHeight}px`,
      borderRadius: borderRadius,
    };

    // 진행 중이거나 완료된 경우 할일 색상
    if (progressPercentage > 0) {
      return {
        ...baseStyle,
        backgroundColor: itemColor,
        borderColor: itemColor,
      };
    }

    // 아직 시작 전이면 회색
    return {
      ...baseStyle,
      backgroundColor: '#E5E5E5',
      borderColor: '#E5E5E5',
    };
  }, [progressPercentage, itemColor, bubbleWidth, bubbleHeight, borderRadius]);

  // 드래그 중 변경된 시간 계산
  const displayStartTime = useMemo(() => {
    if (!startTime) return null;
    if (isDragging && dragOffset !== 0) {
      const minutesChange = Math.round(dragOffset);
      return new Date(startTime.getTime() + minutesChange * 60 * 1000);
    }
    return startTime;
  }, [startTime, isDragging, dragOffset]);

  const displayEndTime = useMemo(() => {
    if (!endTime) return null;
    if (isDragging && dragOffset !== 0) {
      const minutesChange = Math.round(dragOffset);
      return new Date(endTime.getTime() + minutesChange * 60 * 1000);
    }
    return endTime;
  }, [endTime, isDragging, dragOffset]);

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
        'relative flex items-center gap-4 py-2',
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
      {/* 왼쪽: 버블 아이콘 영역 (연결 막대는 하단에만) */}
      <div className="relative flex items-center justify-center" style={{ width: '64px' }}>
        {/* 드래그 중일 때만 시작 시간 표시 - 버블 상단 (absolute) */}
        {isDragging && displayStartTime && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
            {formatTime(displayStartTime)}
          </div>
        )}

        {/* 버블 아이콘 - 카드와 정렬되는 기준점! */}
        <div
          className="flex items-center justify-center transition-all duration-300"
          style={bubbleStyle}
        >
          <IconComponent className={cn('w-8 h-8', progressPercentage > 0 ? 'text-white' : 'text-gray-500')} />
        </div>

        {/* 드래그 중일 때만 종료 시간 표시 - 버블 하단 (absolute) */}
        {isDragging && displayEndTime && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
            {formatTime(displayEndTime)}
          </div>
        )}

        {/* 하단 연결 막대 - absolute로 버블 아래에 배치 (항상 표시) */}
        {nextItem && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0.5"
            style={{
              height: `${connectorHeight}px`,
              backgroundColor: progressPercentage >= 100 ? itemColor : '#E5E5E5',
              transition: 'background-color 0.3s ease',
            }}
          />
        )}
      </div>

      {/* 오른쪽: 할일 카드 - 버블과 중앙 정렬! */}
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
