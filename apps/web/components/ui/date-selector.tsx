'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MinimalCalendar } from '@/components/ui/minimal-calendar';
import { CalendarModal } from '@/components/ui/calendar-modal';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  accentColor?: string;
  className?: string;
  showQuickOptions?: boolean;
  useMinimalCalendar?: boolean;
}

export function DateSelector({
  selectedDate,
  onDateChange,
  accentColor = '#DBAC6C',
  className,
  showQuickOptions = true,
  useMinimalCalendar = true
}: DateSelectorProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const dateOptions = useMemo(() => {
    const today = new Date();
    return [
      {
        value: format(today, 'yyyy-MM-dd'),
        label: '오늘',
        subLabel: format(today, 'M월 d일')
      },
      {
        value: format(addDays(today, 1), 'yyyy-MM-dd'),
        label: '내일',
        subLabel: format(addDays(today, 1), 'M월 d일')
      },
      {
        value: format(addDays(today, 2), 'yyyy-MM-dd'),
        label: '모레',
        subLabel: format(addDays(today, 2), 'M월 d일')
      }
    ];
  }, []);

  const isQuickOption = dateOptions.some(option => option.value === selectedDate);

  const handleCalendarDateSelect = (date: string) => {
    onDateChange(date);
    setShowCalendar(false);
  };

  const handleModalDateSelect = (date: string) => {
    onDateChange(date);
    setShowCalendarModal(false);
  };

  const displayDate = selectedDate
    ? format(new Date(selectedDate), 'yyyy년 M월 d일 (E)', { locale: ko })
    : '날짜 선택';

  return (
    <div className={cn("space-y-3", className)}>
      {/* 빠른 날짜 선택 버튼들 */}
      {showQuickOptions && (
        <div className="grid grid-cols-3 gap-2">
          {dateOptions.map((option) => {
            const isSelected = selectedDate === option.value;

            return (
              <Button
                key={option.value}
                variant="ghost"
                onClick={() => onDateChange(option.value)}
                className={cn(
                  "h-12 px-2 py-1 font-medium rounded-lg transition-all duration-200",
                  "border-0 shadow-none flex flex-col items-center justify-center",
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
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className="text-xs"
                  style={{
                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#d1d5db'
                  }}
                >
                  {option.subLabel}
                </span>
              </Button>
            );
          })}
        </div>
      )}

      {/* 미니멀 달력 또는 기본 날짜 입력 */}
      <div className="space-y-2">
        {useMinimalCalendar ? (
          <div>
            {/* 선택된 날짜 표시 버튼 - 드래그업 모달로 변경 */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCalendarModal(true)}
                className={cn(
                  "h-14 px-6 py-4 justify-center text-center font-bold border-0 bg-white rounded-lg flex items-center gap-3 text-lg",
                  "hover:scale-105 active:scale-95 transition-transform duration-200",
                  !selectedDate && "opacity-70"
                )}
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  backgroundColor: 'white',
                  color: accentColor,
                }}
              >
                <Calendar className="h-6 w-6" style={{ color: accentColor }} />
                {displayDate}
              </Button>
            </div>

            {/* 미니멀 달력 */}
            {showCalendar && (
              <div className="mt-3 p-3 sm:p-4 border rounded-lg bg-white shadow-lg overflow-hidden">
                <MinimalCalendar
                  selectedDate={selectedDate}
                  onDateSelect={handleCalendarDateSelect}
                  accentColor={accentColor}
                />
              </div>
            )}
          </div>
        ) : (
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full"
            style={{
              borderColor: isQuickOption ? 'transparent' : accentColor,
              borderWidth: isQuickOption ? '1px' : '2px'
            }}
          />
        )}

        {/* 사용자 설정 날짜 표시 (기본 input 사용 시에만) */}
        {!useMinimalCalendar && !isQuickOption && selectedDate && (
          <div className="text-center">
            <div
              className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
            >
              사용자 선택: {format(new Date(selectedDate), 'M월 d일 (E)', { locale: ko })}
            </div>
          </div>
        )}
      </div>

      {/* 드래그업 달력 모달 */}
      <CalendarModal
        open={showCalendarModal}
        onOpenChange={setShowCalendarModal}
        selectedDate={selectedDate}
        onDateSelect={handleModalDateSelect}
        accentColor={accentColor}
        title="날짜 선택"
      />
    </div>
  );
}