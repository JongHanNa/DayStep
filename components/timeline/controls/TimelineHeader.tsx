'use client';

import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import DatePicker, { registerLocale } from "react-datepicker";
import { ko } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, ChevronLeft, ChevronRight, List, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isTodayInViewRange } from '@/lib/date-utils';
import { getTailwindClasses } from '@/lib/theme-colors';
import { useCurrentTime } from '@/lib/hooks/useCurrentTime';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { formatTime } from '@/lib/utils/timeFormat';
import "react-datepicker/dist/react-datepicker.css";

// 한국어 로케일 등록
registerLocale('ko', ko);

interface TimelineHeaderProps {
  className?: string;
}

const TimelineHeader: React.FC<TimelineHeaderProps> = ({ className }) => {
  const { currentDate, setCurrentDate, navigateToToday, viewMode, viewStyle, toggleViewStyle } = useTimelineViewStore();
  const { timeFormat } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const currentTime = useCurrentTime();

  // 오늘 버튼 표시 여부 체크
  const isTodayVisible = useMemo(() => {
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    return isTodayInViewRange(date, viewMode);
  }, [currentDate, viewMode]);

  // 오늘 날짜의 요일 계산
  const todayDayOfWeek = useMemo(() => {
    const today = new Date();
    return format(today, 'EEEE', { locale: ko });
  }, []);

  // 오늘이 맞는지 체크
  const isTodayDate = useMemo(() => {
    const today = new Date();
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  }, [currentDate]);

  // 현재 날짜의 요일 계산
  const currentDayOfWeek = useMemo(() => {
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const dayOfWeek = format(date, 'EEEE', { locale: ko });
    console.log('🗓️ currentDayOfWeek:', dayOfWeek, 'for date:', date);
    return dayOfWeek;
  }, [currentDate]);

  // 상대적 날짜 표시 계산
  const relativeDateText = useMemo(() => {
    if (isTodayDate) return null;

    const today = new Date();
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);

    // 시간을 00:00:00으로 맞춰서 정확한 날짜 차이 계산
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = dateStart.getTime() - todayStart.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '내일';
    if (diffDays === 2) return '모레';
    if (diffDays === 3) return '3일후';
    if (diffDays === 4) return '4일후';
    if (diffDays === 5) return '5일후';
    if (diffDays === 6) return '6일후';
    if (diffDays >= 7 && diffDays <= 13) return '다음주';
    if (diffDays > 13) return `${diffDays}일후`;

    if (diffDays === -1) return '어제';
    if (diffDays === -2) return '그저께';
    if (diffDays === -3) return '3일전';
    if (diffDays === -4) return '4일전';
    if (diffDays === -5) return '5일전';
    if (diffDays === -6) return '6일전';
    if (diffDays <= -7 && diffDays >= -13) return '지난주';
    if (diffDays < -13) return `${Math.abs(diffDays)}일전`;

    return null;
  }, [currentDate, isTodayDate]);


  // 날짜 선택 핸들러
  const handleDateChange = (date: Date | null) => {
    if (date) {
      console.log('📅 달력에서 날짜 선택됨:', date);
      setCurrentDate(date);
      // 날짜 선택 후 달력 자동 닫기
      setIsOpen(false);
    }
  };

  // 달력 모달 열기
  const openCalendar = () => {
    setIsOpen(true);
  };

  // 달력 모달 닫기 
  const closeCalendar = () => {
    setIsOpen(false);
  };

  // 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeCalendar();
    }
  };

  // 오늘로 이동 핸들러
  const handleTodayClick = () => {
    navigateToToday();
  };

  // 이전 날짜로 이동
  const handlePreviousDay = () => {
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const previousDay = new Date(date);
    previousDay.setDate(date.getDate() - 1);
    setCurrentDate(previousDay);
  };

  // 다음 날짜로 이동
  const handleNextDay = () => {
    const date = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    setCurrentDate(nextDay);
  };

  // 현재 시간 마커로 스크롤
  const handleScrollToCurrentTime = () => {
    const currentTimeMarker = document.getElementById('current-time-marker');
    if (currentTimeMarker) {
      currentTimeMarker.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  return (
    <>
      {/* 헤더 영역 */}
      <div className={cn('text-center mb-0 relative px-6', getTailwindClasses().timelineHeader, className)}>
        {/* 이전 날짜 버튼 */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePreviousDay}
            className="w-8 h-8 p-0 hover:bg-accent/50"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* 중앙 날짜 클릭 영역 - 클릭 영역을 좁게 제한 */}
        <div className="flex flex-col items-center">
          <div
            className="cursor-pointer select-none touch-manipulation hover:bg-accent/50 rounded-lg px-4 py-2 transition-colors"
            onClick={openCalendar}
          >
            <div className="text-xs text-transparent mb-1 text-center">클릭해서 달력 열기</div>
            {/* 첫 번째 줄: 연도와 날짜 표시 */}
            <h1 className="text-3xl font-bold text-foreground mb-1 text-center">
              {format(currentDate, 'yyyy년 M월 d일', { locale: ko })}
            </h1>
          </div>

          {/* 두 번째 줄: 현재 날짜 요일 표시와 오늘 버튼 */}
          <div className="flex justify-between items-center h-8">
            {isTodayDate ? (
              /* 오늘인 경우: "오늘", 요일, 시간 전체를 가운데 정렬 */
              <>
                {/* 왼쪽 여백 */}
                <div className="flex-1" />

                {/* 가운데 정렬된 "오늘", 요일, 시간 */}
                <div className="flex items-center gap-3">
                  <p className="text-lg font-black text-muted-foreground">
                    오늘
                  </p>
                  <div className="bg-brand text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                    {currentDayOfWeek?.charAt(0)}
                  </div>
                  <button
                    onClick={handleScrollToCurrentTime}
                    className="bg-brand text-white px-2 py-1 rounded-full text-xs font-medium shadow-md hover:bg-brand/90 transition-colors cursor-pointer"
                  >
                    {formatTime(currentTime, timeFormat)}
                  </button>
                </div>

                {/* 오른쪽 여백 */}
                <div className="flex-1" />
              </>
            ) : (
              /* 다른 날짜인 경우: 요일 오른쪽에 오늘 버튼 */
              <>
                {/* 왼쪽 여백 */}
                <div className="w-16" />

                {/* 가운데 정렬된 상대적 날짜, 요일과 오늘 버튼 */}
                <div className="flex items-center gap-3">
                  {relativeDateText && (
                    <p className="text-lg font-black text-muted-foreground">
                      {relativeDateText}
                    </p>
                  )}
                  <div className="bg-brand text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                    {currentDayOfWeek?.charAt(0)}
                  </div>
                  {!isTodayVisible && (
                    <button
                      onClick={handleTodayClick}
                      className="bg-brand text-white px-2 py-1 rounded-full text-xs font-medium shadow-md flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      오늘
                    </button>
                  )}
                </div>

                {/* 오른쪽 여백 */}
                <div className="w-16" />
              </>
            )}
          </div>
        </div>
        
        {/* 뷰 스타일 전환 버튼 */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleViewStyle}
            className="w-8 h-8 p-0 hover:bg-accent/50"
            title={viewStyle === 'modern' ? '버블 뷰로 전환' : '리스트 뷰로 전환'}
          >
            {viewStyle === 'modern' ? (
              <Circle className="w-4 h-4" />
            ) : (
              <List className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 다음 날짜 버튼 */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextDay}
            className="w-8 h-8 p-0 hover:bg-accent/50"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 드래그업 모달 */}
      {isOpen && createPortal(
        <AnimatePresence>
          <>
            {/* 투명한 배경 클릭 영역 (시각적 효과 없음) */}
            <div
              className="fixed top-24 left-0 right-0 bottom-0"
              style={{
                zIndex: 999998
              }}
              onClick={handleBackdropClick}
            />

            {/* 달력 패널 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border rounded-t-2xl max-h-[80vh] overflow-hidden shadow-2xl"
              style={{
                zIndex: 999999
              }}
            >
              {/* 드래그 핸들 */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* 헤더 */}
              <div className="px-6 pb-4 border-b border-border/30">
                <h3 className="text-lg font-semibold text-center">날짜 선택</h3>
              </div>
              
              {/* 달력 */}
              <div className="p-6 flex justify-center overflow-y-auto">
                <div className="react-datepicker-custom">
                  <DatePicker
                    selected={currentDate}
                    onChange={handleDateChange}
                    locale="ko"
                    inline
                    dateFormat="yyyy년 MM월 dd일"
                    className="w-full"
                    calendarClassName="custom-datepicker"
                  />
                </div>
              </div>
              
              {/* 하단 버튼 */}
              <div className="p-6 pt-0 pb-8 border-t border-border/30">
                <button
                  onClick={closeCalendar}
                  className="w-full py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm font-medium"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </>
        </AnimatePresence>,
        document.body
      )}

      {/* 커스텀 스타일 */}
      <style jsx global>{`
        .react-datepicker-custom .react-datepicker {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          background-color: hsl(var(--card));
          color: hsl(var(--foreground));
          font-family: inherit;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .react-datepicker-custom .react-datepicker__header {
          background-color: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
        }
        
        .react-datepicker-custom .react-datepicker__current-month {
          color: hsl(var(--foreground));
          font-weight: 600;
          font-size: 1.1em;
        }
        
        .react-datepicker-custom .react-datepicker__day-names {
          margin-bottom: 0.5rem;
        }
        
        .react-datepicker-custom .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          width: 2.25rem;
          line-height: 2.25rem;
        }
        
        .react-datepicker-custom .react-datepicker__day {
          color: hsl(var(--foreground));
          width: 2.25rem;
          height: 2.25rem;
          line-height: 2.25rem;
          margin: 0.125rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        
        .react-datepicker-custom .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          transform: scale(1.05);
        }
        
        .react-datepicker-custom .react-datepicker__day--selected {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          font-weight: 600;
        }
        
        .react-datepicker-custom .react-datepicker__day--today {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          font-weight: 600;
        }
        
        .react-datepicker-custom .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }
        
        .react-datepicker-custom .react-datepicker__navigation {
          background: none;
          border: none;
          top: 13px;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          transition: all 0.2s ease-in-out;
          outline: none;
        }
        
        .react-datepicker-custom .react-datepicker__navigation:hover {
          background-color: hsl(var(--accent));
        }
        
        .react-datepicker-custom .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
          border-width: 2px 2px 0 0;
          width: 7px;
          height: 7px;
        }
        
        .react-datepicker-custom .react-datepicker__navigation--previous {
          left: 12px;
        }
        
        .react-datepicker-custom .react-datepicker__navigation--next {
          right: 12px;
        }
      `}</style>
    </>
  );
};

export default TimelineHeader;