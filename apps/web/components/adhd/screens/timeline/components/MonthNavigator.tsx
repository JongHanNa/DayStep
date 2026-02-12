'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Check, Zap } from 'lucide-react';
import { format, addMonths, subMonths, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MonthPickerPopover } from './MonthPickerPopover';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { TimelineViewMode } from '../types';

interface MonthNavigatorProps {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  onTodayClick: () => void;
  onAddClick?: () => void;
  viewMode?: TimelineViewMode;
  onViewModeChange?: (mode: TimelineViewMode) => void;
  onStartRecommendedFocus?: () => void;
}

/**
 * 월 네비게이터 컴포넌트
 *
 * - 현재 월 표시 (클릭 시 팝오버)
 * - 이전/다음 달 이동 버튼
 * - 오늘 버튼
 */
export function MonthNavigator({
  currentDate,
  onMonthChange,
  onTodayClick,
  onAddClick,
  viewMode = 'agenda',
  onViewModeChange,
  onStartRecommendedFocus,
}: MonthNavigatorProps) {
  const [showPopover, setShowPopover] = useState(false);

  // 이전 달/일로 이동
  const handlePrevMonth = () => {
    onMonthChange(viewMode === 'daily' ? subDays(currentDate, 1) : subMonths(currentDate, 1));
  };

  // 다음 달/일로 이동
  const handleNextMonth = () => {
    onMonthChange(viewMode === 'daily' ? addDays(currentDate, 1) : addMonths(currentDate, 1));
  };

  // 월 선택 팝오버에서 선택
  const handleSelectMonth = (date: Date) => {
    onMonthChange(date);
  };

  return (
    <div className="relative flex items-center justify-between px-4 py-3 bg-base-100 border-b border-base-300">
      {/* 좌측: 월 표시 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPopover(!showPopover)}
          className="flex items-center gap-1 text-lg font-semibold hover:text-primary transition-colors"
        >
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
          <ChevronDown className={`w-4 h-4 transition-transform ${showPopover ? 'rotate-180' : ''}`} />
        </button>

        {/* 월 선택 팝오버 */}
        <MonthPickerPopover
          isOpen={showPopover}
          currentDate={currentDate}
          onSelect={handleSelectMonth}
          onClose={() => setShowPopover(false)}
        />
      </div>

      {/* 우측: 네비게이션 버튼들 */}
      <div className="flex items-center gap-1">
        {/* ⚡ 추천 포커스 버튼 */}
        {onStartRecommendedFocus && (
          <button
            onClick={onStartRecommendedFocus}
            className="btn btn-ghost btn-sm btn-circle text-violet-500"
            aria-label="추천 포커스 시작"
          >
            <Zap className="w-4 h-4" />
          </button>
        )}

        {/* + 할일 추가 버튼 */}
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="할일 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* 뷰 모드 드롭다운 */}
        {onViewModeChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="btn btn-ghost btn-sm px-2 text-sm gap-1">
                {viewMode === 'agenda' ? '일정' : '하루'}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[100px]">
              <DropdownMenuItem onClick={() => onViewModeChange('agenda')} className="gap-2">
                {viewMode === 'agenda' && <Check className="w-3 h-3" />}
                {viewMode !== 'agenda' && <span className="w-3" />}
                일정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewModeChange('daily')} className="gap-2">
                {viewMode === 'daily' && <Check className="w-3 h-3" />}
                {viewMode !== 'daily' && <span className="w-3" />}
                하루
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <button
          onClick={handlePrevMonth}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label={viewMode === 'daily' ? '이전 날' : '이전 달'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onTodayClick}
          className="btn btn-ghost btn-sm px-3 text-sm"
        >
          오늘
        </button>
        <button
          onClick={handleNextMonth}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label={viewMode === 'daily' ? '다음 날' : '다음 달'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
