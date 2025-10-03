"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

const SimpleRemainingTime: React.FC = () => {
  const [position, setPosition] = useState({ x: 300, y: 120 }); // 더 오른쪽으로 이동
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Hydration 문제 해결을 위한 클라이언트 상태 관리
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date()); // 클라이언트에서 정확한 시간으로 재설정

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // 화면 경계 제한 (위젯 크기 180px 고려)
      const minX = 0;
      const maxX = window.innerWidth - 180;
      const minY = 80; // 헤더 높이 고려
      const maxY = window.innerHeight - 150; // 위젯 높이 고려

      setPosition({
        x: Math.max(minX, Math.min(maxX, newX)),
        y: Math.max(minY, Math.min(maxY, newY)),
      });
    },
    [isDragging, dragStart.x, dragStart.y]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
    
    // 드래그 중이 아닐 때는 cleanup 없음
    return;
  }, [isDragging, handleMouseMove]); // 의존성 배열 수정

  const endOfDay = new Date(currentTime);
  endOfDay.setHours(23, 59, 59, 999);

  const remainingMs = endOfDay.getTime() - currentTime.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  // 클라이언트에서만 렌더링하여 Hydration 문제 방지
  if (!isClient) {
    return null;
  }

  // 모바일 화면에서는 위젯 숨기기
  if (isMobile) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed z-50 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100",
        "dark:from-blue-900/20 dark:to-indigo-900/20",
        "border-2 border-blue-200 dark:border-blue-700 shadow-xl",
        "cursor-move select-none backdrop-blur-sm",
        isDragging ? "scale-105 shadow-2xl" : "",
        "hover:shadow-2xl transition-all duration-200"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "200px",
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300">
            남은 시간
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-300">
        하루 중{" "}
        {remainingHours > 0
          ? `${remainingHours}시간 ${remainingMins}분`
          : `${remainingMins}분`}{" "}
        남음
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {Math.round((remainingMinutes / (24 * 60)) * 100)}% 남음
      </div>

      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(0, 100 - (remainingMinutes / (24 * 60)) * 100)}%`,
          }}
        />
      </div>

      <div className="text-xs text-gray-400 mt-1 text-center">드래그하세요</div>
    </div>
  );
};

export default SimpleRemainingTime;
