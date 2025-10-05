'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { cn } from '@/lib/utils';
import { TimelineItem } from '@/types/timeline-view';
import { BubbleTimelineItem } from '../items/BubbleTimelineItem';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import DateTimeRangePicker from '../controls/DateTimeRangePicker';

/**
 * 버블 스타일 타임라인 뷰 컴포넌트
 *
 * 주요 기능:
 * - 버블 아이콘 + 연결 막대 비주얼
 * - 시간 진행에 따른 색상 변화 (회색 → 할일 색상)
 * - 롱프레스 드래그로 시간 이동 (웹/모바일 모두 지원)
 * - 시간 변경 모달로 최종 확인
 */
export const BubbleTimelineView: React.FC = () => {
  const { currentDate, getFilteredAndSortedItems, viewMode } = useTimelineViewStore();
  const updateTodo = useTodoStore(state => state.updateTodo);
  const currentTime = useCurrentTime();

  // 드래그 상태
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialTouch, setInitialTouch] = useState<{x: number; y: number} | null>(null);

  // 스크롤 차단 관련 ref
  const preventScrollRef = useRef<((e: Event) => void) | null>(null);
  const savedScrollPositionRef = useRef(0);
  const savedBodyScrollPositionRef = useRef(0);
  const scrollWatcherRef = useRef<number | null>(null);

  // 시간 변경 모달 상태
  const [showTimeChangeModal, setShowTimeChangeModal] = useState(false);
  const [pendingTimeChange, setPendingTimeChange] = useState<{
    itemId: string;
    newStartTime: Date;
    newEndTime: Date;
  } | null>(null);

  // 필터링된 아이템
  const items = useMemo(() => {
    return getFilteredAndSortedItems();
  }, [getFilteredAndSortedItems]);

  // 시간 지정 할일만 필터링
  const timedItems = useMemo(() => {
    return items.filter(item => item.startTime && item.endTime);
  }, [items]);

  // 🎯 완전한 터치 스크롤 차단 시스템 (리스트뷰와 동일)
  const enableScrollLock = useCallback(() => {
    // 현재 스크롤 위치 저장
    savedBodyScrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    const timelineContainer = document.querySelector('.flex.flex-col.h-full.w-full') as HTMLElement;
    if (timelineContainer) {
      savedScrollPositionRef.current = timelineContainer.scrollTop;
    }

    // 이벤트 리스너로 스크롤 완전 차단
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    preventScrollRef.current = preventScroll;

    // 모든 스크롤 관련 이벤트 차단
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('scroll', preventScroll, { passive: false });

    // Body 전체 터치 스크롤 차단
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // 타임라인 컨테이너 터치 스크롤 완전 차단
    if (timelineContainer) {
      timelineContainer.style.touchAction = 'none';
      timelineContainer.style.overflowY = 'hidden';
    }

    // 모든 스크롤 가능 요소 차단
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;
      el.style.touchAction = 'none';
      el.style.overflow = 'hidden';
    });

    // CSS 클래스 기반 강화 차단
    document.body.classList.add('dragging-active');

    // 스크롤 위치 강제 고정 감시 시작
    const watchScroll = () => {
      // Body 스크롤 강제 고정
      if (window.pageYOffset !== savedBodyScrollPositionRef.current) {
        window.scrollTo(0, savedBodyScrollPositionRef.current);
      }

      // 타임라인 스크롤 고정
      const container = document.querySelector('.flex.flex-col.h-full.w-full') as HTMLElement;
      if (container && container.scrollTop !== savedScrollPositionRef.current) {
        container.scrollTop = savedScrollPositionRef.current;
      }

      scrollWatcherRef.current = requestAnimationFrame(watchScroll);
    };

    scrollWatcherRef.current = requestAnimationFrame(watchScroll);

    console.log('🔒 [BubbleView] 스크롤 차단 활성화', {
      bodyScroll: window.pageYOffset || document.documentElement.scrollTop,
      timelineScroll: timelineContainer?.scrollTop
    });
  }, []);

  const disableScrollLock = useCallback(() => {
    // 스크롤 감시 해제
    if (scrollWatcherRef.current) {
      cancelAnimationFrame(scrollWatcherRef.current);
      scrollWatcherRef.current = null;
    }

    // 이벤트 리스너 완전 해제
    if (preventScrollRef.current) {
      document.removeEventListener('touchmove', preventScrollRef.current);
      document.removeEventListener('wheel', preventScrollRef.current);
      document.removeEventListener('scroll', preventScrollRef.current);
      preventScrollRef.current = null;
    }

    // Body 스타일 개별 복원
    document.body.style.overflow = 'initial';
    document.body.style.touchAction = 'auto';
    document.body.style.userSelect = 'auto';
    document.body.style.webkitUserSelect = 'auto';
    document.body.style.position = 'static';
    document.body.style.width = 'auto';
    document.body.classList.remove('dragging-active');

    // 타임라인 컨테이너 완전 복원
    const timelineContainer = document.querySelector('.flex.flex-col.h-full.w-full') as HTMLElement;
    if (timelineContainer) {
      timelineContainer.style.touchAction = 'auto';
      timelineContainer.style.overflowY = 'auto';
      timelineContainer.style.overflow = 'auto';

      // 저장된 스크롤 위치로 복원
      setTimeout(() => {
        if (savedScrollPositionRef.current >= 0) {
          timelineContainer.scrollTop = savedScrollPositionRef.current;
        }
      }, 0);
    }

    // Body 스크롤 위치 복원
    if (savedBodyScrollPositionRef.current >= 0) {
      setTimeout(() => {
        window.scrollTo(0, savedBodyScrollPositionRef.current);
      }, 0);
    }

    // 모든 스크롤 요소 완전 복원
    document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
      const el = element as HTMLElement;
      el.style.touchAction = 'auto';
      el.style.overflow = 'auto';
      el.style.overflowY = 'auto';
    });

    console.log('🔄 [BubbleView] 스크롤 차단 해제');
  }, []);

  // 롱프레스 시작 (터치/마우스 통합)
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent, itemId: string) => {
    // ✅ 브라우저 기본 동작 방지 (세 손가락 제스처 등)
    e.preventDefault();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

    // 🔒 터치 즉시 현재 스크롤 위치 저장 (리스트뷰와 동일)
    savedBodyScrollPositionRef.current = window.pageYOffset || document.documentElement.scrollTop;
    const timelineContainer = document.querySelector('.flex.flex-col.h-full.w-full') as HTMLElement;
    if (timelineContainer) {
      savedScrollPositionRef.current = timelineContainer.scrollTop;
      console.log('💾 [BubbleView] 터치 시작 시 스크롤 위치 저장:', {
        bodyScroll: savedBodyScrollPositionRef.current,
        timelineScroll: savedScrollPositionRef.current
      });
    }

    // ✅ 초기 위치만 저장 (타이머는 handleDragMove에서 시작)
    setDragStartY(clientY);
    setInitialTouch({ x: clientX, y: clientY });
    setDraggedItemId(itemId);
  }, []);

  // 드래그 이동 (터치/마우스 통합)
  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // ✅ 드래그 중이거나 초기 터치 있을 때 브라우저 스크롤 방지
    if (isDragging || initialTouch) {
      e.preventDefault();
    }

    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;

    if (isDragging && draggedItemId) {
      // 이미 드래그 중이면 위치 업데이트 (X, Y 모두)
      setDragCurrentY(clientY);
      setDragCurrentX(clientX);
    } else if (initialTouch && !longPressTimer && draggedItemId) {
      // ✅ 정지 상태 확인: 50px 이상 움직였으면 스크롤로 간주 (리스트뷰와 동일)
      const deltaX = Math.abs(clientX - initialTouch.x);
      const deltaY = Math.abs(clientY - initialTouch.y);

      if (deltaX > 50 || deltaY > 50) {
        // 스크롤로 간주하고 초기화
        setInitialTouch(null);
        setDraggedItemId(null);
        return;
      }

      // ✅ 정지 상태 유지 중 → 300ms 타이머 시작 (리스트뷰와 동일)
      const timer = setTimeout(() => {
        setIsDragging(true);
        setDragCurrentY(clientY); // 드래그 시작 시 현재 위치로 설정
        setDragCurrentX(clientX); // X 좌표도 설정

        // 🔒 완전한 스크롤 차단 활성화 (리스트뷰와 동일)
        enableScrollLock();

        // 햅틱 피드백
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 30, 50]);
        }

        console.log('🎯 [BubbleView] 드래그 확정 (타이머 완료)');
      }, 300);

      setLongPressTimer(timer);
    } else if (longPressTimer && initialTouch) {
      // ✅ 타이머 진행 중 50px 이상 움직이면 취소 (리스트뷰와 동일)
      const deltaX = Math.abs(clientX - initialTouch.x);
      const deltaY = Math.abs(clientY - initialTouch.y);

      if (deltaX > 50 || deltaY > 50) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setInitialTouch(null);
        setDraggedItemId(null);
      }
    }
  }, [isDragging, draggedItemId, initialTouch, longPressTimer, enableScrollLock]);;

  // 드래그 종료 (터치/마우스 통합)
  const handleDragEnd = useCallback(async () => {
    // 타이머가 있으면 취소
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // ✅ 실제로 드래그 중이 아니면 무시 (다른 카드의 이벤트로 인한 오작동 방지)
    if (!isDragging) {
      // 드래그 중이 아니어도 초기 상태 정리
      setDraggedItemId(null);
      setInitialTouch(null);
      return;
    }

    if (draggedItemId) {
      // Y축 이동 거리를 시간으로 변환 (1px = 1분)
      const deltaY = dragCurrentY - dragStartY;
      const minutesChange = Math.round(deltaY);

      // ✅ 최소 드래그 거리 체크: 5px 미만이면 모달 표시 안 함
      if (Math.abs(deltaY) < 5) {
        // 실제 드래그 없음 → 상태만 초기화하고 모달 안 띄움
        setIsDragging(false);
        setDraggedItemId(null);
        setDragStartY(0);
        setDragCurrentY(0);
        setDragCurrentX(0);
        setInitialTouch(null);

        // 🔓 스크롤 차단 해제
        disableScrollLock();
        return;
      }

      // 드래그된 할일 찾기
      const draggedItem = timedItems.find(item => item.id === draggedItemId);

      if (draggedItem && draggedItem.startTime && draggedItem.endTime) {
        const newStartTime = new Date(new Date(draggedItem.startTime).getTime() + minutesChange * 60 * 1000);
        const newEndTime = new Date(new Date(draggedItem.endTime).getTime() + minutesChange * 60 * 1000);

        // 시간 변경 모달 표시
        setPendingTimeChange({
          itemId: draggedItem.id,
          newStartTime,
          newEndTime
        });
        setShowTimeChangeModal(true);
      }
    }

    // 드래그 상태 초기화 (모달은 유지)
    setIsDragging(false);
    setDraggedItemId(null);
    setDragStartY(0);
    setDragCurrentY(0);
    setDragCurrentX(0);
    setInitialTouch(null);

    // 🔓 스크롤 차단 해제 (리스트뷰와 동일)
    disableScrollLock();

    console.log('✅ [BubbleView] 드래그 완료 및 스크롤 차단 해제');
  }, [isDragging, draggedItemId, dragStartY, dragCurrentY, timedItems, longPressTimer, disableScrollLock]);;

  // 시간 변경 확정
  const handleConfirmTimeChange = useCallback(async () => {
    if (!pendingTimeChange) {
      return;
    }

    const { itemId, newStartTime, newEndTime } = pendingTimeChange;

    // 할일 시간 업데이트
    await updateTodo(itemId, {
      start_time: newStartTime.toISOString(),
      end_time: newEndTime.toISOString(),
    });

    // 모달 닫기
    setShowTimeChangeModal(false);
    setPendingTimeChange(null);
  }, [pendingTimeChange, updateTodo]);

  // 시간 변경 취소
  const handleCancelTimeChange = useCallback(() => {
    setShowTimeChangeModal(false);
    setPendingTimeChange(null);
  }, []);

  // DateTimeRangePicker에서 시간 변경 시
  const handleTimeRangeChange = useCallback((range: { startDate: Date; endDate?: Date; isAllDay: boolean }) => {
    if (!pendingTimeChange || !range.endDate) {
      return;
    }

    setPendingTimeChange({
      ...pendingTimeChange,
      newStartTime: range.startDate,
      newEndTime: range.endDate
    });
  }, [pendingTimeChange]);

  // 오늘인지 확인
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      today.getFullYear() === currentDate.getFullYear() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getDate() === currentDate.getDate()
    );
  }, [currentDate]);

  // 🎯 컴포넌트 언마운트 시 정리 (리스트뷰와 동일)
  React.useEffect(() => {
    return () => {
      // 컴포넌트가 언마운트될 때 스크롤 차단 완전 해제
      if (preventScrollRef.current) {
        document.removeEventListener('touchmove', preventScrollRef.current);
        document.removeEventListener('wheel', preventScrollRef.current);
        document.removeEventListener('scroll', preventScrollRef.current);
      }

      if (scrollWatcherRef.current) {
        cancelAnimationFrame(scrollWatcherRef.current);
      }

      // 모든 스타일 명시적 복원
      document.body.style.overflow = 'initial';
      document.body.style.touchAction = 'auto';
      document.body.style.userSelect = 'auto';
      document.body.style.position = 'static';
      document.body.style.width = 'auto';
      document.body.classList.remove('dragging-active');

      // 모든 스크롤 요소 복원
      document.querySelectorAll('.overflow-y-auto, .overflow-auto').forEach(element => {
        const el = element as HTMLElement;
        el.style.touchAction = 'auto';
        el.style.overflow = 'auto';
        el.style.overflowY = 'auto';
      });

      console.log('🧹 [BubbleView] 컴포넌트 언마운트 시 드래그 정리 완료');
    };
  }, []);

  // 연결 막대 segment 정보 계산
  const connectorSegments = useMemo(() => {
    const segments: Array<{
      topColor: string;
      bottomColor: string;
      progress: number;
      top: number;
      height: number;
    }> = [];

    let accumulatedHeight = 0;

    console.log('🔍 [BubbleView] timedItems:', timedItems.map((item, idx) => ({
      index: idx,
      id: item.id,
      title: item.title,
      color: item.color,
      startTime: item.startTime,
      endTime: item.endTime
    })));

    timedItems.forEach((item, index) => {
      const prevItem = index > 0 ? timedItems[index - 1] : null;

      // 버블 아이콘 높이 계산 (BubbleTimelineItem과 동일한 로직)
      const startTime = item.startTime ? new Date(item.startTime) : null;
      const endTime = item.endTime ? new Date(item.endTime) : null;

      let durationMinutes = 10;
      if (startTime && endTime) {
        const isSameDay = (date1: Date, date2: Date) => {
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate();
        };

        // 시간 정규화 (BubbleTimelineItem과 동일)
        const normalizedEndTime = isSameDay(startTime, endTime)
          ? endTime
          : new Date(
              startTime.getFullYear(),
              startTime.getMonth(),
              startTime.getDate(),
              endTime.getHours(),
              endTime.getMinutes(),
              endTime.getSeconds()
            );

        const minutes = Math.round((normalizedEndTime.getTime() - startTime.getTime()) / (60 * 1000));
        if (minutes > 0 && minutes <= 1440) {
          durationMinutes = minutes;
        }
      }

      const bubbleHeight = durationMinutes <= 10 ? 64 : Math.min(64 + Math.ceil((durationMinutes - 10) / 10) * 20, 200);

      // 연결 막대 segment 추가 (이전 아이템이 있는 경우)
      if (prevItem && prevItem.endTime && item.startTime) {
        const prevEndTime = new Date(prevItem.endTime);
        const currStartTime = new Date(item.startTime);

        // 시간 정규화 헬퍼
        const isSameDay = (date1: Date, date2: Date) => {
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate();
        };

        // 이전 할일 종료 시간 정규화 (현재 할일 시작 날짜 기준)
        const normalizedPrevEnd = isSameDay(prevEndTime, currStartTime)
          ? prevEndTime
          : new Date(
              currStartTime.getFullYear(),
              currStartTime.getMonth(),
              currStartTime.getDate(),
              prevEndTime.getHours(),
              prevEndTime.getMinutes(),
              prevEndTime.getSeconds()
            );

        // 현재 할일 시작 시간 정규화
        const normalizedCurrStart = isSameDay(normalizedPrevEnd, currStartTime)
          ? currStartTime
          : new Date(
              normalizedPrevEnd.getFullYear(),
              normalizedPrevEnd.getMonth(),
              normalizedPrevEnd.getDate(),
              currStartTime.getHours(),
              currStartTime.getMinutes(),
              currStartTime.getSeconds()
            );

        const gapMinutes = Math.round((normalizedCurrStart.getTime() - normalizedPrevEnd.getTime()) / (60 * 1000));
        const connectorHeight = gapMinutes <= 10 ? 16 : Math.min(16 + Math.ceil((gapMinutes - 10) / 10) * 20, 200);

        // 연결 막대 진행률 계산
        let progress = 0;
        const now = currentTime.getTime();
        const prevEnd = normalizedPrevEnd.getTime();
        const currStart = normalizedCurrStart.getTime();

        // 간격이 0인 경우 (할일이 연속됨) - 현재 시간이 해당 시점을 지났는지만 확인
        if (prevEnd === currStart) {
          progress = now >= currStart ? 100 : 0;
        } else if (now < prevEnd) {
          progress = 0;
        } else if (now >= currStart) {
          progress = 100;
        } else {
          progress = Math.round(((now - prevEnd) / (currStart - prevEnd)) * 100);
        }

        console.log(`🔗 [BubbleView] Connector ${index-1}→${index}:`, {
          prevEnd: normalizedPrevEnd.toLocaleTimeString(),
          currStart: normalizedCurrStart.toLocaleTimeString(),
          now: new Date(currentTime).toLocaleTimeString(),
          gapMinutes,
          progress,
          prevColor: prevItem.color,
          currColor: item.color
        });

        segments.push({
          topColor: prevItem.color || '#3B82F6',
          bottomColor: item.color || '#3B82F6',
          progress,
          top: accumulatedHeight,
          height: connectorHeight
        });

        accumulatedHeight += connectorHeight;
      }

      accumulatedHeight += bubbleHeight;
    });

    console.log('🎨 [BubbleView] Connector segments:', segments);
    return segments;
  }, [timedItems, currentTime]);

  return (
    <div className="flex flex-col h-full w-full px-4 py-6 overflow-y-auto">
      {/* 타임라인 컨테이너 */}
      <div className="relative flex-1">
        {/* ✨ 연결선 segments (점진적 색칠) */}
        {connectorSegments.map((segment) => (
          <div
            key={`connector-${segment.top}-${segment.height}`}
            className="absolute w-0.5"
            style={{
              left: '32px',
              top: `${segment.top}px`,
              height: `${segment.height}px`,
              background: segment.progress > 0
                ? `linear-gradient(to bottom,
                    ${segment.topColor} 0%,
                    ${segment.topColor} ${segment.progress / 2}%,
                    ${segment.bottomColor} ${50 + segment.progress / 2}%,
                    ${segment.bottomColor} 100%)`
                : '#E5E5E5',
              zIndex: 0
            }}
          />
        ))}

        {/* 버블 아이템 리스트 */}
        <div className="relative space-y-0" style={{ zIndex: 1 }}>
          {timedItems.map((item, index) => {
            const prevItem = index > 0 ? timedItems[index - 1] : null;
            const nextItem = index < timedItems.length - 1 ? timedItems[index + 1] : null;

            return (
              <BubbleTimelineItem
                key={item.id}
                item={item}
                prevItem={prevItem}
                nextItem={nextItem}
                isDragging={isDragging && draggedItemId === item.id}
                dragOffset={isDragging && draggedItemId === item.id ? dragCurrentY - dragStartY : 0}
                isToday={isToday}
                currentTime={currentTime}
                onTouchStart={(e) => handleDragStart(e, item.id)}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={(e) => handleDragStart(e, item.id)}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
              />
            );
          })}
        </div>
      </div>

      {/* 시간 변경 모달 */}
      {pendingTimeChange && (
        <Dialog open={showTimeChangeModal} onOpenChange={setShowTimeChangeModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>시간 변경</DialogTitle>
              <DialogDescription>
                {timedItems.find(item => item.id === pendingTimeChange.itemId)?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <DateTimeRangePicker
                value={{
                  startDate: pendingTimeChange.newStartTime,
                  endDate: pendingTimeChange.newEndTime,
                  isAllDay: false
                }}
                onChange={handleTimeRangeChange}
                viewMode={viewMode}
                allowRange={true}
                allowAllDay={false}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelTimeChange}>
                취소
              </Button>
              <Button onClick={handleConfirmTimeChange}>
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 드래그 프리뷰 카드 (손가락 따라다님) */}
      {isDragging && draggedItemId && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            top: dragCurrentY,
            left: dragCurrentX,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-3 shadow-2xl border-2 border-blue-400 dark:border-blue-500">
            {(() => {
              const item = timedItems.find(i => i.id === draggedItemId);
              if (!item) {
                return <div className="text-sm font-medium">시간 이동 중...</div>;
              }

              return (
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.title}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
