'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { addMinutes, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ScrollTimePickerProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  accentColor?: string;
  className?: string;
  maxEndTime?: string;
  durationMinutes?: number;
  onDurationClick?: () => void; // 시간 간격 클릭 핸들러 추가
}

export function ScrollTimePicker({
  selectedTime,
  onTimeChange,
  accentColor = '#DBAC6C',
  className,
  maxEndTime = "24:00",
  durationMinutes = 90,
  onDurationClick
}: ScrollTimePickerProps) {
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 현재 선택된 시간을 시와 분으로 분리
  const [selectedHour, selectedMinute] = selectedTime ?
    selectedTime.split(':').map(Number) : [9, 0];

  // 즉각적인 시각적 피드백을 위한 로컬 상태
  const [visualHour, setVisualHour] = useState(selectedHour);
  const [visualMinute, setVisualMinute] = useState(selectedMinute);

  // 선택된 시간이 변경되면 시각적 상태도 업데이트
  useEffect(() => {
    setVisualHour(selectedHour);
    setVisualMinute(selectedMinute);
  }, [selectedHour, selectedMinute]);

  // 시간 범위 계산 (시작 시간 + duration = 종료 시간)
  const timeRange = useMemo(() => {
    try {
      const startTime = new Date();
      startTime.setHours(visualHour, visualMinute, 0, 0);
      const startTimeStr = format(startTime, 'HH:mm');

      // durationMinutes가 0이면 단일 시간만 표시
      if (durationMinutes === 0) {
        return startTimeStr;
      }

      const endTime = addMinutes(startTime, durationMinutes);
      const endTimeStr = format(endTime, 'HH:mm');

      return `${startTimeStr} ~ ${endTimeStr}`;
    } catch (error) {
      if (durationMinutes === 0) {
        return `${String(visualHour).padStart(2, '0')}:${String(visualMinute).padStart(2, '0')}`;
      }
      return `${String(visualHour).padStart(2, '0')}:${String(visualMinute).padStart(2, '0')} ~ --:--`;
    }
  }, [visualHour, visualMinute, durationMinutes]);

  // 시간 옵션 생성 (0-23시)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 분 옵션 생성 (0, 1, 2, 3, ..., 59분 - 1분 단위)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // 스크롤 위치 계산 및 설정
  const scrollToSelected = useCallback((container: HTMLDivElement, index: number, itemHeight: number) => {
    const paddingTop = 48; // 상단 패딩 (h-12 = 3rem = 48px)
    const containerCenter = container.clientHeight / 2; // 64px (h-32 / 2)

    // 아이템의 중앙 위치 = 패딩 + (인덱스 * 아이템높이) + (아이템높이 / 2)
    const itemCenterY = paddingTop + (index * itemHeight) + (itemHeight / 2);

    // 스크롤 위치 = 아이템 중앙 - 컨테이너 중앙
    const scrollTop = itemCenterY - containerCenter;

    container.scrollTo({ top: scrollTop, behavior: 'instant' });
  }, []);

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (hourRef.current && minuteRef.current) {
      const itemHeight = 40; // 각 아이템의 높이
      setTimeout(() => {
        if (hourRef.current) {
          scrollToSelected(hourRef.current, selectedHour, itemHeight);
        }
        if (minuteRef.current) {
          scrollToSelected(minuteRef.current, selectedMinute, itemHeight);
        }
      }, 100);
    }
  }, [selectedHour, selectedMinute, scrollToSelected]);

  // 시간 변경 핸들러
  const handleTimeChange = useCallback((newHour: number, newMinute: number) => {
    const timeString = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

    // 실제로는 항상 시간 변경을 허용하고, UI에서만 경고 표시
    // duration이 너무 길어도 시간 선택은 가능하게 함
    onTimeChange(timeString);
  }, [onTimeChange]);

  // 중앙에 있는 아이템 계산 함수
  const calculateCenterIndex = useCallback((container: HTMLDivElement) => {
    const itemHeight = 40;
    const scrollTop = container.scrollTop;
    const paddingTop = 48;
    const containerCenter = container.clientHeight / 2;
    const centerY = scrollTop + containerCenter;
    const rawIndex = (centerY - paddingTop - itemHeight / 2) / itemHeight;
    return Math.round(rawIndex);
  }, []);

  // 스크롤 끝났을 때 자동 스냅 함수
  const snapToNearestItem = useCallback((container: HTMLDivElement, type: 'hour' | 'minute') => {
    const centerIndex = calculateCenterIndex(container);
    const itemHeight = 40;

    let finalIndex: number;
    let maxIndex: number;

    if (type === 'hour') {
      maxIndex = 23;
      finalIndex = Math.max(0, Math.min(maxIndex, centerIndex));
    } else {
      maxIndex = 59; // 0-59 (0분, 1분, ..., 59분)
      finalIndex = Math.max(0, Math.min(maxIndex, centerIndex));
    }

    // 정확한 위치로 스냅
    scrollToSelected(container, finalIndex, itemHeight);

    // 값 업데이트
    if (type === 'hour') {
      const newHour = finalIndex;
      if (newHour !== selectedHour) {
        handleTimeChange(newHour, selectedMinute);
      }
      setVisualHour(newHour);
    } else {
      const newMinute = finalIndex;
      if (newMinute !== selectedMinute) {
        handleTimeChange(selectedHour, newMinute);
      }
      setVisualMinute(newMinute);
    }
  }, [calculateCenterIndex, scrollToSelected, selectedHour, selectedMinute, handleTimeChange]);

  // 디바운스된 스크롤 핸들러
  const handleScroll = useCallback((type: 'hour' | 'minute', event: React.UIEvent<HTMLDivElement>) => {
    // 모달의 탄성 스크롤과 충돌 방지를 위해 이벤트 전파 차단
    event.stopPropagation();

    const container = event.currentTarget;
    const centerIndex = calculateCenterIndex(container);

    // 즉각적인 시각적 피드백 업데이트
    if (type === 'hour') {
      const newVisualHour = Math.max(0, Math.min(23, centerIndex));
      setVisualHour(newVisualHour);
    } else {
      const newVisualMinute = Math.max(0, Math.min(59, centerIndex));
      setVisualMinute(newVisualMinute);
    }

    // 이전 타이머들 취소
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (scrollEndTimeoutRef.current) {
      clearTimeout(scrollEndTimeoutRef.current);
    }

    // 50ms 디바운스로 실제 값 변경 (더 빠른 반응성)
    scrollTimeoutRef.current = setTimeout(() => {
      const finalIndex = calculateCenterIndex(container);

      if (type === 'hour') {
        const newHour = Math.max(0, Math.min(23, finalIndex));
        if (newHour !== selectedHour) {
          handleTimeChange(newHour, selectedMinute);
        }
      } else {
        const newMinute = Math.max(0, Math.min(59, finalIndex));
        if (newMinute !== selectedMinute) {
          handleTimeChange(selectedHour, newMinute);
        }
      }
    }, 50);

    // 스크롤 완료 후 자동 스냅 (300ms 후)
    scrollEndTimeoutRef.current = setTimeout(() => {
      snapToNearestItem(container, type);
    }, 300);
  }, [selectedHour, selectedMinute, handleTimeChange, calculateCenterIndex, snapToNearestItem]);

  // 터치 이벤트 핸들러 (모달 탄성 스크롤과 충돌 방지)
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 터치 이벤트 전파 차단으로 모달의 탄성 스크롤 간섭 방지
    event.stopPropagation();

    // 터치 시작 위치 저장 (스크롤 경계 제어를 위해)
    const target = event.currentTarget as any;
    target._touchStartY = event.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 터치 무브 이벤트 전파 차단
    event.stopPropagation();

    // 스크롤 경계에서 부모 스크롤 방지 로직
    const container = event.currentTarget;
    const { scrollTop, scrollHeight, offsetHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + offsetHeight >= scrollHeight - 1;

    // 터치 방향 계산
    const touch = event.touches[0];
    const containerElement = container as any;
    const startY = containerElement._touchStartY || touch.clientY;
    const deltaY = touch.clientY - startY;

    // 경계에서 부모로 전파 방지 (iOS 고무줄 효과 차단)
    if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
      event.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // 터치 엔드 이벤트 전파 차단
    event.stopPropagation();

    // 터치 시작 위치 정리
    const target = event.currentTarget as any;
    delete target._touchStartY;
  }, []);

  // 휠 이벤트 핸들러 (데스크탑 모달 탄성 스크롤과 충돌 방지)
  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    // 휠 이벤트 전파 차단으로 모달의 탄성 스크롤 간섭 방지
    event.stopPropagation();
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* 중앙 시간 범위 표시 - 전체 컨테이너 기준 중앙 (원래 위치) */}
      <div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-10 rounded-lg flex items-center justify-center px-4 pointer-events-none font-bold text-white text-xl z-20"
        style={{
          backgroundColor: accentColor,
          width: '200px',
          marginTop: '-2px'
        }}
      >
        {timeRange}
      </div>

      {/* 중앙 위쪽 콜론 */}
      <div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center opacity-40"
        style={{
          marginTop: '-40px',
          zIndex: 15
        }}
      >
        <div className="w-1 h-1 rounded-full mb-1" style={{ backgroundColor: '#6b7280' }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
      </div>

      {/* 중앙 아래쪽 콜론 */}
      <div
        className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center opacity-40"
        style={{
          marginTop: '40px',
          zIndex: 15
        }}
      >
        <div className="w-1 h-1 rounded-full mb-1" style={{ backgroundColor: '#6b7280' }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
      </div>

        <div className="relative flex p-4 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>

        {/* 시간 스크롤러 */}
        <div className="relative flex flex-col items-end">
          <div className="relative">
            <div
              ref={hourRef}
              className="h-32 overflow-y-auto overflow-x-hidden scrollbar-hide relative time-picker-wrapper"
              onScroll={(e) => handleScroll('hour', e)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{
                width: '100px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
            >
            {/* 상단 패딩 */}
            <div className="h-12" />

            {hours.map((hour) => {
              return (
                <div
                  key={hour}
                  className="h-10 w-full flex items-center justify-end text-lg font-medium transition-all duration-100 cursor-pointer pr-1 opacity-40 text-gray-500"
                  onClick={() => handleTimeChange(hour, selectedMinute)}
                >
                  {String(hour).padStart(2, '0')}
                </div>
              );
            })}

            {/* 하단 패딩 */}
            <div className="h-12" />
          </div>
          </div>
        </div>

        {/* 콜론 구분자 */}
        <div className="relative flex flex-col items-center">
          <div className="relative h-32 flex flex-col items-center justify-center opacity-40">
            <div className="w-1 h-1 rounded-full mb-1" style={{ backgroundColor: '#6b7280' }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
          </div>
        </div>

        {/* 분 스크롤러 */}
        <div className="relative flex flex-col items-start">
          <div className="relative">
            <div
              ref={minuteRef}
              className="h-32 overflow-y-auto overflow-x-hidden scrollbar-hide relative time-picker-wrapper"
              onScroll={(e) => handleScroll('minute', e)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              style={{
                width: '100px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflowX: 'hidden',
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
            >
            {/* 상단 패딩 */}
            <div className="h-12" />

            {minutes.map((minute) => {
              return (
                <div
                  key={minute}
                  className="h-10 w-full flex items-center justify-start text-lg font-medium transition-all duration-100 cursor-pointer pl-1 opacity-40 text-gray-500"
                  onClick={() => handleTimeChange(selectedHour, minute)}
                >
                  {String(minute).padStart(2, '0')}
                </div>
              );
            })}

            {/* 하단 패딩 */}
            <div className="h-12" />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}