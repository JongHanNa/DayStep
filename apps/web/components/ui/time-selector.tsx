'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeOption {
  value: string;
  label: string;
}

interface TimeSelectorProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  accentColor?: string;
  className?: string;
  maxEndTime?: string; // 최대 종료 시간 제한 (예: "24:00")
  duration?: number; // 간격(분)
}

export function TimeSelector({
  selectedTime,
  onTimeChange,
  accentColor = '#DBAC6C',
  className,
  maxEndTime = "24:00",
  duration = 60
}: TimeSelectorProps) {
  // 시간 옵션 생성 (30분 간격으로)
  const generateTimeOptions = (): TimeOption[] => {
    const options: TimeOption[] = [];
    const maxEndMinutes = 24 * 60 + 12 * 60; // 다음날 12:00까지
    const durationMinutes = duration;

    for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 30) {
      const endTotalMinutes = totalMinutes + durationMinutes;

      // 최대 종료 시간을 초과하지 않는 경우만 포함
      if (endTotalMinutes <= maxEndMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const timeValue = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        options.push({
          value: timeValue,
          label: `${hours}:${String(minutes).padStart(2, '0')}`
        });
      }
    }

    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className={cn("space-y-2", className)}>
      {/* 시간 버튼 그리드 */}
      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
        {timeOptions.map((option) => {
          const isSelected = selectedTime === option.value;

          return (
            <Button
              key={option.value}
              variant="ghost"
              onClick={() => onTimeChange(option.value)}
              className={cn(
                "h-8 px-2 py-1 text-xs font-medium rounded-lg transition-all duration-200",
                "border-0 shadow-none text-center",
                isSelected
                  ? "text-white"
                  : "bg-transparent hover:bg-gray-50"
              )}
              style={{
                ...(isSelected
                  ? {
                      backgroundColor: accentColor,
                      color: 'white'
                    }
                  : {
                      color: '#b9b9b9'
                    })
              }}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}