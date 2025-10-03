'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Sunset, Coffee, Moon } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface DraggableRemainingTimeProps {
  className?: string;
}

const DraggableRemainingTime: React.FC<DraggableRemainingTimeProps> = ({ className }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isClient, setIsClient] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 80 }); // 기본 위치
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(timer);
  }, []);

  // 위치 저장 (일단 주석 처리)
  // useEffect(() => {
  //   if (isClient) {
  //     localStorage.setItem('remainingTimePosition', JSON.stringify(position));
  //   }
  // }, [position, isClient]);

  // 하루 중 남은 시간 계산
  const endOfDay = new Date(currentTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  const remainingMs = endOfDay.getTime() - currentTime.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // 시간대별 아이콘 및 메시지
  const getTimeIcon = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return Coffee; // 오전
    if (hour >= 12 && hour < 18) return Clock; // 오후
    if (hour >= 18 && hour < 22) return Sunset; // 저녁
    return Moon; // 밤
  };

  const getTimeMessage = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return '좋은 아침입니다';
    if (hour >= 12 && hour < 18) return '좋은 오후입니다';
    if (hour >= 18 && hour < 22) return '좋은 저녁입니다';
    return '편안한 밤 되세요';
  };

  const formatRemainingTime = () => {
    if (remainingHours > 0) {
      return `${remainingHours}시간 ${remainingMins}분`;
    }
    return `${remainingMins}분`;
  };

  const TimeIcon = getTimeIcon();

  // 마우스/터치 이벤트 핸들러
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // 화면 경계 내에서만 이동 가능
    const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 200);
    const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 100);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  }, [isDragging, dragStart.x, dragStart.y]);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // 전역 이벤트 리스너
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
    
    // 드래그 중이 아닐 때는 cleanup 없음
    return;
  }, [isDragging, handlePointerMove]);

  if (!isClient) {
    return null; // 클라이언트에서만 렌더링
  }

  // 모바일 화면에서는 위젯 숨기기
  if (isMobile) {
    return null;
  }


  return (
    <div
      ref={dragRef}
      className={cn(
        'fixed z-40 p-3 rounded-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm',
        'border border-gray-200 dark:border-gray-700 shadow-lg',
        'cursor-move touch-none select-none',
        'transition-transform duration-200',
        isDragging ? 'scale-105 shadow-xl' : 'hover:scale-102',
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        maxWidth: '200px'
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <TimeIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              {currentTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </div>
            <div className="text-xs text-muted-foreground">
              {getTimeMessage()}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-xs font-medium text-foreground">
          하루 중 {formatRemainingTime()} 남음
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round((remainingMinutes / (24 * 60)) * 100)}% 남음
        </div>
      </div>

      {/* 진행률 바 */}
      <div className="mt-2 w-full bg-muted rounded-full h-1.5">
        <div 
          className="bg-primary h-1.5 rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.max(0, 100 - (remainingMinutes / (24 * 60)) * 100)}%` 
          }}
        />
      </div>

      {/* 드래그 인디케이터 */}
      <div className="absolute bottom-1 right-1 text-xs text-muted-foreground opacity-50">
        ⋮⋮
      </div>
    </div>
  );
};

export default DraggableRemainingTime;