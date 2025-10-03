'use client';

import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateSelector } from '@/components/ui/date-selector';
import { ScrollTimePicker } from '@/components/ui/scroll-time-picker';
import { format } from 'date-fns';
import { getColorById } from '@/lib/color-palette';

interface DepartureSettingsProps {
  departureLocation: string;
  departureDate: string;
  departureTime: string;
  onLocationChange: (location: string) => void;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  selectedColor?: string;
}

const DepartureSettings: React.FC<DepartureSettingsProps> = ({
  departureLocation,
  departureDate,
  departureTime,
  onLocationChange,
  onDateChange,
  onTimeChange,
  selectedColor,
}) => {
  // 날짜 변경 핸들러 - DateSelector는 항상 유효한 값을 전달하므로 단순화
  const handleDateChange = (value: string) => {
    onDateChange(value);
  };

  // 시간 변경 핸들러 - ScrollTimePicker는 항상 유효한 값을 전달하므로 단순화
  const handleTimeChange = (value: string) => {
    onTimeChange(value);
  };

  // 선택된 색상 정보 가져오기
  const colorData = selectedColor ? getColorById(selectedColor) : null;

  return (
    <div className="mx-4 my-2">
      {/* 섹션 헤더 */}
      <Label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
        <MapPin className="w-5 h-5" style={{ color: colorData?.hex || '#DBAC6C' }} />
        출발 정보
        <span className="text-xs text-muted-foreground ml-1 font-normal">(선택사항)</span>
      </Label>

      {/* 실제 컨트롤들은 배경 안에 */}
      <div className="space-y-4 p-4 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>
        {/* 출발 장소 입력 */}
        <div className="space-y-2">
          <Label htmlFor="departure-location" style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>
            출발 장소
          </Label>
          <Input
            id="departure-location"
            type="text"
            placeholder="예: 집, 회사, 카페 등"
            value={departureLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* 출발 날짜 입력 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="departure-date" style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>
              출발 날짜
            </Label>
            <DateSelector
              selectedDate={departureDate}
              onDateChange={handleDateChange}
              accentColor={colorData?.hex || '#DBAC6C'}
              showQuickOptions={false}
              useMinimalCalendar={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="departure-time" style={{ color: '#666666', marginBottom: '8px', display: 'block' }}>
              출발 시간
            </Label>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff' }}>
              <ScrollTimePicker
                selectedTime={departureTime}
                onTimeChange={handleTimeChange}
                accentColor={colorData?.hex || '#DBAC6C'}
                durationMinutes={0} // 출발 시간은 단일 시간만 표시
              />
            </div>
          </div>
        </div>

        {/* 도움말 텍스트 */}
        <p className="text-xs text-gray-600 mt-3">
          출발 정보는 일정 계획에 도움이 되는 참고 정보입니다. 필요에 따라 작성해 주세요.
        </p>
      </div>
    </div>
  );
};

export default DepartureSettings;