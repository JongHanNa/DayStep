'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

interface MinuteSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export const MinuteSlider: React.FC<MinuteSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 60,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // props의 value가 변경되면 localValue 업데이트
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return localValue;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = Math.round(min + percentage * (max - min));
    
    return Math.max(min, Math.min(max, newValue));
  }, [min, max, localValue]);

  const handleStart = useCallback((clientX: number) => {
    setIsDragging(true);
    const newValue = calculateValue(clientX);
    setLocalValue(newValue);
  }, [calculateValue]);

  const handleMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    const newValue = calculateValue(clientX);
    setLocalValue(newValue);
  }, [isDragging, calculateValue]);

  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onChange(localValue);
    }
  }, [isDragging, localValue, onChange]);

  // 마우스 이벤트
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // 터치 이벤트
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX);
  }, [handleMove]);

  const handleTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // 전역 이벤트 리스너 등록/제거
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const percentage = Math.max(0, Math.min(100, ((localValue - min) / (max - min)) * 100));

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{min}분</span>
        <div className="flex items-center gap-1">
          <span className="font-medium text-lg">{localValue}</span>
          <span className="text-muted-foreground">분</span>
        </div>
        <span className="text-muted-foreground">{max}분</span>
      </div>
      
      <div 
        ref={sliderRef}
        className="relative h-8 touch-none select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* 슬라이더 트랙 */}
        <div 
          ref={trackRef}
          className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 bg-muted rounded-full cursor-pointer"
        >
          {/* 활성화된 부분 */}
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-150 ease-out"
            style={{ width: `${percentage}%` }}
          />
          
          {/* 눈금 표시 */}
          <div className="absolute inset-0">
            {Array.from({ length: Math.floor((max - min) / 5) + 1 }, (_, i) => {
              const tickValue = min + i * 5;
              if (tickValue > max) return null;
              
              const tickPercentage = ((tickValue - min) / (max - min)) * 100;
              return (
                <div
                  key={tickValue}
                  className="absolute top-1/2 w-0.5 h-3 bg-muted-foreground/30 rounded-full -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${tickPercentage}%` }}
                />
              );
            })}
          </div>
        </div>
        
        {/* 슬라이더 핸들 */}
        <div 
          className={`absolute top-1/2 w-6 h-6 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-primary rounded-full cursor-pointer transition-all duration-150 ease-out shadow-md hover:scale-110 ${
            isDragging ? 'scale-125 shadow-lg' : ''
          }`}
          style={{ left: `${percentage}%` }}
        >
          <div className="w-full h-full rounded-full bg-primary/10" />
        </div>
      </div>
    </div>
  );
};