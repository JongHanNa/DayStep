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
  // 버블 위치 계산을 위한 ref
  const bubbleWrapperRef = React.useRef<HTMLDivElement>(null);

  // 버블 너비 (고정) - useMemo보다 먼저 선언
  const bubbleWidth = 64;

  // 아이콘 결정
  const IconComponent = useMemo(() => {
    // Todo 타입에서 아이콘 정보 가져오기
    const iconName = item.type === 'todo' ? item.data.icon : null;
    if (iconName && iconName in Icons) {
      return Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
    }
    return Icons.Circle;
  }, [item.type, item.data]);

  // 버블의 화면 절대 좌표 계산
  const bubbleFixedPosition = useMemo(() => {
    if (!isDragging || !bubbleWrapperRef.current) return null;

    const rect = bubbleWrapperRef.current.getBoundingClientRect();
    return {
      left: rect.left, // 원래 위치 그대로 사용
      top: rect.top + dragOffset,
      centerX: rect.left + bubbleWidth / 2, // 시간 표시 중앙 정렬용
    };
  }, [isDragging, dragOffset]);

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

    // 반복 할일인 경우에만 정규화 (일반 할일은 다음날 종료 허용)
    if (item.type === 'todo' && item.data.recurrence_pattern !== 'none') {
      // 다른 날이면 startTime의 날짜에 endTime의 시간을 적용
      const normalized = new Date(
        originalStartTime.getFullYear(),
        originalStartTime.getMonth(),
        originalStartTime.getDate(),
        originalEndTime.getHours(),
        originalEndTime.getMinutes(),
        originalEndTime.getSeconds()
      );
      return normalized;
    }

    // 일반 할일은 원본 endTime 사용
    return originalEndTime;
  }, [originalStartTime, originalEndTime, item.type, item.data]);

  // 할일 시간 간격(분) 계산
  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 10; // 기본값 10분

    let minutes = Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000));

    // 음수면 다음날 종료 (24시간 더하기)
    if (minutes < 0) {
      minutes += 24 * 60; // 1440분 추가
    }

    // 24시간 초과 체크 (반복 할일의 비정상 값)
    if (minutes > 1440) {
      return 10;
    }

    return Math.max(1, minutes); // 최소 1분
  }, [startTime, endTime]);

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

    const gap = Math.round((nextStart.getTime() - endTime.getTime()) / (60 * 1000));

    // 비정상 값 체크 (24시간 = 1440분 초과 또는 음수)
    if (gap > 1440 || gap < 0) {
      return 10;
    }

    return Math.max(1, gap); // 최소 1분
  }, [endTime, nextItem]);

  // 버블 높이 계산 (10분 단위로 10px씩 증가, 최대 500px)
  const bubbleHeight = useMemo(() => {
    const baseHeight = 64; // 1-10분: 64px (원형)

    // 11분 이상일 때만 추가 높이 적용
    if (durationMinutes <= 10) return baseHeight;

    // 10분 초과분에 대해 10분당 10px 추가
    // 예: 11-20분 → 10px 추가 → 74px
    //     1시간(60분) → 50분 추가 → 50px 추가 → 114px
    //     7시간(420분) → 410분 추가 → 410px 추가 → 474px
    const extraMinutes = durationMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 10;
    return Math.min(baseHeight + extraHeight, 500); // 최대 500px (약 7.5시간)
  }, [durationMinutes]);

  // borderRadius 계산 (타원형 효과)
  const borderRadius = useMemo(() => {
    if (durationMinutes <= 10) return '50%'; // 완전한 원형
    // 타원형: 가로 반지름 / 세로 반지름
    return `${bubbleWidth / 2}px / ${Math.min(bubbleHeight / 2, bubbleWidth / 2)}px`;
  }, [durationMinutes, bubbleHeight]);

  // 연결 막대 높이 계산 (간격에 비례, 최대 500px)
  const connectorHeight = useMemo(() => {
    const baseHeight = 16; // 1-10분: 16px (기본)

    // 11분 이상일 때만 추가 높이 적용
    if (gapMinutes <= 10) return baseHeight;

    // 10분 초과분에 대해 10분당 10px 추가 (버블과 동일한 비율)
    // 예: 11-20분 → 10px 추가 → 26px
    //     1시간(60분) → 50분 추가 → 66px
    //     3시간(180분) → 170분 추가 → 186px
    const extraMinutes = gapMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 10;
    return Math.min(baseHeight + extraHeight, 500); // 최대 500px
  }, [gapMinutes]);

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

  // 연결 막대 진행률 계산 (이전 할일 종료 ~ 현재 할일 시작)
  const connectorProgressPercentage = useMemo(() => {
    if (!isToday || !prevItem?.endTime || !startTime) return 0;

    const now = currentTime.getTime();
    const prevEnd = new Date(prevItem.endTime).getTime();
    const currStart = startTime.getTime();

    if (now < prevEnd) return 0;
    if (now >= currStart) return 100;

    return Math.round(((now - prevEnd) / (currStart - prevEnd)) * 100);
  }, [isToday, prevItem, startTime, currentTime]);

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

  // 버블 스타일 결정 (색상 + 크기 + 점진적 색칠)
  const bubbleStyle = useMemo(() => {
    const baseStyle = {
      width: `${bubbleWidth}px`,
      height: `${bubbleHeight}px`,
      borderRadius: borderRadius,
    };

    // 진행률에 따라 점진적으로 색칠 (위에서 아래로)
    if (progressPercentage > 0) {
      return {
        ...baseStyle,
        background: `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${progressPercentage}%, #E5E5E5 ${progressPercentage}%, #E5E5E5 100%)`,
      };
    }

    // 아직 시작 전이면 회색
    return {
      ...baseStyle,
      backgroundColor: '#E5E5E5',
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

  // 다음날 종료 여부 판단
  const isNextDay = useMemo(() => {
    if (!startTime || !endTime) return false;

    // 종료 시간이 시작 시간보다 작으면 다음날 종료
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();

    return endMinutes < startMinutes;
  }, [startTime, endTime]);

  // 시간 포맷
  const formatTime = (date: Date | null) => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <>
      {/* 클릭 가능한 영역: 버블 + 카드만 포함 */}
      <div
        className={cn(
          'relative flex items-start gap-4',
          'cursor-pointer select-none transition-all',
          // hover 배경 제거 - 카드에서만 hover 효과 적용하여 연결선 가려짐 방지
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* 왼쪽: 버블 영역 */}
        <div className="flex flex-col" style={{ width: '64px' }}>
          {/* 버블과 할일 카드가 정렬될 영역 */}
          <div ref={bubbleWrapperRef} className="relative flex items-center" style={{ height: `${bubbleHeight}px` }}>
            {/* 버블 아이콘 (드래그 시 fixed positioning) */}
            <div
              className="flex items-center justify-center"
              style={{
                position: isDragging && bubbleFixedPosition ? 'fixed' : 'absolute',
                left: isDragging && bubbleFixedPosition ? `${bubbleFixedPosition.left}px` : 0,
                top: isDragging && bubbleFixedPosition ? `${bubbleFixedPosition.top}px` : 0,
                width: `${bubbleWidth}px`,
                height: `${bubbleHeight}px`,
                transform: !isDragging ? undefined : undefined,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                zIndex: isDragging ? 100 : undefined,
              }}
            >
              {/* 버블 아이콘 */}
              <div
                className="flex items-center justify-center transition-all duration-300"
                style={bubbleStyle}
              >
                <IconComponent className={cn('w-8 h-8', progressPercentage > 0 ? 'text-white' : 'text-gray-500')} />
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 할일 카드 (버블과 같은 높이로 정렬) */}
        <div
          className="flex items-center flex-1"
          style={{ height: `${bubbleHeight}px` }}
        >
          <div className={cn(
            "bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 w-full shadow-sm transition-all",
            !isDragging && "hover:shadow-md hover:bg-gray-200 dark:hover:bg-gray-700",
            isDragging && "opacity-0"
          )}>
            {/* 시간 표시 - 할일 제목 위 */}
            {startTime && endTime && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                {formatTime(startTime)} ~ {formatTime(endTime)}
                {isNextDay && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">+1</span>}
                {item.type === 'todo' && item.data.recurrence_pattern !== 'none' && ' 🔄'}
              </div>
            )}

            <h3 className="font-medium text-base text-gray-900 dark:text-gray-100">
              {item.title}
            </h3>
          </div>
        </div>
      </div>

      {/* 연결 간격 공간 (클릭 불가능 영역) - 별도 div로 분리 */}
      {nextItem && (
        <div className="relative flex items-start gap-4">
          {/* 왼쪽: 간격 공간 (버블 너비와 동일) */}
          <div className="relative" style={{ width: '64px', height: `${connectorHeight}px` }}>
            {/* 연결 막대 제거 - 간격 확보용 투명 공간만 유지 */}
          </div>
          {/* 오른쪽: 빈 공간 (레이아웃 유지) */}
          <div className="flex-1"></div>
        </div>
      )}

      {/* 드래그 중 시간 표시 (fixed position으로 항상 위에 표시) */}
      {isDragging && bubbleFixedPosition && displayStartTime && (
        <div
          className="text-xs font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300"
          style={{
            position: 'fixed',
            left: `${bubbleFixedPosition.centerX}px`,
            top: `${bubbleFixedPosition.top - 30}px`,
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {formatTime(displayStartTime)}
        </div>
      )}

      {isDragging && bubbleFixedPosition && displayEndTime && (
        <div
          className="text-xs font-semibold whitespace-nowrap text-gray-700 dark:text-gray-300"
          style={{
            position: 'fixed',
            left: `${bubbleFixedPosition.centerX}px`,
            top: `${bubbleFixedPosition.top + bubbleHeight + 8}px`,
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '4px 10px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {formatTime(displayEndTime)}
        </div>
      )}
    </>
  );
};
