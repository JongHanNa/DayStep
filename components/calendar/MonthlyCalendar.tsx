'use client';

import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  addMonths
} from 'date-fns';
import type { InboxItem, Project } from '@/types/second-brain';

interface MonthlyCalendarProps {
  todos: InboxItem[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onTodoClick?: (item: InboxItem) => void;
  onToggleTodo?: (todoId: string) => void;
  showClarification?: boolean; // 명료화 라벨 표시 여부
  compact?: boolean; // 컴팩트 모드 (높이 줄임)
}

// 명료화 상태를 한글 라벨로 변환
function getClarificationLabel(clarification?: string): string {
  if (!clarification || clarification === 'none') return '선택 안함';

  const labelMap: Record<string, string> = {
    'reminder': '다시알림',
    'someday': '언젠가',
    'waiting': '대기중',
    'next_action': '다음행동',
    'schedule_clear': '일정',
  };

  return labelMap[clarification] || clarification;
}

// 명료화 색상 매핑
function getClarificationColor(clarification?: string): string {
  const colorMap: Record<string, string> = {
    'next_action': 'bg-blue-500/80',
    'schedule_clear': 'bg-orange-500/80',
    'reminder': 'bg-purple-500/80',
    'waiting': 'bg-gray-500/80',
  };

  return colorMap[clarification || ''] || 'bg-gray-500/80';
}

export default function MonthlyCalendar({
  todos,
  selectedDate: controlledDate,
  onDateChange,
  onTodoClick,
  onToggleTodo,
  showClarification = false,
  compact = false,
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

  // 날짜별로 할일 그룹화
  const todosByDate = new Map<string, InboxItem[]>();
  todos.forEach((todo) => {
    if (!todo.scheduled_date) return;
    // 언젠가(someday) 명료화 속성은 제외
    if (todo.clarification === 'someday') return;

    const dateKey = format(new Date(todo.scheduled_date), 'yyyy-MM-dd');
    const existing = todosByDate.get(dateKey) || [];
    todosByDate.set(dateKey, [...existing, todo]);
  });

  // 각 날짜의 할일 정렬 (시간 순)
  todosByDate.forEach((todos) => {
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
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTodos = todosByDate.get(dateKey) || [];
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
                  showClarification={showClarification}
                  compact={compact}
                />
              );
            })}
          </React.Fragment>
        ))}
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
  todos: InboxItem[];
  onTodoClick?: (item: InboxItem) => void;
  onToggleTodo?: (todoId: string) => void;
  showClarification?: boolean;
  compact?: boolean;
}

function MonthDayCell({
  date,
  isToday,
  isCurrentMonth,
  isWeekend,
  todos,
  onTodoClick,
  onToggleTodo,
  showClarification,
  compact,
}: MonthDayCellProps) {
  const minHeight = compact ? 'min-h-[80px]' : 'min-h-[120px]';

  return (
    <div
      className={`
        ${minHeight} p-1 sm:p-2 rounded-lg border transition-all
        ${
          isToday
            ? 'bg-primary/10 border-primary'
            : isCurrentMonth
            ? 'bg-base-100 border-base-300'
            : 'bg-base-200/50 border-base-200'
        }
      `}
    >
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div
          className={`
            text-xs sm:text-sm font-bold
            ${isToday ? 'text-primary' : isCurrentMonth ? '' : 'text-base-content/40'}
            ${isWeekend && isCurrentMonth ? (date.getDay() === 0 ? 'text-red-500' : 'text-blue-500') : ''}
          `}
        >
          {format(date, 'd')}
        </div>
        {todos.length > 0 && (
          <div className="badge badge-xs bg-primary text-primary-content">
            {todos.length}
          </div>
        )}
      </div>

      {/* 할일 목록 */}
      <div className="space-y-1 max-h-[calc(100%-24px)] overflow-y-auto">
        {todos.map((todo) => (
          <MonthTodoCard
            key={todo.id}
            todo={todo}
            onTodoClick={onTodoClick}
            onToggleTodo={onToggleTodo}
            showClarification={showClarification}
            compact={compact}
          />
        ))}
        {todos.length === 0 && isCurrentMonth && (
          <div className="text-[10px] text-base-content/20 text-center py-2 hidden sm:block">

          </div>
        )}
      </div>
    </div>
  );
}

// 월간 뷰 할일 카드 컴포넌트
interface MonthTodoCardProps {
  todo: InboxItem;
  onTodoClick?: (item: InboxItem) => void;
  onToggleTodo?: (todoId: string) => void;
  showClarification?: boolean;
  compact?: boolean;
}

function MonthTodoCard({
  todo,
  onTodoClick,
  onToggleTodo,
  showClarification,
  compact,
}: MonthTodoCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTodo) {
      onToggleTodo(todo.id);
    }
  };

  const content = todo.content;
  const isCompleted = todo.is_completed;
  const isHighlight = todo.is_highlight;
  const clarification = todo.clarification;
  const icon = todo.icon;
  const color = todo.color;

  // 시간 표시 (schedule_type이 timed인 경우에만)
  const showTime = todo.schedule_type === 'timed' && todo.scheduled_date;
  const timeText = showTime ? format(new Date(todo.scheduled_date!), 'HH:mm') : null;

  return (
    <div
      onClick={handleClick}
      className={`
        p-1.5 rounded-lg cursor-pointer transition-all
        ${isCompleted ? 'bg-base-200/50' : 'bg-base-200 hover:bg-base-300'}
        ${compact ? 'text-[10px]' : 'text-xs'}
      `}
      style={{
        borderLeft: color ? `3px solid ${color}` : undefined,
      }}
    >
      {/* 제목 행 */}
      <div className="flex items-start gap-1 mb-0.5">
        {onToggleTodo && (
          <input
            type="checkbox"
            checked={isCompleted}
            onClick={handleToggle}
            className="checkbox checkbox-xs mt-0.5 flex-shrink-0"
          />
        )}

        {icon && (
          <span className="flex-shrink-0 text-sm">{icon}</span>
        )}

        <p
          className={`
            flex-1 font-medium line-clamp-2
            ${isCompleted ? 'line-through text-base-content/50' : ''}
          `}
        >
          {content}
        </p>

        {isHighlight && (
          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* 시간 + 명료화 라벨 */}
      <div className="flex items-center gap-1 flex-wrap">
        {timeText && (
          <span className="text-[10px] text-base-content/60">
            {timeText}
          </span>
        )}

        {showClarification && clarification && clarification !== 'none' && (
          <span
            className={`
              text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium
              ${getClarificationColor(clarification)}
            `}
          >
            {getClarificationLabel(clarification)}
          </span>
        )}
      </div>
    </div>
  );
}

// React import 추가
import React from 'react';
