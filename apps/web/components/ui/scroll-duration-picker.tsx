'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrollDurationPickerProps {
  selectedHours: number;     // 0-23
  selectedMinutes: number;   // 0-59
  onDurationChange: (hours: number, minutes: number) => void;
  accentColor?: string;
  className?: string;
}

export function ScrollDurationPicker({
  selectedHours,
  selectedMinutes,
  onDurationChange,
  accentColor = '#DBAC6C',
  className,
}: ScrollDurationPickerProps) {
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 즉각적인 시각적 피드백을 위한 로컬 상태
  const [visualHour, setVisualHour] = useState(selectedHours);
  const [visualMinute, setVisualMinute] = useState(selectedMinutes);

  // 선택된 시간이 변경되면 시각적 상태도 업데이트
  useEffect(() => {
    setVisualHour(selectedHours);
    setVisualMinute(selectedMinutes);
  }, [selectedHours, selectedMinutes]);

  // 시간 옵션 생성 (0-23시간)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 분 옵션 생성 (0-59분)
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // 스크롤 위치 계산 및 설정
  const scrollToSelected = useCallback((container: HTMLDivElement, index: number, itemHeight: number) => {
    const paddingTop = 60; // 상단 패딩 (h-[60px])
    const containerCenter = container.clientHeight / 2; // 80px (h-40 / 2)

    // 아이템의 중앙 위치 = 패딩 + (인덱스 * 아이템높이) + (아이템높이 / 2)
    const itemCenterY = paddingTop + (index * itemHeight) + (itemHeight / 2);

    // 스크롤 위치 = 아이템 중앙 - 컨테이너 중앙
    const scrollTop = itemCenterY - containerCenter;

    container.scrollTo({ top: scrollTop, behavior: 'instant' as ScrollBehavior });
  }, []);

  // 초기 스크롤 위치 설정
  useEffect(() => {
    if (hourRef.current && minuteRef.current) {
      const itemHeight = 50; // 각 아이템의 높이
      setTimeout(() => {
        if (hourRef.current) {
          scrollToSelected(hourRef.current, selectedHours, itemHeight);
        }
        if (minuteRef.current) {
          scrollToSelected(minuteRef.current, selectedMinutes, itemHeight);
        }
      }, 100);
    }
  }, [selectedHours, selectedMinutes, scrollToSelected]);

  // 시간 변경 핸들러
  const handleDurationChange = useCallback((newHour: number, newMinute: number) => {
    onDurationChange(newHour, newMinute);
  }, [onDurationChange]);

  // 중앙에 있는 아이템 계산 함수
  const calculateCenterIndex = useCallback((container: HTMLDivElement) => {
    const itemHeight = 50;
    const scrollTop = container.scrollTop;
    const paddingTop = 60;
    const containerCenter = container.clientHeight / 2;
    const centerY = scrollTop + containerCenter;
    const rawIndex = (centerY - paddingTop - itemHeight / 2) / itemHeight;
    return Math.round(rawIndex);
  }, []);

  // 스크롤 끝났을 때 자동 스냅 함수
  const snapToNearestItem = useCallback((container: HTMLDivElement, type: 'hour' | 'minute') => {
    const centerIndex = calculateCenterIndex(container);
    const itemHeight = 50;

    let finalIndex: number;
    let maxIndex: number;

    if (type === 'hour') {
      maxIndex = 23;
      finalIndex = Math.max(0, Math.min(maxIndex, centerIndex));
    } else {
      maxIndex = 59;
      finalIndex = Math.max(0, Math.min(maxIndex, centerIndex));
    }

    // 정확한 위치로 스냅
    scrollToSelected(container, finalIndex, itemHeight);

    // 값 업데이트
    if (type === 'hour') {
      const newHour = finalIndex;
      if (newHour !== selectedHours) {
        handleDurationChange(newHour, selectedMinutes);
      }
      setVisualHour(newHour);
    } else {
      const newMinute = finalIndex;
      if (newMinute !== selectedMinutes) {
        handleDurationChange(selectedHours, newMinute);
      }
      setVisualMinute(newMinute);
    }
  }, [calculateCenterIndex, scrollToSelected, selectedHours, selectedMinutes, handleDurationChange]);

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
        if (newHour !== selectedHours) {
          handleDurationChange(newHour, selectedMinutes);
        }
      } else {
        const newMinute = Math.max(0, Math.min(59, finalIndex));
        if (newMinute !== selectedMinutes) {
          handleDurationChange(selectedHours, newMinute);
        }
      }
    }, 50);

    // 스크롤 완료 후 자동 스냅 (300ms 후)
    scrollEndTimeoutRef.current = setTimeout(() => {
      snapToNearestItem(container, type);
    }, 300);
  }, [selectedHours, selectedMinutes, handleDurationChange, calculateCenterIndex, snapToNearestItem]);

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
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* 레이블 헤더 */}
      <div className="flex justify-center gap-4 mb-2 w-full">
        <span className="label-text text-sm font-medium w-[100px] text-center">시간</span>
        <span className="label-text text-sm font-medium w-[100px] text-center">분</span>
      </div>

      {/* 스크롤 영역 */}
      <div className="relative flex items-center justify-center w-full">
        {/* 중앙 선택 강조 표시 */}
        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[50px] rounded-lg flex items-center justify-center px-4 pointer-events-none font-bold text-white text-xl z-20"
          style={{
            backgroundColor: accentColor,
            width: '275px',
            marginTop: '-2px'
          }}
        >
          <span>{visualHour}시간 {visualMinute}분</span>
        </div>

        {/* 시간 선택 휠 */}
        <div className="relative" style={{ width: '100px' }}>
          <div
            ref={hourRef}
            className="h-40 overflow-y-scroll scrollbar-hide scroll-smooth relative"
            onScroll={(e) => handleScroll('hour', e)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 상단 패딩 */}
            <div className="h-[60px]" />

            {/* 시간 옵션들 */}
            {hours.map((hour) => {
              const isSelected = hour === visualHour;
              return (
                <div
                  key={hour}
                  className={cn(
                    "h-[50px] w-full flex items-center justify-center transition-all duration-200",
                    isSelected ? "opacity-100 scale-110" : "opacity-40 scale-100"
                  )}
                >
                  <span className={cn(
                    "font-semibold",
                    isSelected ? "text-2xl" : "text-lg"
                  )}>
                    {hour}
                  </span>
                </div>
              );
            })}

            {/* 하단 패딩 */}
            <div className="h-[60px]" />
          </div>

          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-base-100 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-base-100 to-transparent pointer-events-none z-10" />
        </div>

        {/* 분 선택 휠 */}
        <div className="relative" style={{ width: '100px' }}>
          <div
            ref={minuteRef}
            className="h-40 overflow-y-scroll scrollbar-hide scroll-smooth relative"
            onScroll={(e) => handleScroll('minute', e)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 상단 패딩 */}
            <div className="h-[60px]" />

            {/* 분 옵션들 */}
            {minutes.map((minute) => {
              const isSelected = minute === visualMinute;
              return (
                <div
                  key={minute}
                  className={cn(
                    "h-[50px] w-full flex items-center justify-center transition-all duration-200",
                    isSelected ? "opacity-100 scale-110" : "opacity-40 scale-100"
                  )}
                >
                  <span className={cn(
                    "font-semibold",
                    isSelected ? "text-2xl" : "text-lg"
                  )}>
                    {minute}
                  </span>
                </div>
              );
            })}

            {/* 하단 패딩 */}
            <div className="h-[60px]" />
          </div>

          <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-base-100 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-base-100 to-transparent pointer-events-none z-10" />
        </div>
      </div>
    </div>
  );
}
