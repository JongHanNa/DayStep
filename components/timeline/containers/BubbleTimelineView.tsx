'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialTouch, setInitialTouch] = useState<{x: number; y: number} | null>(null);

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

  // 롱프레스 시작 (터치/마우스 통합)
  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent, itemId: string) => {
    // ✅ 브라우저 기본 동작 방지 (세 손가락 제스처 등)
    e.preventDefault();

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

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
      // 이미 드래그 중이면 위치 업데이트
      setDragCurrentY(clientY);
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
  }, [isDragging, draggedItemId, initialTouch, longPressTimer]);;

  // 드래그 종료 (터치/마우스 통합)
  const handleDragEnd = useCallback(async () => {
    // ✅ 실제로 드래그 중이 아니면 무시 (다른 카드의 이벤트로 인한 오작동 방지)
    if (!isDragging) {
      return;
    }

    // 타이머가 있으면 취소
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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
        setInitialTouch(null);
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
    setInitialTouch(null);
  }, [isDragging, draggedItemId, dragStartY, dragCurrentY, timedItems, longPressTimer]);;

  // 시간 변경 확정
  const handleConfirmTimeChange = useCallback(async () => {
    if (!pendingTimeChange) return;

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
    if (!pendingTimeChange || !range.endDate) return;

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

  return (
    <div className="flex flex-col h-full w-full px-4 py-6">
      {/* 타임라인 컨테이너 */}
      <div className="relative flex-1">
        {/* 세로 연결 라인 (왼쪽) */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* 버블 아이템 리스트 */}
        <div className="relative space-y-0">
          {timedItems.map((item, index) => {
            const prevItem = index > 0 ? timedItems[index - 1] : null;

            return (
              <BubbleTimelineItem
                key={item.id}
                item={item}
                prevItem={prevItem}
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
            top: dragCurrentY - 60,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-3 shadow-2xl border-2 border-blue-400 dark:border-blue-500">
            {(() => {
              const item = timedItems.find(i => i.id === draggedItemId);
              if (!item || !item.startTime) return <div className="text-sm font-medium">시간 이동 중...</div>;

              const minutesChange = Math.round(dragCurrentY - dragStartY);
              const newStartTime = new Date(new Date(item.startTime).getTime() + minutesChange * 60 * 1000);
              const newEndTime = item.endTime
                ? new Date(new Date(item.endTime).getTime() + minutesChange * 60 * 1000)
                : null;

              const formatTime = (date: Date) => {
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes}`;
              };

              return (
                <div className="space-y-1">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {formatTime(newStartTime)} ~ {newEndTime ? formatTime(newEndTime) : ''}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.title}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
