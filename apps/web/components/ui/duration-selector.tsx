'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DurationSelectorProps {
  selectedHours: number;
  selectedMinutes: number;
  onDurationChange: (hours: number, minutes: number) => void;
  accentColor?: string;
  className?: string;
}

export function DurationSelector({
  selectedHours,
  selectedMinutes,
  onDurationChange,
  accentColor = '#DBAC6C',
  className
}: DurationSelectorProps) {

  // 시간 변경 핸들러
  const handleHourChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newHour = parseInt(event.target.value);
    onDurationChange(newHour, selectedMinutes);
  }, [selectedMinutes, onDurationChange]);

  // 분 변경 핸들러
  const handleMinuteChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newMinute = parseInt(event.target.value);
    onDurationChange(selectedHours, newMinute);
  }, [selectedHours, onDurationChange]);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-full p-6 rounded-lg" style={{ backgroundColor: '#f8f8f8' }}>

        {/* 시간 슬라이더 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: '#666666' }}>
              시간
            </label>
            <div
              className="px-3 py-1 rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {selectedHours}시간
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="23"
              value={selectedHours}
              onChange={handleHourChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${(selectedHours / 23) * 100}%, #e5e7eb ${(selectedHours / 23) * 100}%, #e5e7eb 100%)`
              }}
            />

            {/* 시간 눈금 표시 */}
            <div className="flex justify-between mt-2 text-xs" style={{ color: '#999999' }}>
              <span>0</span>
              <span>6</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </div>
        </div>

        {/* 분 슬라이더 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium" style={{ color: '#666666' }}>
              분
            </label>
            <div
              className="px-3 py-1 rounded-md text-sm font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {selectedMinutes}분
            </div>
          </div>

          <div className="relative">
            <input
              type="range"
              min="0"
              max="59"
              value={selectedMinutes}
              onChange={handleMinuteChange}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${(selectedMinutes / 59) * 100}%, #e5e7eb ${(selectedMinutes / 59) * 100}%, #e5e7eb 100%)`
              }}
            />

            {/* 분 눈금 표시 */}
            <div className="flex justify-between mt-2 text-xs" style={{ color: '#999999' }}>
              <span>0</span>
              <span>15</span>
              <span>30</span>
              <span>45</span>
              <span>59</span>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${accentColor};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${accentColor};
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}