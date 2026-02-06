'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { getYear, getMonth, setMonth, setYear } from 'date-fns';

interface MonthPickerPopoverProps {
  isOpen: boolean;
  currentDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

/**
 * 월 선택 팝오버 컴포넌트
 *
 * - 년도 표시 + 이전/다음 년도 버튼
 * - 1~12월 그리드 (4열 x 3행)
 * - 현재 선택된 월 하이라이트
 */
export function MonthPickerPopover({
  isOpen,
  currentDate,
  onSelect,
  onClose
}: MonthPickerPopoverProps) {
  const [displayYear, setDisplayYear] = useState(getYear(currentDate));
  const popoverRef = useRef<HTMLDivElement>(null);

  // 현재 선택된 월 (0-indexed)
  const selectedMonth = getMonth(currentDate);
  const selectedYear = getYear(currentDate);
  const todayYear = getYear(new Date());

  // currentDate 변경 시 displayYear 동기화
  useEffect(() => {
    setDisplayYear(getYear(currentDate));
  }, [currentDate]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // 이전 년도
  const handlePrevYear = () => {
    setDisplayYear(prev => prev - 1);
  };

  // 다음 년도
  const handleNextYear = () => {
    setDisplayYear(prev => prev + 1);
  };

  // 오늘 년도로
  const handleTodayYear = () => {
    setDisplayYear(todayYear);
  };

  // 월 선택
  const handleMonthSelect = (monthIndex: number) => {
    let newDate = setYear(currentDate, displayYear);
    newDate = setMonth(newDate, monthIndex);
    onSelect(newDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-2 bg-base-100 rounded-xl shadow-xl border border-base-300 p-4 z-50 min-w-[240px]"
    >
      {/* 년도 선택 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-bold">{displayYear}</span>
        <div className="flex gap-1">
          <button
            onClick={handlePrevYear}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="이전 년도"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={handleTodayYear}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="오늘 년도로"
          >
            <Circle className="w-3 h-3" />
          </button>
          <button
            onClick={handleNextYear}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label="다음 년도"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 월 그리드 */}
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i).map(monthIndex => {
          const isSelected = displayYear === selectedYear && monthIndex === selectedMonth;
          const isToday = displayYear === todayYear && monthIndex === getMonth(new Date());

          return (
            <button
              key={monthIndex}
              onClick={() => handleMonthSelect(monthIndex)}
              className={`py-2 rounded-full text-sm transition-colors ${
                isSelected
                  ? 'bg-primary text-primary-content'
                  : isToday
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : 'hover:bg-base-200'
              }`}
            >
              {monthIndex + 1}월
            </button>
          );
        })}
      </div>
    </div>
  );
}
