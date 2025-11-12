'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, differenceInCalendarDays } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import type { InboxItem, Project } from '@/types/second-brain';
import CalendarTodoCard from '@/components/shared/CalendarTodoCard';
import { useAuth } from '@/app/context/AuthContext';

// end_date를 포함할 수 있는 확장 InboxItem 타입
type InboxItemWithEndDate = InboxItem & {
  end_date?: string | null;
};

// 통합 할일 타입 (InboxItem + end_date 지원)
type UnifiedTodoItem = InboxItemWithEndDate;

interface WeeklyCalendarProps {
  todos: UnifiedTodoItem[];
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  onTodoClick?: (item: UnifiedTodoItem) => void;
  onToggleTodo?: (todoId: string) => void;
  onTodoDateChange?: (todoId: string, newDate: Date) => Promise<void>; // 드래그로 날짜 변경
  onOpenTodoListModal?: (date: Date, todos: UnifiedTodoItem[]) => void;
  project?: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  showClarification?: boolean; // 명료화 라벨 표시 여부
  enableSpanning?: boolean; // 스패닝 카드 지원 여부 (기본: false)
  enableDragDrop?: boolean; // 드래그앤드롭 활성화 여부 (기본: true)
  compact?: boolean; // 컴팩트 모드 (높이 줄임)
  onCreateTodo?: (date: Date) => Promise<void>; // 즉시 할일 생성
}


// InboxItem인지 TodoItem인지 구분
function isInboxItem(item: UnifiedTodoItem): item is InboxItem {
  return 'scheduled_date' in item;
}

// 스패닝 카드 타입
interface SpanningCard {
  todo: UnifiedTodoItem;
  startDay: number; // 0-6 (일~토)
  spanDays: number; // 1-7
  rowIndex: number;
}

