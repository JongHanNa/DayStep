'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  addMonths,
  differenceInCalendarDays,
  startOfDay
} from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import type { InboxItem, Project } from '@/types/second-brain';
import CalendarTodoCard from '@/components/shared/CalendarTodoCard';

// end_date를 포함할 수 있는 확장 InboxItem 타입
type InboxItemWithEndDate = InboxItem & {
  end_date?: string | null;
};

interface MonthlyCalendarProps {
  todos: InboxItemWithEndDate[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onTodoClick?: (item: InboxItemWithEndDate) => void;
  onToggleTodo?: (todoId: string) => void;
  onTodoDateChange?: (todoId: string, newDate: Date) => Promise<void>; // 드래그로 날짜 변경
  compact?: boolean; // 컴팩트 모드 (높이 줄임)
  onCreateTodo?: (date: Date) => Promise<void>; // 즉시 할일 생성
  enableSpanning?: boolean; // 스패닝 카드 표시 여부 (기본: true)
}


export default function MonthlyCalendar({
  todos,
  selectedDate: controlledDate,
  onDateChange,
  onTodoClick,
  onToggleTodo,
  onTodoDateChange,
  compact = false,
  onCreateTodo,
  enableSpanning = true,
}: MonthlyCalendarProps) {
  // 제어/비제어 컴포넌트 패턴 지원
  const [internalDate, setInternalDate] = React.useState<Date>(new Date());
  const selectedDate = controlledDate || internalDate;
  const handleDateChange = onDateChange || setInternalDate;

  // 월의 시작과 끝 날짜
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // 캘린더 그리드 시작일과 종료일 (이전 달/다음 달 포함)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // 토요일 끝

  // 캘린더에 표시할 모든 날짜
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  // 주 단위로 그룹핑
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // 스패닝 카드 계산 (end_date가 있는 할일)
  const spanningStarts = new Map<
    number,
    {
      todo: InboxItemWithEndDate;
      spanDays: number;
      segmentPosition: 'single' | 'first' | 'middle' | 'last';
    }
  >();
  const spanningRanges = new Set<number>();
  const singleDayTodos = new Map<number, InboxItemWithEndDate[]>();

  // 초기화 (42개 셀: 6주 * 7일)
  for (let i = 0; i < 42; i++) {
    singleDayTodos.set(i, []);
  }

  // 할일 분류 (스패닝 vs 단일 날짜)
  todos.forEach((todo) => {
    if (!todo.scheduled_date) return;

    const startDate = new Date(todo.scheduled_date);

    // end_date가 있고 활성화된 경우 스패닝 카드로 처리
    if (enableSpanning && todo.end_date) {
      const endDate = new Date(todo.end_date);

      // 달력 범위와 교집합 확인
      if (startDate <= calendarEnd && endDate >= calendarStart) {
        // 날짜 정규화 (달력 범위로 클립)
        const clippedStart = startOfDay(startDate < calendarStart ? calendarStart : startDate);
        const clippedEnd = startOfDay(endDate > calendarEnd ? calendarEnd : endDate);

        // 그리드 위치 계산 (0-41)
        const startCol = differenceInCalendarDays(clippedStart, calendarStart);
        const endCol = differenceInCalendarDays(clippedEnd, calendarStart);
        const spanDays = endCol - startCol + 1;

        if (spanDays > 1) {
          // 여러 주에 걸친 스패닝 카드를 주 단위로 분할
          let currentCol = startCol;
          const segments: number[] = [];

          while (currentCol <= endCol) {
            const colInWeek = currentCol % 7;
            const daysLeftInWeek = 7 - colInWeek;
            const daysLeftInSpan = endCol - currentCol + 1;
            const segmentSpan = Math.min(daysLeftInWeek, daysLeftInSpan);

            segments.push(currentCol);
            currentCol += segmentSpan;
          }

          // 각 세그먼트에 위치 정보와 함께 등록
          segments.forEach((segmentStart, index) => {
            const colInWeek = segmentStart % 7;
            const daysLeftInWeek = 7 - colInWeek;
            const daysLeftInSpan = endCol - segmentStart + 1;
            const segmentSpan = Math.min(daysLeftInWeek, daysLeftInSpan);

            let segmentPosition: 'single' | 'first' | 'middle' | 'last';
            if (segments.length === 1) {
              segmentPosition = 'single';
            } else if (index === 0) {
              segmentPosition = 'first';
            } else if (index === segments.length - 1) {
              segmentPosition = 'last';
            } else {
              segmentPosition = 'middle';
            }

            spanningStarts.set(segmentStart, {
              todo,
              spanDays: segmentSpan,
              segmentPosition,
            });

            // 이 세그먼트가 차지하는 모든 날짜 인덱스 추가
            for (let i = segmentStart; i < segmentStart + segmentSpan; i++) {
              spanningRanges.add(i);
            }
          });
        } else {
          // 1일짜리는 단일 날짜 할일로
          singleDayTodos.get(startCol)?.push(todo);
        }
      }
    } else {
      // 단일 날짜 할일
      if (startDate >= calendarStart && startDate <= calendarEnd) {
        const colIndex = differenceInCalendarDays(startDate, calendarStart);
        singleDayTodos.get(colIndex)?.push(todo);
      }
    }
  });

  // 각 날짜의 할일 정렬 (시간 순)
  singleDayTodos.forEach((todos) => {
    todos.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });
  });

  return (
    <div className="w-full">
        {/* 월 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => handleDateChange(addMonths(selectedDate, -1))}
            className="btn btn-ghost btn-sm rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-semibold">
            {format(selectedDate, 'yyyy년 M월')}
          </h3>
          <button
            onClick={() => handleDateChange(addMonths(selectedDate, 1))}
            className="btn btn-ghost btn-sm rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={`text-center text-sm font-semibold py-2 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 월간 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, dayIndex) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTodos = singleDayTodos.get(dayIndex) || [];
          const spanningCard = spanningStarts.get(dayIndex);
          const hasSpanningCard = spanningRanges.has(dayIndex);
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const dayOfWeek = day.getDay();

          return (
            <MonthDayCell
              key={dateKey}
              date={day}
              isToday={isToday}
              isCurrentMonth={isCurrentMonth}
              isWeekend={dayOfWeek === 0 || dayOfWeek === 6}
              todos={dayTodos}
              onTodoClick={onTodoClick}
              onToggleTodo={onToggleTodo}
              compact={compact}
              onCreateTodo={onCreateTodo}
              spanningCard={spanningCard?.todo}
              spanDays={spanningCard?.spanDays}
              segmentPosition={spanningCard?.segmentPosition}
              hasSpanningCard={hasSpanningCard}
            />
          );
        })}
      </div>

    </div>
  );
}

// 월간 뷰 날짜 셀 컴포넌트
interface MonthDayCellProps {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  todos: InboxItemWithEndDate[];
  onTodoClick?: (item: InboxItemWithEndDate) => void;
  onToggleTodo?: (todoId: string) => void;
  compact?: boolean;
  onCreateTodo?: (date: Date) => Promise<void>;
  spanningCard?: InboxItemWithEndDate;
  spanDays?: number;
  segmentPosition?: 'single' | 'first' | 'middle' | 'last';
  hasSpanningCard?: boolean;
}

function MonthDayCell({
  date,
  isToday,
  isCurrentMonth,
  isWeekend,
  todos,
  onTodoClick,
  onToggleTodo,
  compact,
  onCreateTodo,
  spanningCard,
  spanDays,
  segmentPosition,
  hasSpanningCard = false,
}: MonthDayCellProps) {
  const minHeight = compact ? 'min-h-[80px]' : 'min-h-[120px]';
  const dateString = format(date, 'yyyy-MM-dd');
  const isMobile = process.env.BUILD_TARGET === 'mobile';

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
    data: { date }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        group relative
        ${minHeight} p-1 sm:p-2 rounded-lg border transition-all
        ${
          isOver
            ? 'bg-primary/20 border-primary'
            : isToday
            ? 'bg-primary/10 border-primary'
            : isCurrentMonth
            ? 'bg-base-100 border-base-300'
            : 'bg-base-200/50 border-base-200'
        }
      `}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-1 relative">
        <div
          className={`
            text-xs sm:text-sm font-bold
            ${isToday ? 'text-primary' : isCurrentMonth ? '' : 'text-base-content/40'}
            ${isWeekend && isCurrentMonth ? (date.getDay() === 0 ? 'text-red-500' : 'text-blue-500') : ''}
          `}
        >
          {format(date, 'd')}
        </div>
        <div className="flex items-center gap-1">
          {(todos.length > 0 || hasSpanningCard) && (
            <div className="badge badge-xs bg-primary text-primary-content">
              {todos.length + (hasSpanningCard ? 1 : 0)}
            </div>
          )}
          {/* + 버튼 (hover 시 표시) */}
          {onCreateTodo && isCurrentMonth && (
            <button
              onClick={() => onCreateTodo(date)}
              className="btn btn-circle btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
              title="새 할일 추가"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 스패닝 카드 (absolute positioning으로 여러 셀에 걸쳐 표시) - 웹 환경만 */}
      {!isMobile && spanningCard && spanDays && (
        <div
          className="absolute top-[36px] mb-0 max-h-[52px] overflow-hidden"
          style={{
            left: segmentPosition === 'first' || segmentPosition === 'single' ? '0.5rem' : '-0.1rem',
            width: segmentPosition === 'first' || segmentPosition === 'single'
              ? `calc(${spanDays * 100}% + ${(spanDays - 1) * 0.25}rem + 0.05rem)`
              : segmentPosition === 'middle'
              ? `calc(${spanDays * 100}% + ${(spanDays - 1) * 0.25}rem + 0.9rem)`
              : `calc(${spanDays * 100}% + ${(spanDays - 1) * 0.25}rem)`,
            zIndex: 1
          }}
        >
          <CalendarTodoCard
            todo={{
              id: spanningCard.id,
              title: spanningCard.content,
              completed: spanningCard.is_completed || false,
              isHighlight: spanningCard.is_highlight || false,
              startTime: spanningCard.schedule_type === 'timed' && spanningCard.scheduled_date
                ? format(new Date(spanningCard.scheduled_date), 'HH:mm')
                : undefined,
              color: spanningCard.color,
            }}
            onClick={() => onTodoClick?.(spanningCard)}
            showCheckbox={false}
            enableDragDrop={true}
            projectColor={spanningCard.color}
            isSpanning={true}
            segmentPosition={segmentPosition}
            dragId={`month-todo-${spanningCard.id}`}
          />
        </div>
      )}

      {/* 할일 목록 */}
      <div className="space-y-1 max-h-[calc(100%-24px)] overflow-y-auto" style={{ marginTop: (spanningCard || hasSpanningCard) ? '48px' : '0' }}>
        {todos.map((todo) => {
          // InboxItem을 CalendarTodoCard가 필요로 하는 형식으로 변환
          const cardTodo = {
            id: todo.id,
            title: todo.content,
            completed: todo.is_completed || false,
            isHighlight: todo.is_highlight || false,
            startTime: todo.schedule_type === 'timed' && todo.scheduled_date
              ? format(new Date(todo.scheduled_date), 'HH:mm')
              : undefined,
            color: todo.color,
          };

          return (
            <CalendarTodoCard
              key={todo.id}
              todo={cardTodo}
              onClick={() => onTodoClick?.(todo)}
              showCheckbox={false}
              enableDragDrop={true}
              projectColor={todo.color}
              dragId={`month-todo-${todo.id}`}
            />
          );
        })}
        {todos.length === 0 && isCurrentMonth && (
          <div className="text-[10px] text-base-content/20 text-center py-2 hidden sm:block">

          </div>
        )}
      </div>
    </div>
  );
}

// React import 추가
import React from 'react';
