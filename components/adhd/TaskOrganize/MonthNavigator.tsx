'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar, Plus } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MonthPickerPopover } from './MonthPickerPopover';

interface MonthNavigatorProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onTodayClick: () => void;
  onAddClick?: () => void;
}

/**
 * 월 네비게이터 컴포넌트
 *
 * - 현재 월 표시 (클릭 시 팝오버)
 * - 이전/다음 달 이동 버튼
 * - 오늘 버튼
 */
export function MonthNavigator({
  currentDate,
  onMonthChange,
  onTodayClick,
  onAddClick
}: MonthNavigatorProps) {
  const [showPopover, setShowPopover] = useState(false);

  // 이전 달로 이동
  const handlePrevMonth = () => {
    onMonthChange(subMonths(currentDate, 1));
  };

  // 다음 달로 이동
  const handleNextMonth = () => {
    onMonthChange(addMonths(currentDate, 1));
  };

  // 월 선택 팝오버에서 선택
  const handleSelectMonth = (date: Date) => {
    onMonthChange(date);
  };

  return (
    <div className="relative flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-300">
      {/* 좌측: 캘린더 아이콘 + 월 표시 */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-base-content/60" />
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-1 text-lg font-semibold hover:text-primary transition-colors"
        >
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
          <ChevronDown className={`w-4 h-4 transition-transform ${showPopover ? 'rotate-180' : ''}`} />
        </button>

        {/* 월 선택 팝오버 */}
        <MonthPickerPopover
          isOpen={showPopover}
          currentDate={currentDate}
          onSelect={handleSelectMonth}
          onClose={() => setShowPopover(false)}
        />
      </div>

      {/* 우측: 네비게이션 버튼들 */}
      <div className="flex items-center gap-1">
        {/* + 할일 추가 버튼 */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="할일 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handlePrevMonth}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="이전 달"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onTodayClick}
          className="btn btn-ghost btn-sm px-3 text-sm"
        >
          오늘
        </button>
        <button
          onClick={handleNextMonth}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="다음 달"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
