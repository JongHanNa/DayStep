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
  addMonths
} from 'date-fns';
import type { InboxItem, Project } from '@/types/second-brain';
import CalendarTodoCard from '@/components/shared/CalendarTodoCard';

interface MonthlyCalendarProps {
  todos: InboxItem[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onTodoClick?: (item: InboxItem) => void;
  onToggleTodo?: (todoId: string) => void;
  showClarification?: boolean; // 명료화 라벨 표시 여부
  compact?: boolean; // 컴팩트 모드 (높이 줄임)
  onCreateTodo?: (date: Date) => Promise<void>; // 즉시 할일 생성
}


export default function MonthlyCalendar({
  todos,
  selectedDate: controlledDate,
  onDateChange,
  onTodoClick,
  onToggleTodo,
  showClarification = false,
  compact = false,
  onCreateTodo,
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
                  onCreateTodo={onCreateTodo}
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
  onCreateTodo?: (date: Date) => Promise<void>;
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
  onCreateTodo,
}: MonthDayCellProps) {
  const minHeight = compact ? 'min-h-[80px]' : 'min-h-[120px]';

  return (
    <div
      className={`
        group relative
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
          {todos.length > 0 && (
            <div className="badge badge-xs bg-primary text-primary-content">
              {todos.length}
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

      {/* 할일 목록 */}
      <div className="space-y-1 max-h-[calc(100%-24px)] overflow-y-auto">
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
              enableDragDrop={false}
              projectColor={todo.color}
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
