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
  currentDate: Date;  // viewing date (어제/오늘/내일 등)
  dateStatus: 'past' | 'today' | 'future';  // 부모로부터 전달받는 날짜 상태
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
  currentDate,  // viewing date (어제/오늘/내일 등)
  dateStatus,  // 부모로부터 전달받는 날짜 상태
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

    // ✅ 간격 그대로 반환 (0~10분은 동일한 간격으로 처리)
    return gap;
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
    const baseHeight = 16; // 0-10분: 16px (동일한 간격)

    // ✅ 0~10분 간격은 모두 동일한 16px 높이
    if (gapMinutes <= 10) return baseHeight;

    // 10분 초과분에 대해 10분당 10px 추가
    // 예: 11-20분 → 10px 추가 → 26px
    //     1시간(60분) → 50분 추가 → 66px
    //     12시간(720분) → 710분 추가 → 726px → 최대 500px 제한
    const extraMinutes = gapMinutes - 10;
    const extraHeight = Math.ceil(extraMinutes / 10) * 10;
    return Math.min(baseHeight + extraHeight, 500); // 최대 500px (약 8시간 간격)
  }, [gapMinutes]);

  // 다음 할일의 색상
  const nextItemColor = nextItem?.color || '#3B82F6';

  // 다음 할일의 시작 시간 기준 진행률 계산
  const nextProgressPercentage = useMemo(() => {
    if (!nextItem || !nextItem.startTime || !nextItem.endTime) return 0;

    const nextStartTime = new Date(nextItem.startTime);
    const nextEndTime = new Date(nextItem.endTime);

    // 날짜 상태에 따라 진행률 계산
    if (dateStatus === 'past') return 100; // 과거는 100%
    if (dateStatus === 'future') return 0; // 미래는 0%

    // 오늘: 현재 시간이 다음 할일 시작 시간 이전이면 0%
    const nowHour = currentTime.getHours();
    const nowMinute = currentTime.getMinutes();
    const nowTimeOfDay = nowHour * 60 + nowMinute;

    const nextStartHour = nextStartTime.getHours();
    const nextStartMinute = nextStartTime.getMinutes();
    const nextStartTimeOfDay = nextStartHour * 60 + nextStartMinute;

    if (nowTimeOfDay < nextStartTimeOfDay) return 0;

    // 이미 시작했으면 진행률 계산 (간단히 >0으로 처리)
    const nextEndHour = nextEndTime.getHours();
    const nextEndMinute = nextEndTime.getMinutes();
    const nextEndTimeOfDay = nextEndHour * 60 + nextEndMinute;

    if (nowTimeOfDay >= nextEndTimeOfDay) return 100;

    return Math.round(((nowTimeOfDay - nextStartTimeOfDay) / (nextEndTimeOfDay - nextStartTimeOfDay)) * 100);
  }, [nextItem, dateStatus, currentTime]);

  // 현재 시간 기준 진행률 계산 (0-100)
  // 크로스데이 할일 처리: currentDate 날짜의 시작(00:00)과 끝(23:59:59)을 기준으로 계산
  const progressPercentage = useMemo(() => {
    if (!startTime || !endTime) return 0;

    // currentDate (viewing date)의 00:00:00 ~ 23:59:59 범위 계산
    const viewingDate = new Date(currentDate);  // ✅ currentDate 사용
    const dayStart = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), viewingDate.getDate(), 0, 0, 0);
    const dayEnd = new Date(viewingDate.getFullYear(), viewingDate.getMonth(), viewingDate.getDate(), 23, 59, 59, 999);

    // 과거 날짜: 실제 현재 시간으로 진행률 계산
    // (반복 할일은 시간 정규화되어 있으므로 날짜 비교가 아닌 시간 비교 필요)
    if (dateStatus === 'past') {
      // 실제 현재 시간 (분 단위)
      const nowHour = currentTime.getHours();
      const nowMinute = currentTime.getMinutes();
      const nowTimeOfDay = nowHour * 60 + nowMinute;

      // 시작 시간 (분 단위)
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const startTimeOfDay = startHour * 60 + startMinute; // 0~1439 (분)

      // 종료 시간 (분 단위)
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      const endTimeOfDay = endHour * 60 + endMinute; // 0~1439 (분)

      // 크로스데이 할일 감지 (종료 시간 < 시작 시간)
      // 예: 22:30~05:30 → 1350분~330분
      if (endTimeOfDay < startTimeOfDay) {
        // 전체 길이: (어제 시작 ~ 23:59) + (오늘 00:00 ~ 종료)
        const totalDuration = (1439 - startTimeOfDay) + endTimeOfDay;

        // 현재 시간이 다음날 종료 시간 이후면 100%
        if (nowTimeOfDay >= endTimeOfDay) {
          if (item.title === '수면') {
            console.log('✅ [크로스데이] 이미 종료됨 → 100%');
          }
          return 100;
        }

        // 현재 시간이 다음날 (종료 전)
        // 진행: (어제 시작 ~ 23:59) + (오늘 00:00 ~ 현재)
        const progress = (1439 - startTimeOfDay) + nowTimeOfDay;
        const percentage = Math.round((progress / totalDuration) * 100);

        if (item.title === '수면') {
          console.log('✅ [크로스데이] 진행 중:', {
            어제부분: `${1439 - startTimeOfDay}분`,
            오늘부분: `${nowTimeOfDay}분`,
            전체진행: `${progress}분`,
            전체길이: `${totalDuration}분`,
            percentage: `${percentage}%`
          });
        }

        return percentage;
      }

      // 일반 할일: 과거 날짜는 100% 색칠
      if (item.title === '수면') {
        console.log('✅ [일반 할일] 과거 날짜 → 100%');
      }
      return 100;
    }

    // 미래 날짜: 0% (회색)
    if (dateStatus === 'future') return 0;

    // 오늘: 00:00 ~ 현재 시간까지의 진행률 (시간만 비교)
    if (dateStatus === 'today') {
      const nowHour = currentTime.getHours();
      const nowMinute = currentTime.getMinutes();
      const nowTimeOfDay = nowHour * 60 + nowMinute; // 현재 시간 (분)

      // 시작 시간 (분 단위)
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const startTimeOfDay = startHour * 60 + startMinute;

      // 종료 시간 (분 단위)
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();
      const endTimeOfDay = endHour * 60 + endMinute;

      // 크로스데이 할일 (예: 22:30~05:30+1)
      // 오늘 날짜 뷰에서는 "오늘 시작하는" 할일만 표시
      if (endTimeOfDay < startTimeOfDay) {
        // 아직 시작 전 (00:00 ~ startTime)
        if (nowTimeOfDay < startTimeOfDay) {
          return 0;
        }

        // 진행 중 (startTime ~ 23:59)
        const progress = nowTimeOfDay - startTimeOfDay;
        const duration = 1439 - startTimeOfDay;
        const percentage = Math.round((progress / duration) * 100);

        return percentage;
      }

      // 일반 할일: 시작 전이면 0%, 종료 후면 100%, 진행 중이면 비율
      if (nowTimeOfDay < startTimeOfDay) {
        if (item.title === '수면') {
          console.log('✅ [일반 할일] 시작 전 → 0%');
        }
        return 0;
      }

      if (nowTimeOfDay >= endTimeOfDay) {
        if (item.title === '수면') {
          console.log('✅ [일반 할일] 종료 후 → 100%');
        }
        return 100;
      }

      const percentage = Math.round(((nowTimeOfDay - startTimeOfDay) / (endTimeOfDay - startTimeOfDay)) * 100);

      if (item.title === '수면') {
        console.log('✅ [일반 할일] 진행 중:', {
          duration: `${endTimeOfDay - startTimeOfDay}분`,
          progress: `${nowTimeOfDay - startTimeOfDay}분`,
          percentage: `${percentage}%`
        });
      }

      return percentage;
    }

    return 0;
  }, [dateStatus, startTime, endTime, currentTime, currentDate]);


  // 연결 막대 진행률 계산 (현재 종료 ~ 다음 시작 사이)
  const connectorProgressPercentage = useMemo(() => {
    if (!nextItem || !endTime || !nextItem.startTime) return 0;

    // 조건 1: 현재 버블이 100% 완료되지 않았으면 연결 막대는 0%
    if (progressPercentage < 100) return 0;

    // 조건 2: 다음 버블이 이미 시작했으면 연결 막대는 100%
    if (nextProgressPercentage > 0) return 100;

    // 조건 3: 현재 종료 ~ 다음 시작 사이
    // 날짜 상태 확인
    if (dateStatus === 'past') return 100; // 과거는 100%
    if (dateStatus === 'future') return 0; // 미래는 0%

    // 오늘: 현재 시간 기준 진행률 계산
    const nowHour = currentTime.getHours();
    const nowMinute = currentTime.getMinutes();
    const nowTimeOfDay = nowHour * 60 + nowMinute;

    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const endTimeOfDay = endHour * 60 + endMinute;

    const nextStartTime = new Date(nextItem.startTime);
    const nextStartHour = nextStartTime.getHours();
    const nextStartMinute = nextStartTime.getMinutes();
    const nextStartTimeOfDay = nextStartHour * 60 + nextStartMinute;

    // 아직 현재 할일 종료 전이면 0%
    if (nowTimeOfDay < endTimeOfDay) return 0;

    // 다음 할일 시작 후면 100%
    if (nowTimeOfDay >= nextStartTimeOfDay) return 100;

    // 사이 구간: 진행률 계산
    const elapsed = nowTimeOfDay - endTimeOfDay;
    const total = nextStartTimeOfDay - endTimeOfDay;

    // total이 0이거나 음수면 0% 반환
    if (total <= 0) return 0;

    return Math.min(100, Math.round((elapsed / total) * 100));
  }, [progressPercentage, nextProgressPercentage, dateStatus, currentTime, endTime, nextItem]);

  // 연결 막대 색상 (그라데이션: 이전 색 → 다음 색)
  const connectorGradient = useMemo(() => {
    if (connectorProgressPercentage === 0) {
      // 아직 시작 전이면 회색
      return '#E5E5E5';
    }

    if (connectorProgressPercentage === 100) {
      // 완전히 완료되면 그라데이션 (이전 색 → 다음 색)
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} 50%, ${nextItemColor} 50%, ${nextItemColor} 100%)`;
    }

    // 진행 중: 진행률에 따라 점진적 색칠
    // 0-50%: 이전 색으로 색칠
    // 50-100%: 다음 색으로 색칠
    if (connectorProgressPercentage <= 50) {
      // 0-50% 구간: 이전 색으로 진행률만큼 색칠
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${connectorProgressPercentage}%, #E5E5E5 ${connectorProgressPercentage}%, #E5E5E5 100%)`;
    } else {
      // 50-100% 구간: 이전 색 50% + 다음 색으로 진행률만큼 색칠
      return `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} 50%, ${nextItemColor} 50%, ${nextItemColor} ${connectorProgressPercentage}%, #E5E5E5 ${connectorProgressPercentage}%, #E5E5E5 100%)`;
    }
  }, [connectorProgressPercentage, itemColor, nextItemColor]);

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
            {/* 버블 뒤에 숨은 연결 막대 (버블과 동일한 높이) */}
            <div
              className="absolute w-1"
              style={{
                left: 'calc(50% - 2px)', // 버블 중심 정렬
                top: 0,
                height: `${bubbleHeight}px`,
                background: progressPercentage > 0
                  ? `linear-gradient(to bottom, ${itemColor} 0%, ${itemColor} ${progressPercentage}%, #E5E5E5 ${progressPercentage}%, #E5E5E5 100%)`
                  : '#E5E5E5',
                zIndex: 0, // 버블 뒤로 배치
              }}
            />

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
                zIndex: isDragging ? 100 : 1, // 버블은 막대보다 앞에
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
            {/* 연결 막대 (버블 중심 정렬, 시간 진행에 따라 색칠) */}
            <div
              className="absolute w-1"
              style={{
                left: 'calc(50% - 2px)', // 버블 중심 정렬
                top: 0,
                height: `${connectorHeight}px`,
                background: connectorGradient,
                zIndex: 0,
              }}
            />
          </div>
          {/* 오른쪽: 빈 공간 (레이아웃 유지) */}
          <div className="flex-1" />
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