export default function WeeklyCalendar({
  todos,
  selectedDate: controlledDate,
  onDateChange,
  onTodoClick,
  onToggleTodo,
  onTodoDateChange,
  onOpenTodoListModal,
  project,
  showClarification = false,
  enableSpanning = false,
  enableDragDrop = true,
  compact = false,
  onCreateTodo,
}: WeeklyCalendarProps) {
  // 제어/비제어 컴포넌트 패턴 지원
  const [internalDate, setInternalDate] = React.useState<Date>(new Date());
  const selectedDate = controlledDate || internalDate;
  const handleDateChange = onDateChange || setInternalDate;

  // 현재 주의 일요일~토요일 계산
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 }); // 일요일 시작
  const weekEnd = addDays(weekStart, 6); // 토요일
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const isMobile = process.env.BUILD_TARGET === 'mobile';

  // 할일을 스패닝 카드와 일반 카드로 분리
  const { spanningCards, singleDayCards } = (() => {
    const spanning: SpanningCard[] = [];
    const single: Map<number, UnifiedTodoItem[]> = new Map();

    // 각 날짜별 일반 카드 초기화
    for (let i = 0; i < 7; i++) {
      single.set(i, []);
    }

    todos.forEach((todo) => {
      // InboxItem만 처리
      if (!todo.scheduled_date) return;
      // 언젠가(someday) 명료화 속성은 제외
      if (todo.clarification === 'someday') return;

      const scheduledDate = new Date(todo.scheduled_date);

      // end_date가 있고 스패닝이 활성화된 경우
      if (enableSpanning && todo.end_date) {
        const endDate = new Date(todo.end_date);

        // 현재 주와 겹치는지 확인
        if (scheduledDate <= weekEnd && endDate >= weekStart) {
          // 현재 주 범위 내로 클립
          const clippedStart = scheduledDate < weekStart ? weekStart : scheduledDate;
          const clippedEnd = endDate > weekEnd ? weekEnd : endDate;

          const startDay = differenceInCalendarDays(clippedStart, weekStart);
          const endDay = differenceInCalendarDays(clippedEnd, weekStart);
          const spanDays = endDay - startDay + 1;

          if (spanDays > 1) {
            // 스패닝 카드로 등록
            spanning.push({
              todo,
              startDay,
              spanDays,
              rowIndex: 0, // 나중에 행 배치 계산
            });
          } else {
            // 1일짜리는 일반 카드로
            single.get(startDay)?.push(todo);
          }
        }
      } else {
        // 종료일 없는 경우: 시작일이 현재 주에 있으면 표시
        if (scheduledDate && scheduledDate >= weekStart && scheduledDate <= weekEnd) {
          const dayIndex = differenceInCalendarDays(scheduledDate, weekStart);
          single.get(dayIndex)?.push(todo);
        }
      }
    });

    // 각 날짜의 일반 카드 정렬
    single.forEach((cards) => {
      cards.sort((a, b) => {
        // InboxItem은 created_at으로 정렬 (오래된 순)
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        return timeA - timeB;
      });
    });

    return { spanningCards: spanning, singleDayCards: single };
  })();

  return (
    <div className="w-full">
        {/* 주간 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => handleDateChange(addDays(selectedDate, -7))}
            className="btn btn-ghost btn-sm rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-lg font-semibold">
            {format(weekStart, 'M월 d일')} - {format(addDays(weekStart, 6), 'M월 d일')}
          </h3>
          <button
            onClick={() => handleDateChange(addDays(selectedDate, 7))}
            className="btn btn-ghost btn-sm rounded-full"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      {/* 7일 컬럼 그리드 + 스패닝 카드 */}
      <div className="relative">
        <div className="grid grid-cols-7 gap-2">
          {/* 날짜 헤더 + 일반 카드 */}
          {weekDays.map((day, dayIndex) => {
            const dateString = format(day, 'yyyy-MM-dd');
            const dayTodos = singleDayCards.get(dayIndex) || [];
            const isToday = isSameDay(day, new Date());

            // 해당 날짜에 걸쳐있는 스패닝 카드들
            const spanningCardsForDay = spanningCards.filter(card => {
              const startDay = card.startDay;
              const endDay = card.startDay + card.spanDays - 1;
              return dayIndex >= startDay && dayIndex <= endDay;
            }).map(card => card.todo);

            return (
              <WeekDayColumn
                key={dateString}
                date={day}
                isToday={isToday}
                todos={dayTodos}
                onTodoClick={onTodoClick}
                onToggleTodo={onToggleTodo}
                project={project}
                onOpenTodoListModal={onOpenTodoListModal}
                showClarification={showClarification}
                enableDragDrop={enableDragDrop}
                compact={compact}
                spanningCardCount={spanningCardsForDay.length}
                spanningCardsForDay={spanningCardsForDay}
                onCreateTodo={onCreateTodo}
              />
            );
          })}
        </div>

        {/* 스패닝 카드 오버레이 (CSS Grid span 사용) - 웹 환경만 */}
        {!isMobile && enableSpanning && spanningCards.length > 0 && (
          <div className="grid grid-cols-7 gap-2 absolute top-0 left-0 right-0 pointer-events-none">
            {/* 헤더 공간 확보 */}
            {weekDays.map((_, i) => (
              <div key={`header-space-${i}`} className={compact ? 'h-[50px]' : 'h-[60px]'} />
            ))}

            {/* 스패닝 카드들 */}
            {spanningCards.map((card) => (
              <div
                key={`spanning-${card.todo.id}`}
                className="pointer-events-auto"
                style={{
                  gridColumn: `${card.startDay + 1} / span ${card.spanDays}`,
                  gridRow: 2, // 헤더 아래 첫 번째 행
                }}
              >
                <div className="px-1">
                  <CalendarTodoCard
                    todo={{
                      id: card.todo.id,
                      title: card.todo.content,
                      completed: card.todo.is_completed || false,
                      isHighlight: card.todo.is_highlight || false,
                      startTime: card.todo.schedule_type === 'timed' && card.todo.scheduled_date
                        ? format(new Date(card.todo.scheduled_date), 'HH:mm')
                        : undefined,
                      color: card.todo.color,
                    }}
                    onClick={() => onTodoClick?.(card.todo)}
                    showCheckbox={false}
                    enableDragDrop={enableDragDrop}
                    projectColor={project?.color || card.todo.color}
                    isSpanning={true}
                    dragId={`week-todo-spanning-${card.todo.id}`}
                    dropId={`week-todo-spanning-${card.todo.id}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// 주간 뷰 날짜 컬럼 컴포넌트
interface WeekDayColumnProps {
  date: Date;
  isToday: boolean;
  todos: UnifiedTodoItem[];
  onTodoClick?: (item: UnifiedTodoItem) => void;
  onToggleTodo?: (todoId: string) => void;
  project?: (Project & { isNew?: boolean; paraSelection?: string }) | null;
  onOpenTodoListModal?: (date: Date, todos: UnifiedTodoItem[]) => void;
  showClarification?: boolean;
  enableDragDrop?: boolean;
  compact?: boolean;
  spanningCardCount?: number;
  spanningCardsForDay?: UnifiedTodoItem[];
  onCreateTodo?: (date: Date) => Promise<void>;
}

function WeekDayColumn({
  date,
  isToday,
  todos,
  onTodoClick,
  onToggleTodo,
  project,
  onOpenTodoListModal,
  showClarification,
  enableDragDrop,
  compact,
  spanningCardCount = 0,
  spanningCardsForDay = [],
  onCreateTodo,
}: WeekDayColumnProps) {
  const dateString = format(date, 'yyyy-MM-dd');
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

  const { setNodeRef, isOver } = useDroppable({
    id: `week-${dateString}`,
    data: { date, type: 'week-column' },
  });

  const minHeight = compact ? 'min-h-[300px]' : 'min-h-[400px]';

  return (
    <div
      ref={enableDragDrop ? setNodeRef : undefined}
      className={`
        group relative
        flex flex-col
        ${minHeight} p-2 rounded-lg border-2 transition-all
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
      <div className="flex-shrink-0 mb-2 pb-2 border-b border-base-300 relative">
        <div className="text-sm font-bold text-center">{dayOfWeek}</div>
        <div className={`text-lg font-bold text-center ${isToday ? 'text-primary' : ''}`}>
          {format(date, 'd')}
        </div>
        {/* + 버튼 (hover 시 표시) */}
        {onCreateTodo && (
          <button
            onClick={() => onCreateTodo(date)}
            className="absolute top-1 right-1 btn btn-circle btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
            title="새 할일 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 할일 표시 영역 */}
      <div className="flex-1 space-y-2 overflow-y-auto">
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
              enableDragDrop={enableDragDrop}
              projectColor={project?.color || todo.color}
              dragId={`week-todo-${todo.id}`}
              dropId={`week-todo-${todo.id}`}
            />
          );
        })}
        {todos.length === 0 && spanningCardCount === 0 && (
          <div className="text-xs text-base-content/40 text-center py-4">
            할일 없음
          </div>
        )}
      </div>
    </div>
  );
}


// React import 추가
import React from 'react';
