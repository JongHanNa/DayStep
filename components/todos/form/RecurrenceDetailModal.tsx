'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RecurrenceSettings from './RecurrenceSettings';
import type { RecurrencePattern } from '@/types';
import { format } from 'date-fns';

interface RecurrenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  // RecurrenceSettings props
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  recurrenceCount?: number;
  recurrenceEndType: 'never' | 'date' | 'count';
  selectedDaysOfWeek: number[];
  onRecurrencePatternChange: (pattern: RecurrencePattern) => void;
  onRecurrenceIntervalChange: (interval: number) => void;
  onRecurrenceEndDateChange: (date: string) => void;
  onRecurrenceCountChange: (count?: number) => void;
  onRecurrenceEndTypeChange: (type: 'never' | 'date' | 'count') => void;
  onDayOfWeekToggle: (dayValue: number) => void;
  // 추가 props
  originalStartDate?: Date; // 반복 시작 날짜
  onOriginalStartDateChange?: (date: Date) => void;
  isRecurrenceInstance?: boolean; // 반복 인스턴스인 경우 시작 날짜 수정 불가
}

/**
 * 반복 설정 상세 모달
 *
 * 기존 RecurrenceSettings를 래핑하고, 반복 시작 날짜를 추가로 표시
 */
const RecurrenceDetailModal: React.FC<RecurrenceDetailModalProps> = ({
  isOpen,
  onClose,
  recurrencePattern,
  recurrenceInterval,
  recurrenceEndDate,
  recurrenceCount,
  recurrenceEndType,
  selectedDaysOfWeek,
  onRecurrencePatternChange,
  onRecurrenceIntervalChange,
  onRecurrenceEndDateChange,
  onRecurrenceCountChange,
  onRecurrenceEndTypeChange,
  onDayOfWeekToggle,
  originalStartDate,
  onOriginalStartDateChange,
  isRecurrenceInstance = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value && onOriginalStartDateChange) {
      onOriginalStartDateChange(new Date(e.target.value));
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm mx-4 max-h-[85vh] overflow-y-auto"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-base-300 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-bold">반복</h2>
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
          {/* RecurrenceSettings */}
          <RecurrenceSettings
            showRecurrenceSettings={true}
            recurrencePattern={recurrencePattern}
            recurrenceInterval={recurrenceInterval}
            recurrenceEndDate={recurrenceEndDate}
            recurrenceCount={recurrenceCount}
            recurrenceEndType={recurrenceEndType}
            selectedDaysOfWeek={selectedDaysOfWeek}
            onRecurrencePatternChange={onRecurrencePatternChange}
            onRecurrenceIntervalChange={onRecurrenceIntervalChange}
            onRecurrenceEndDateChange={onRecurrenceEndDateChange}
            onRecurrenceCountChange={onRecurrenceCountChange}
            onRecurrenceEndTypeChange={onRecurrenceEndTypeChange}
            onDayOfWeekToggle={onDayOfWeekToggle}
          />

          {/* 반복 시작 날짜 (반복 패턴이 있을 때만 표시) */}
          {recurrencePattern !== 'none' && (
            <div className="space-y-2 pt-4 border-t border-base-300">
              <label className="text-sm font-medium text-base-content/70">
                시작
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  type="date"
                  value={originalStartDate ? format(originalStartDate, 'yyyy-MM-dd') : ''}
                  onChange={handleStartDateChange}
                  disabled={isRecurrenceInstance}
                  className="input input-bordered w-full pl-10 disabled:opacity-50"
                />
              </div>
              {isRecurrenceInstance && (
                <p className="text-xs text-base-content/50">
                  반복 인스턴스의 시작 날짜는 변경할 수 없습니다.
                </p>
              )}
            </div>
          )}

          {/* 안내 문구 */}
          {recurrencePattern !== 'none' && recurrenceEndType === 'never' && (
            <div className="p-3 bg-base-200 rounded-lg text-sm text-base-content/70 text-center">
              이 일정이 계속 반복됩니다.
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 p-4 border-t border-base-300 bg-white dark:bg-gray-800">
          <Button
            type="button"
            onClick={onClose}
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

export default RecurrenceDetailModal;
