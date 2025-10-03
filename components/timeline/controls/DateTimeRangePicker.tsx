'use client';

import React, { useState } from 'react';
import { CalendarRange, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import { TimelineViewMode } from '@/types/timeline-view';
import { formatDateForViewMode, formatTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface DateTimeRange {
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
}

interface DateTimeRangePickerProps {
  value: DateTimeRange;
  onChange: (range: DateTimeRange) => void;
  viewMode: TimelineViewMode;
  allowRange?: boolean;
  allowAllDay?: boolean;
  disabled?: boolean;
  className?: string;
}

const DateTimeRangePicker: React.FC<DateTimeRangePickerProps> = ({
  value,
  onChange,
  viewMode,
  allowRange = true,
  allowAllDay = true,
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // 시작 날짜 변경
  const handleStartDateChange = (date: Date) => {
    onChange({
      ...value,
      startDate: date,
      // 끝 날짜가 시작 날짜보다 빠르면 조정
      endDate: value.endDate && value.endDate < date ? date : value.endDate
    });
  };

  // 끝 날짜 변경
  const handleEndDateChange = (date: Date) => {
    onChange({
      ...value,
      endDate: date
    });
  };

  // 시작 시간 변경
  const handleStartTimeChange = (date: Date) => {
    onChange({
      ...value,
      startDate: date
    });
  };

  // 끝 시간 변경
  const handleEndTimeChange = (date: Date) => {
    if (value.endDate) {
      onChange({
        ...value,
        endDate: date
      });
    }
  };

  // 종일 토글
  const handleAllDayToggle = (isAllDay: boolean) => {
    onChange({
      ...value,
      isAllDay
    });
  };

  // 범위 토글
  const handleRangeToggle = () => {
    if (value.endDate) {
      // 범위 해제
      onChange({
        ...value,
        endDate: undefined
      });
    } else {
      // 범위 설정 (시작 날짜와 같은 날짜로)
      onChange({
        ...value,
        endDate: value.startDate
      });
    }
  };

  // 표시 텍스트 생성
  const getDisplayText = () => {
    const startStr = formatDateForViewMode(value.startDate, viewMode);
    
    if (!value.endDate) {
      // 단일 날짜/시간
      if (value.isAllDay) {
        return `${startStr} (종일)`;
      } else {
        return `${startStr} ${formatTime(value.startDate)}`;
      }
    } else {
      // 범위
      const endStr = formatDateForViewMode(value.endDate, viewMode);
      
      if (value.isAllDay) {
        return `${startStr} - ${endStr} (종일)`;
      } else {
        return `${startStr} ${formatTime(value.startDate)} - ${endStr} ${formatTime(value.endDate)}`;
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal min-w-[250px]",
            className
          )}
          disabled={disabled}
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">날짜/시간 설정</h3>
            {allowRange && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRangeToggle}
                className="text-xs"
              >
                {value.endDate ? "단일 선택" : "범위 선택"}
              </Button>
            )}
          </div>

          {/* 종일 스위치 */}
          {allowAllDay && (
            <div className="flex items-center space-x-2">
              <Switch
                id="all-day"
                checked={value.isAllDay}
                onCheckedChange={handleAllDayToggle}
              />
              <Label htmlFor="all-day" className="text-sm">
                종일
              </Label>
            </div>
          )}

          {/* 시작 날짜/시간 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {value.endDate ? "시작" : "날짜"}
            </Label>
            <div className="flex gap-2">
              <DatePicker
                date={value.startDate}
                onDateChange={handleStartDateChange}
                viewMode={viewMode}
                className="flex-1"
              />
              {!value.isAllDay && (
                <TimePicker
                  date={value.startDate}
                  onTimeChange={handleStartTimeChange}
                  className="w-32"
                />
              )}
            </div>
          </div>

          {/* 끝 날짜/시간 (범위 선택 시) */}
          {value.endDate && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">끝</Label>
              <div className="flex gap-2">
                <DatePicker
                  date={value.endDate}
                  onDateChange={handleEndDateChange}
                  viewMode={viewMode}
                  className="flex-1"
                />
                {!value.isAllDay && (
                  <TimePicker
                    date={value.endDate}
                    onTimeChange={handleEndTimeChange}
                    className="w-32"
                  />
                )}
              </div>
            </div>
          )}

          {/* 미리보기 */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              미리보기: {getDisplayText()}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateTimeRangePicker;