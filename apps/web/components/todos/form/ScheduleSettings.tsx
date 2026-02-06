'use client';

import React, { memo, useCallback, useMemo, useEffect, useState } from 'react';
import { format, addMinutes, addDays } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ToggleButtonGroup } from '@/components/ui/toggle-button-group';
import { DurationSelector } from '@/components/ui/duration-selector';
import { ScrollTimePicker } from '@/components/ui/scroll-time-picker';
import { DateSelector } from '@/components/ui/date-selector';
import { DurationModal } from '@/components/ui/duration-modal';
import type { ScheduleType } from '@/types';
import { getColorById } from '@/lib/color-palette';

export interface ScheduleSettingsProps {
  scheduleType: ScheduleType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  durationHours: number;
  durationMins: number;
  onScheduleTypeChange: (type: ScheduleType) => void;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onDurationHoursChange: (hours: number) => void;
  onDurationMinsChange: (mins: number) => void;
  selectedColor?: string;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
  scheduleType,
  startDate,
  startTime,
  endDate,
  endTime,
  durationHours,
  durationMins,
  onScheduleTypeChange,
  onStartDateChange,
  onStartTimeChange,
  onDurationHoursChange,
  onDurationMinsChange,
  selectedColor,
}) => {
  // 드래그업 모달 상태
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);

  const durationMinutes = useMemo(() => {
    return durationHours * 60 + durationMins;
  }, [durationHours, durationMins]);

  // 계산된 종료 시간과 날짜
  const calculatedEndTime = useMemo(() => {
    if (!startTime || !startDate) {
      return { endTime: '', endDate: '' };
    }

    try {
      // 시작 날짜와 시간을 Date 객체로 변환
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const startDateTime = new Date(startDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      // 시간 간격을 더해서 종료 시간 계산
      const endDateTime = addMinutes(startDateTime, durationMinutes);

      // 종료 시간과 날짜 포맷팅
      const calculatedEndTime = format(endDateTime, 'HH:mm');
      const calculatedEndDate = format(endDateTime, 'yyyy-MM-dd');

      return {
        endTime: calculatedEndTime,
        endDate: calculatedEndDate
      };
    } catch (error) {
      return { endTime: '', endDate: '' };
    }
  }, [startTime, startDate, durationMinutes]);

  // 선택된 색상 정보 가져오기
  const colorData = selectedColor ? getColorById(selectedColor) : null;

  // 드래그업 모달 핸들러
  const handleDurationClick = useCallback(() => {
    setIsDurationModalOpen(true);
  }, []);

  const handleDurationModalClose = useCallback(() => {
    setIsDurationModalOpen(false);
  }, []);

  const handleDurationChange = useCallback((hours: number, minutes: number) => {
    onDurationHoursChange(hours);
    onDurationMinsChange(minutes);
  }, [onDurationHoursChange, onDurationMinsChange]);

  return (
    <>
      {/* 일정 유형 선택 */}
      <div className="mx-4 my-2">
        <Label className="text-lg font-semibold mb-3 block flex items-center gap-2" style={{ color: '#808080' }}>
          <Clock size={20} style={{ color: colorData?.hex || '#DBAC6C' }} />
          일정 유형
        </Label>
        <div className="p-2 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>
        <ToggleButtonGroup
          options={[
            { value: "timed", label: "시간 지정" },
            { value: "all_day", label: "종일" },
            { value: "anytime", label: "언제든지" }
          ]}
          value={scheduleType}
          onValueChange={(value) => onScheduleTypeChange(value as ScheduleType)}
          accentColor={colorData?.hex || '#DBAC6C'}
          className="w-full"
        />
        </div>
      </div>

      {scheduleType === 'all_day' || scheduleType === 'anytime' ? (
        <div className="mx-4 my-2">
          <Label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
            <Calendar className="h-5 w-5" style={{ color: colorData?.hex || '#DBAC6C' }} />
            날짜
          </Label>
          <DateSelector
            selectedDate={startDate}
            onDateChange={onStartDateChange}
            accentColor={colorData?.hex || '#DBAC6C'}
            showQuickOptions={false}
            useMinimalCalendar={true}
          />
        </div>
      ) : (
        <>
          {/* 시작 날짜 및 시간 선택 */}
          <div className="mx-4 my-2">
            <Label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
              <Clock className="h-5 w-5" style={{ color: colorData?.hex || '#DBAC6C' }} />
              시작 날짜, 간격 및 시간
            </Label>

            {/* 시작 날짜 선택 - 제목과 회색 배경 사이에 배치 */}
            <DateSelector
              selectedDate={startDate}
              onDateChange={onStartDateChange}
              accentColor={colorData?.hex || '#DBAC6C'}
              showQuickOptions={false}
              useMinimalCalendar={true}
            />

            {/* 시간 간격 버튼 */}
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={handleDurationClick}
                className="flex flex-col items-center px-8 py-5 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200"
                style={{
                  background: `linear-gradient(135deg, ${colorData?.hex || '#DBAC6C'}15, ${colorData?.hex || '#DBAC6C'}08)`,
                  minWidth: '200px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)'
                }}
              >
                <div className="text-sm font-medium text-gray-600 mb-2">⏱️ 시간 간격</div>
                <div
                  className="text-xl font-extrabold mb-1"
                  style={{ color: colorData?.hex || '#DBAC6C' }}
                >
                  {durationHours}시간 {durationMins}분
                </div>
                <div className="text-xs text-gray-500 opacity-75">탭하여 변경</div>
              </button>
            </div>

            {/* 시간 선택 영역 */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>
              <ScrollTimePicker
                selectedTime={startTime}
                onTimeChange={onStartTimeChange}
                accentColor={colorData?.hex || '#DBAC6C'}
                durationMinutes={durationMinutes}
              />
            </div>
          </div>

        </>
      )}

      {/* 시간 간격 드래그업 모달 */}
      <DurationModal
        isOpen={isDurationModalOpen}
        onClose={handleDurationModalClose}
        selectedHours={durationHours}
        selectedMinutes={durationMins}
        onDurationChange={handleDurationChange}
        accentColor={colorData?.hex || '#DBAC6C'}
      />
    </>
  );
};

export default memo(ScheduleSettings);