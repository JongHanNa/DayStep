'use client';

import React, { useState, useCallback } from 'react';
import { Sheet } from 'react-modal-sheet';
import { Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MinimalCalendar } from '@/components/ui/minimal-calendar';
import { format, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createModalConfig } from '@/lib/modal-config';

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  accentColor?: string;
  title?: string;
}

export function CalendarModal({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
  accentColor = '#DBAC6C',
  title = '날짜 선택'
}: CalendarModalProps) {
  const [dragDisabled, setDragDisabled] = useState(false);

  // 빠른 날짜 선택 옵션
  const quickDateOptions = React.useMemo(() => {
    const today = new Date();
    return [
      {
        value: format(today, 'yyyy-MM-dd'),
        label: '오늘',
        subLabel: format(today, 'M월 d일 (E)', { locale: ko })
      },
      {
        value: format(addDays(today, 1), 'yyyy-MM-dd'),
        label: '내일',
        subLabel: format(addDays(today, 1), 'M월 d일 (E)', { locale: ko })
      },
      {
        value: format(addDays(today, 2), 'yyyy-MM-dd'),
        label: '모레',
        subLabel: format(addDays(today, 2), 'M월 d일 (E)', { locale: ko })
      }
    ];
  }, []);

  const handleDateSelect = useCallback((date: string) => {
    onDateSelect(date);
    onOpenChange(false);
  }, [onDateSelect, onOpenChange]);

  const handleTouchStart = useCallback(() => {
    setDragDisabled(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setTimeout(() => setDragDisabled(false), 100);
  }, []);

  return (
    <Sheet
      isOpen={open}
      onClose={() => onOpenChange(false)}
      {...createModalConfig('FULLSCREEN', {
        disableDrag: dragDisabled,
      })}
    >
      <Sheet.Container className="bg-background">
        <Sheet.Header className="border-b border-border bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Calendar
                className="h-5 w-5"
                style={{ color: accentColor }}
              />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Sheet.Header>

        <Sheet.Content className="bg-white">
          <div
            className="px-4 py-6 space-y-6 h-full overflow-y-auto"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* 빠른 날짜 선택 버튼들 */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">빠른 선택</h3>
              <div className="grid grid-cols-3 gap-3">
                {quickDateOptions.map((option) => {
                  const isSelected = selectedDate === option.value;

                  return (
                    <Button
                      key={option.value}
                      variant="ghost"
                      onClick={() => handleDateSelect(option.value)}
                      className={cn(
                        "h-16 px-3 py-2 font-medium rounded-xl transition-all duration-200",
                        "border-0 shadow-none flex flex-col items-center justify-center",
                        "hover:scale-105 active:scale-95",
                        isSelected
                          ? "text-white shadow-md"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                      )}
                      style={{
                        ...(isSelected
                          ? {
                              backgroundColor: accentColor,
                              color: 'white'
                            }
                          : {})
                      }}
                    >
                      <span className="text-sm font-semibold">{option.label}</span>
                      <span
                        className="text-xs mt-1"
                        style={{
                          color: isSelected ? 'rgba(255,255,255,0.9)' : '#9ca3af'
                        }}
                      >
                        {option.subLabel}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* 달력 */}
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-3">달력에서 선택</h3>
              <div className="p-4 bg-gray-50 rounded-xl">
                <MinimalCalendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  accentColor={accentColor}
                />
              </div>
            </div>

            {/* 선택된 날짜 표시 */}
            {selectedDate && (
              <div className="text-center pt-4">
                <div
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: `${accentColor}20`,
                    color: accentColor,
                    border: `1px solid ${accentColor}40`
                  }}
                >
                  선택된 날짜: {format(new Date(selectedDate), 'yyyy년 M월 d일 (E)', { locale: ko })}
                </div>
              </div>
            )}

            {/* 하단 여백 */}
            <div className="h-8" />
          </div>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}