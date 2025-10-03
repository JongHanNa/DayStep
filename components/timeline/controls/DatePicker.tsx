'use client';

import React, { useState } from 'react';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  generateMonthWeeks,
  navigateDate,
  formatDateForViewMode,
  getCurrentTimeInTimezone
} from '@/lib/date-utils';
import { TimelineViewMode } from '@/types/timeline-view';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  viewMode: TimelineViewMode;
  disabled?: boolean;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  date,
  onDateChange,
  viewMode,
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayMonth, setDisplayMonth] = useState(date);
  const today = getCurrentTimeInTimezone();

  // 월 네비게이션
  const navigateMonth = (direction: 'next' | 'previous') => {
    setDisplayMonth(prev => navigateDate(prev, 'monthly', direction));
  };

  // 날짜 선택
  const handleDateSelect = (selectedDate: Date) => {
    onDateChange(selectedDate);
    setIsOpen(false);
  };

  // 월간 달력 생성
  const monthWeeks = generateMonthWeeks(displayMonth);

  // 오늘로 이동
  const goToToday = () => {
    const today = getCurrentTimeInTimezone();
    setDisplayMonth(today);
    onDateChange(today);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal min-w-[200px]",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {date ? formatDateForViewMode(date, viewMode) : "날짜 선택"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-4">
          {/* 월 네비게이션 헤더 */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <h3 className="font-semibold">
              {format(displayMonth, 'yyyy년 M월', { locale: ko })}
            </h3>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-muted-foreground">
            <div>일</div>
            <div>월</div>
            <div>화</div>
            <div>수</div>
            <div>목</div>
            <div>금</div>
            <div>토</div>
          </div>

          {/* 날짜 그리드 */}
          <div className="space-y-1">
            {monthWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  const isSelected = isSameDay(day.date, date);
                  const isToday = isSameDay(day.date, today);
                  
                  return (
                    <Button
                      key={dayIndex}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 text-center text-sm",
                        !day.isCurrentMonth && "text-muted-foreground opacity-50",
                        isToday && !isSelected && "bg-accent text-accent-foreground",
                        day.isWeekend && "text-red-500",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                      onClick={() => handleDateSelect(day.date)}
                    >
                      {day.dayNumber}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 하단 액션 버튼들 */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="text-sm"
            >
              오늘
            </Button>
            
            <div className="text-xs text-muted-foreground">
              {format(today, 'M월 d일 (EEE)', { locale: ko })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;