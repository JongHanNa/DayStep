'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Navigation, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';

interface CurrentTimeIndicatorProps {
  /** 현재 시간 */
  currentTime: Date;
  /** 현재 시간이 뷰포트에 표시되는지 여부 */
  isVisible: boolean;
  /** 자동 스크롤 활성화 여부 */
  autoScrollEnabled: boolean;
  /** 현재 시간으로 스크롤하는 함수 */
  onScrollToCurrentTime: () => void;
  /** 자동 스크롤 토글 함수 */
  onToggleAutoScroll: () => void;
  /** IntersectionObserver 대상 ref */
  observerRef: React.RefObject<HTMLDivElement | null>;
  /** 추가 CSS 클래스 */
  className?: string;
}

export const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  currentTime,
  isVisible,
  autoScrollEnabled,
  onScrollToCurrentTime,
  onToggleAutoScroll,
  observerRef,
  className
}) => {
  const { viewMode, selectedDate } = useTimelineViewStore();

  // 현재 시간을 기준으로 위치 계산 (0-100%)
  const position = useMemo(() => {
    if (viewMode === 'daily') {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      return ((hours * 60 + minutes) / (24 * 60)) * 100;
    }
    
    if (viewMode === 'weekly') {
      const dayOfWeek = currentTime.getDay();
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const totalMinutesInWeek = 7 * 24 * 60;
      const currentMinutes = dayOfWeek * 24 * 60 + hours * 60 + minutes;
      return (currentMinutes / totalMinutesInWeek) * 100;
    }
    
    // 월간 뷰의 경우 날짜 기준으로 계산
    const startOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth(), 1);
    const endOfMonth = new Date(currentTime.getFullYear(), currentTime.getMonth() + 1, 0);
    const totalDays = endOfMonth.getDate();
    const currentDay = currentTime.getDate();
    return ((currentDay - 1) / totalDays) * 100;
  }, [currentTime, viewMode]);

  // 현재 날짜가 선택된 날짜 범위에 포함되는지 확인
  const isInSelectedRange = useMemo(() => {
    if (!selectedDate) return false;
    
    const currentDay = currentTime.toDateString();
    const selectedDay = selectedDate.toDateString();
    
    if (viewMode === 'daily') {
      return currentDay === selectedDay;
    }
    
    if (viewMode === 'weekly') {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return currentTime >= startOfWeek && currentTime <= endOfWeek;
    }
    
    if (viewMode === 'monthly') {
      return currentTime.getMonth() === selectedDate.getMonth() &&
             currentTime.getFullYear() === selectedDate.getFullYear();
    }
    
    return false;
  }, [currentTime, selectedDate, viewMode]);

  // 시간 포맷팅
  const formatTime = useCallback(() => {
    if (viewMode === 'daily') {
      return currentTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (viewMode === 'weekly') {
      return currentTime.toLocaleDateString('ko-KR', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return currentTime.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  }, [currentTime, viewMode]);

  // 현재 시간이 선택된 범위에 없으면 표시하지 않음
  if (!isInSelectedRange) {
    return null;
  }

  return (
    <TooltipProvider>
      <motion.div
        ref={observerRef}
        className={cn(
          'absolute left-0 right-0 pointer-events-none z-20',
          className
        )}
        style={{ top: `${position}%` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* 현재 시간 라인 - 미니멀하면서 눈에 띄는 디자인 */}
        <motion.div
          className="relative h-0.5 bg-blue-300/50 dark:bg-blue-500/40 rounded-full"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* 현재 시간 시작점 인디케이터 - 블루 톤으로 적절한 강조 */}
          <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-blue-500 dark:bg-blue-400 rounded-full shadow-sm" />

          {/* 현재 시간 레이블 - 미니멀하면서 눈에 띄는 디자인 */}
          <motion.div
            className="absolute left-4 -top-7 flex items-center gap-2 pointer-events-auto"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium bg-blue-50/60 dark:bg-blue-900/20 rounded-full px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">NOW</span>
              <span className="font-medium">{formatTime()}</span>
            </div>

            {/* 컨트롤 버튼들 - 블루 톤으로 일관성 있는 스타일 */}
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 rounded"
                    onClick={onScrollToCurrentTime}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>현재 시간으로 이동</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-6 w-6 p-0 rounded ${
                      autoScrollEnabled
                        ? 'bg-blue-100/70 dark:bg-blue-800/40 text-blue-700 dark:text-blue-300'
                        : 'bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                    }`}
                    onClick={onToggleAutoScroll}
                  >
                    {autoScrollEnabled ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{autoScrollEnabled ? '자동 스크롤 비활성화' : '자동 스크롤 활성화'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </motion.div>

        </motion.div>

        {/* 가시성 상태 표시 - 미니멀한 스타일 */}
        <AnimatePresence>
          {!isVisible && (
            <motion.div
              className="absolute -top-10 right-4 pointer-events-auto"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <EyeOff className="w-3 h-3" />
                <span>현재 시간이 화면 밖에 있습니다</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 자동 스크롤 활성화 상태 표시 - 미니멀한 스타일 */}
        <AnimatePresence>
          {autoScrollEnabled && (
            <motion.div
              className="absolute -bottom-7 left-4 pointer-events-none"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-emerald-500/90 dark:bg-emerald-600/90 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                <span>자동 추적 활성화</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
};

export default CurrentTimeIndicator;