'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ToggleButtonGroup } from '@/components/ui/toggle-button-group';
import { DateSelector } from '@/components/ui/date-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecurrencePattern } from '@/types';
import { PASTEL_COLORS } from '@/lib/color-palette';

export interface RecurrenceSettingsProps {
  showRecurrenceSettings: boolean;
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
  selectedColor?: string;
}

const RecurrenceSettings: React.FC<RecurrenceSettingsProps> = ({
  showRecurrenceSettings,
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
  selectedColor,
}) => {
  const weekDays = useMemo(() => [
    { label: '월', value: 1 },
    { label: '화', value: 2 },
    { label: '수', value: 3 },
    { label: '목', value: 4 },
    { label: '금', value: 5 },
    { label: '토', value: 6 },
    { label: '일', value: 0 }
  ], []);

  const getIntervalLabel = useCallback((pattern: RecurrencePattern, interval: number): string => {
    switch (pattern) {
      case 'daily': return interval === 1 ? '일마다' : `${interval}일마다`;
      case 'weekly': return interval === 1 ? '주마다' : `${interval}주마다`;
      case 'monthly': return interval === 1 ? '달마다' : `${interval}달마다`;
      default: return '';
    }
  }, []);

  const handleIntervalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onRecurrenceIntervalChange(parseInt(e.target.value) || 1);
  }, [onRecurrenceIntervalChange]);


  const handleCountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onRecurrenceCountChange(parseInt(e.target.value) || undefined);
  }, [onRecurrenceCountChange]);

  // 선택된 색상 정보 가져오기 - PASTEL_COLORS에서 직접 찾아서 DEFAULT_COLOR fallback 방지
  const colorData = selectedColor
    ? PASTEL_COLORS.find(color => color.id === selectedColor) || null
    : null;

  return (
    <div className="my-2">
      <Label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
        <Repeat className="w-5 h-5" style={{ color: colorData?.hex || '#DBAC6C' }} />
        반복 설정
      </Label>

      <div className="space-y-4 p-4 rounded-lg bg-base-200">

      <div>
        <Label style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>반복 패턴</Label>
        <ToggleButtonGroup
          options={[
            { value: "none", label: "반복 안함" },
            { value: "daily", label: "매일" },
            { value: "weekly", label: "매주" },
            { value: "monthly", label: "매달" }
          ]}
          value={recurrencePattern}
          onValueChange={(value) => onRecurrencePatternChange(value as RecurrencePattern)}
          accentColor={colorData?.hex || '#DBAC6C'}
          className="w-full"
        />
      </div>

      {recurrencePattern !== 'none' && (
        <>
          <div>
            <Label style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>반복 간격</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={recurrenceInterval}
                onChange={handleIntervalChange}
                className="w-20"
              />
              <span className="text-sm text-gray-600">{getIntervalLabel(recurrencePattern, recurrenceInterval)}</span>
            </div>
          </div>

          {recurrencePattern === 'weekly' && (
            <div>
              <Label style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>반복 요일</Label>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const isSelected = selectedDaysOfWeek.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => onDayOfWeekToggle(day.value)}
                      className={`h-10 w-10 text-sm font-medium rounded-full transition-all duration-200 border-0 shadow-none hover:opacity-80 flex items-center justify-center ${!isSelected ? 'bg-base-100' : ''}`}
                      style={{
                        backgroundColor: isSelected ? (colorData?.hex || '#DBAC6C') : undefined,
                        color: isSelected ? 'white' : '#999999',
                      }}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Label style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>반복 종료</Label>
            <ToggleButtonGroup
              options={[
                { value: "never", label: "종료 없음" },
                { value: "date", label: "날짜 지정" },
                { value: "count", label: "횟수 지정" }
              ]}
              value={recurrenceEndType}
              onValueChange={(value) => onRecurrenceEndTypeChange(value as 'never' | 'date' | 'count')}
              accentColor={colorData?.hex || '#DBAC6C'}
              className="w-full mb-3"
            />

            {/* 날짜 지정 옵션 */}
            {recurrenceEndType === 'date' && (
              <div className="mt-3">
                <DateSelector
                  selectedDate={recurrenceEndDate}
                  onDateChange={onRecurrenceEndDateChange}
                  accentColor={colorData?.hex || '#DBAC6C'}
                  showQuickOptions={false}
                  useMinimalCalendar={true}
                />
              </div>
            )}

            {/* 횟수 지정 옵션 */}
            {recurrenceEndType === 'count' && (
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={recurrenceCount || ''}
                  onChange={handleCountChange}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">회</span>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default memo(RecurrenceSettings);