'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addDays, isToday, isTomorrow, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | undefined;
  onDateChange: (date: Date) => void;
  title?: string;
}

/**
 * 날짜 선택 상세 모달
 */
const DateDetailModal: React.FC<DateDetailModalProps> = ({
  isOpen,
  onClose,
  date,
  onDateChange,
  title = '날짜 설정',
}) => {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(date);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(date);
    }
  }, [isOpen, date]);

  if (!isOpen || !mounted) return null;

  const handleQuickSelect = (newDate: Date) => {
    setSelectedDate(newDate);
    onDateChange(newDate);
    onClose();
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const newDate = startOfDay(new Date(e.target.value));
      setSelectedDate(newDate);
    }
  };

  const handleConfirm = () => {
    if (selectedDate) {
      onDateChange(selectedDate);
    }
    onClose();
  };

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  // 상대적 날짜 라벨
  const getRelativeLabel = (d: Date) => {
    if (isToday(d)) return '오늘';
    if (isTomorrow(d)) return '내일';
    return null;
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm mx-4"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-4 space-y-4">
          {/* 빠른 선택 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={selectedDate && isToday(selectedDate) ? 'default' : 'outline'}
              onClick={() => handleQuickSelect(today)}
              className="flex-1 rounded-full"
            >
              오늘
            </Button>
            <Button
              type="button"
              variant={selectedDate && isTomorrow(selectedDate) ? 'default' : 'outline'}
              onClick={() => handleQuickSelect(tomorrow)}
              className="flex-1 rounded-full"
            >
              내일
            </Button>
          </div>

          {/* 날짜 입력 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content/70">
              날짜 직접 선택
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={handleDateInputChange}
                className="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          {/* 선택된 날짜 표시 */}
          {selectedDate && (
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <span className="font-medium">
                {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
              </span>
              {getRelativeLabel(selectedDate) && (
                <span className="ml-2 text-primary font-semibold">
                  {getRelativeLabel(selectedDate)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-base-300">
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded-full"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DateDetailModal;
