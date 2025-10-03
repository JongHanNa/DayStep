'use client';

import React, { useState, useEffect } from 'react';
import { format, setHours, setMinutes, getHours, getMinutes } from 'date-fns';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  date: Date;
  onTimeChange: (date: Date) => void;
  format24h?: boolean;
  minuteStep?: number;
  disabled?: boolean;
  className?: string;
}

const TimePicker: React.FC<TimePickerProps> = ({
  date,
  onTimeChange,
  format24h = true,
  minuteStep = 15,
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(getHours(date));
  const [selectedMinute, setSelectedMinute] = useState(getMinutes(date));

  // 시간이 변경될 때 동기화
  useEffect(() => {
    setSelectedHour(getHours(date));
    setSelectedMinute(getMinutes(date));
  }, [date]);

  // 시간 리스트 생성 (24시간 또는 12시간)
  const hours = React.useMemo(() => {
    if (format24h) {
      return Array.from({ length: 24 }, (_, i) => i);
    } else {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
  }, [format24h]);

  // 분 리스트 생성 (step에 따라)
  const minutes = React.useMemo(() => {
    return Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
  }, [minuteStep]);

  // 시간 선택
  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const newDate = setHours(date, hour);
    onTimeChange(newDate);
  };

  // 분 선택
  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const newDate = setMinutes(date, minute);
    onTimeChange(newDate);
  };

  // 현재 시간으로 설정
  const setToCurrentTime = () => {
    const now = new Date();
    const newDate = setMinutes(setHours(date, getHours(now)), getMinutes(now));
    onTimeChange(newDate);
    setIsOpen(false);
  };

  // 시간 포맷팅
  const formatTime = (date: Date) => {
    if (format24h) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'h:mm a');
    }
  };

  // 12시간 형식에서 AM/PM 변환
  const toggleAmPm = () => {
    const currentHour = getHours(date);
    const newHour = currentHour < 12 ? currentHour + 12 : currentHour - 12;
    const newDate = setHours(date, newHour);
    onTimeChange(newDate);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatTime(date)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 space-y-4">
          {/* 시간 선택 헤더 */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">시간 선택</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={setToCurrentTime}
              className="text-xs"
            >
              현재 시간
            </Button>
          </div>

          {/* 시간/분 선택 그리드 */}
          <div className="flex gap-4">
            {/* 시간 선택 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-center">
                시간
              </div>
              <ScrollArea className="h-32 w-16">
                <div className="space-y-1">
                  {hours.map((hour) => (
                    <Button
                      key={hour}
                      variant={selectedHour === hour ? "default" : "ghost"}
                      size="sm"
                      className="w-full h-8 text-sm"
                      onClick={() => handleHourSelect(hour)}
                    >
                      {format24h ? hour.toString().padStart(2, '0') : hour}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* 분 선택 */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-center">
                분
              </div>
              <ScrollArea className="h-32 w-16">
                <div className="space-y-1">
                  {minutes.map((minute) => (
                    <Button
                      key={minute}
                      variant={selectedMinute === minute ? "default" : "ghost"}
                      size="sm"
                      className="w-full h-8 text-sm"
                      onClick={() => handleMinuteSelect(minute)}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* AM/PM 선택 (12시간 형식일 때만) */}
            {!format24h && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-center">
                  AM/PM
                </div>
                <div className="space-y-1">
                  <Button
                    variant={getHours(date) < 12 ? "default" : "ghost"}
                    size="sm"
                    className="w-16 h-8 text-sm"
                    onClick={toggleAmPm}
                  >
                    AM
                  </Button>
                  <Button
                    variant={getHours(date) >= 12 ? "default" : "ghost"}
                    size="sm"
                    className="w-16 h-8 text-sm"
                    onClick={toggleAmPm}
                  >
                    PM
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 선택된 시간 표시 */}
          <div className="text-center text-sm text-muted-foreground border-t pt-2">
            선택된 시간: {formatTime(date)}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;