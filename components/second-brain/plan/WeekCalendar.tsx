'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { InboxItem } from '@/types/second-brain';

interface WeekCalendarProps {
  todos: InboxItem[];
  onTodoClick?: (item: InboxItem) => void;
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

export default function WeekCalendar({ todos, onTodoClick }: WeekCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 현재 주의 일요일~토요일 계산
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 일요일 시작
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full">
      {/* 주간 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, -7))}
          className="btn btn-ghost btn-sm rounded-full"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-lg font-semibold">
          {format(weekStart, 'M월 d일')} - {format(addDays(weekStart, 6), 'M월 d일')}
        </h3>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
          className="btn btn-ghost btn-sm rounded-full"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 7일 컬럼 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dateString = format(day, 'yyyy-MM-dd');
          const dayTodos = todos.filter((item) => {
            if (!item.scheduled_date) return false;
            // 언젠가(someday) 명료화 속성은 제외
            if (item.clarification === 'someday') return false;
            const scheduleDate = new Date(item.scheduled_date);
            return format(scheduleDate, 'yyyy-MM-dd') === dateString;
          });
          const isToday = isSameDay(day, new Date());

          return (
            <WeekDayColumn
              key={dateString}
              date={day}
              isToday={isToday}
              todos={dayTodos}
              onTodoClick={onTodoClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// 주간 뷰 날짜 컬럼 컴포넌트
interface WeekDayColumnProps {
  date: Date;
  isToday: boolean;
  todos: InboxItem[];
  onTodoClick?: (item: InboxItem) => void;
}

function WeekDayColumn({ date, isToday, todos, onTodoClick }: WeekDayColumnProps) {
  const dateString = format(date, 'yyyy-MM-dd');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col
        min-h-[400px] p-2 rounded-lg border-2 transition-all
        ${
          isOver
            ? 'bg-primary/20 border-primary'
            : isToday
            ? 'bg-primary/5 border-primary/50'
            : 'bg-base-100 border-base-300'
        }
      `}
    >
      {/* 날짜 헤더 */}
      <div className="flex-shrink-0 mb-2 pb-2 border-b border-base-300">
        <div className="text-sm font-bold text-center">{dayOfWeek}</div>
        <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
      </div>

      {/* 할일 표시 영역 */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {todos.map((todo) => (
          <WeekTodoCard key={todo.id} todo={todo} onTodoClick={onTodoClick} />
        ))}
        {todos.length === 0 && (
          <div className="text-xs text-base-content/40 text-center py-4">
            할일 없음
          </div>
        )}
      </div>
    </div>
  );
}

// 주간 뷰 할일 카드 컴포넌트
interface WeekTodoCardProps {
  todo: InboxItem;
  onTodoClick?: (item: InboxItem) => void;
}

function WeekTodoCard({ todo, onTodoClick }: WeekTodoCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `week-todo-${todo.id}`,
    data: { todoId: todo.id },
  });

  const handleClick = (e: React.MouseEvent) => {
    // 드래그 중에는 클릭 이벤트 무시
    if (!isDragging && onTodoClick) {
      onTodoClick(todo);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`
        p-2 rounded-lg bg-base-200 hover:bg-base-300 transition-colors
        cursor-move
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* 제목 + 하이라이트 */}
      <div className="flex items-center gap-2 mb-1">
        <p className={`text-xs font-medium flex-1 ${todo.is_completed ? 'line-through text-base-content/50' : ''}`}>
          {todo.content}
        </p>
        {todo.is_highlight && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
      </div>

      {/* 명료화 표시 */}
      {todo.clarification && (
        <span className="badge badge-xs bg-base-300">{getClarificationLabel(todo.clarification)}</span>
      )}
    </div>
  );
}
