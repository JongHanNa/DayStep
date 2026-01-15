'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { differenceInMinutes, parse, format as formatDate } from 'date-fns';

type ScheduleType = 'none' | 'anytime' | 'timed' | 'all_day';

interface TimeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleType: ScheduleType;
  startTime?: string; // HH:mm 형식
  endTime?: string; // HH:mm 형식
  includeEndDate?: boolean;
  anytimeDuration?: number; // 분 단위
  onScheduleTypeChange: (type: ScheduleType) => void;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  onIncludeEndDateChange: (include: boolean) => void;
  onAnytimeDurationChange: (duration: number) => void;
}

const scheduleTypeOptions: { value: ScheduleType; label: string; description: string }[] = [
  { value: 'timed', label: '시간지정', description: '특정 시간에 시작' },
  { value: 'anytime', label: '언제든지', description: '타임라인에서 시작' },
  { value: 'all_day', label: '종일', description: '하루 종일' },
];

const durationOptions = [15, 30, 45, 60, 90, 120];

/**
 * 시간 설정 상세 모달
 */
const TimeDetailModal: React.FC<TimeDetailModalProps> = ({
  isOpen,
  onClose,
  scheduleType,
  startTime = '',
  endTime = '',
  includeEndDate = false,
  anytimeDuration = 30,
  onScheduleTypeChange,
  onStartTimeChange,
  onEndTimeChange,
  onIncludeEndDateChange,
  onAnytimeDurationChange,
}) => {
  const [mounted, setMounted] = useState(false);
  const [localScheduleType, setLocalScheduleType] = useState(scheduleType);
  const [localStartTime, setLocalStartTime] = useState(startTime);
  const [localEndTime, setLocalEndTime] = useState(endTime);
  const [localIncludeEnd, setLocalIncludeEnd] = useState(includeEndDate);
  const [localDuration, setLocalDuration] = useState(anytimeDuration);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLocalScheduleType(scheduleType);
      setLocalStartTime(startTime);
      setLocalEndTime(endTime);
      setLocalIncludeEnd(includeEndDate);
      setLocalDuration(anytimeDuration);
    }
  }, [isOpen, scheduleType, startTime, endTime, includeEndDate, anytimeDuration]);

  if (!isOpen || !mounted) return null;

  // 소요 시간 계산
  const calculateDuration = () => {
    if (!localStartTime || !localEndTime) return null;
    try {
      const start = parse(localStartTime, 'HH:mm', new Date());
      const end = parse(localEndTime, 'HH:mm', new Date());
      const minutes = differenceInMinutes(end, start);
      if (minutes <= 0) return null;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0 && mins > 0) return `${hours}시간 ${mins}분`;
      if (hours > 0) return `${hours}시간`;
      return `${mins}분`;
    } catch {
      return null;
    }
  };

  const handleConfirm = () => {
    onScheduleTypeChange(localScheduleType);
    if (localScheduleType === 'timed') {
      onStartTimeChange(localStartTime);
      if (localIncludeEnd) {
        onEndTimeChange(localEndTime);
      }
      onIncludeEndDateChange(localIncludeEnd);
    } else if (localScheduleType === 'anytime') {
      onAnytimeDurationChange(localDuration);
    }
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 999999 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto"
        style={{ zIndex: 1000000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-base-300 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-bold">시간 설정</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-4 space-y-6">
          {/* 일정 유형 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-base-content/70">
              일정 유형
            </label>
            <div className="grid grid-cols-3 gap-2">
              {scheduleTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLocalScheduleType(option.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-colors text-center',
                    localScheduleType === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-base-300 hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 시간지정일 때 */}
          {localScheduleType === 'timed' && (
            <>
              {/* 시작 시간 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-base-content/70">
                  시작 시간
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                  <input
                    type="time"
                    value={localStartTime}
                    onChange={(e) => setLocalStartTime(e.target.value)}
                    className="input input-bordered w-full pl-10"
                  />
                </div>
              </div>

              {/* 종료 시간 토글 */}
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <span className="font-medium">종료 시간 설정</span>
                <input
                  type="checkbox"
                  checked={localIncludeEnd}
                  onChange={(e) => setLocalIncludeEnd(e.target.checked)}
                  className="toggle toggle-primary"
                />
              </div>

              {/* 종료 시간 */}
              {localIncludeEnd && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-base-content/70">
                    종료 시간
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                    <input
                      type="time"
                      value={localEndTime}
                      onChange={(e) => setLocalEndTime(e.target.value)}
                      className="input input-bordered w-full pl-10"
                    />
                  </div>
                  {/* 소요 시간 표시 */}
                  {calculateDuration() && (
                    <div className="text-sm text-base-content/60 text-center">
                      소요 시간: {calculateDuration()}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* 언제든지일 때 */}
          {localScheduleType === 'anytime' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70">
                예상 소요 시간
              </label>
              <div className="grid grid-cols-3 gap-2">
                {durationOptions.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setLocalDuration(mins)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-colors',
                      localDuration === mins
                        ? 'border-primary bg-primary/10'
                        : 'border-base-300 hover:border-primary/50'
                    )}
                  >
                    {mins < 60 ? `${mins}분` : `${mins / 60}시간`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 종일일 때 */}
          {localScheduleType === 'all_day' && (
            <div className="p-4 bg-base-200 rounded-lg text-center text-base-content/70">
              하루 종일 일정으로 설정됩니다.
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 p-4 border-t border-base-300 bg-white dark:bg-gray-800">
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

export default TimeDetailModal;
