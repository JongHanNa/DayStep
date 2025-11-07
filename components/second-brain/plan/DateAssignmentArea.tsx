'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import WeekCalendar from './WeekCalendar';
import type { InboxItem } from '@/types/second-brain';

interface DateAssignmentAreaProps {
  todayTodos: InboxItem[];
  tomorrowTodos: InboxItem[];
  allTodos: InboxItem[];
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

export default function DateAssignmentArea({
  todayTodos,
  tomorrowTodos,
  allTodos,
  onTodoClick,
}: DateAssignmentAreaProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'tomorrow' | 'week'>('today');

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <h2 className="text-lg font-bold mb-4">날짜</h2>

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('today')}
          className={`btn btn-sm ${activeTab === 'today' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <Calendar className="w-4 h-4" />
          오늘 ({todayTodos.length})
        </button>
        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`btn btn-sm ${activeTab === 'tomorrow' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <Calendar className="w-4 h-4" />
          내일 ({tomorrowTodos.length})
        </button>
        <button
          onClick={() => setActiveTab('week')}
          className={`btn btn-sm ${activeTab === 'week' ? 'bg-base-300' : 'btn-ghost'} rounded-full`}
        >
          <Calendar className="w-4 h-4" />
          이번주
        </button>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="min-h-[400px]">
        {activeTab === 'today' && (
          <DroppableDateList
            dateString={format(new Date(), 'yyyy-MM-dd')}
            todos={todayTodos}
            title="오늘"
            onTodoClick={onTodoClick}
          />
        )}

        {activeTab === 'tomorrow' && (
          <DroppableDateList
            dateString={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
            todos={tomorrowTodos}
            title="내일"
            onTodoClick={onTodoClick}
          />
        )}

        {activeTab === 'week' && (
          <WeekCalendar todos={allTodos} onTodoClick={onTodoClick} />
        )}
      </div>
    </div>
  );
}

// 드롭 가능한 날짜별 할일 리스트
interface DroppableDateListProps {
  dateString: string;
  todos: InboxItem[];
  title: string;
  onTodoClick?: (item: InboxItem) => void;
}

function DroppableDateList({ dateString, todos, title, onTodoClick }: DroppableDateListProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateString,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] p-4 rounded-lg border-2 border-dashed transition-colors ${
        isOver ? 'border-primary bg-primary/10' : 'border-base-300'
      }`}
    >
      <h3 className="font-bold mb-3">{title}</h3>
      {todos.length === 0 ? (
        <div className="text-center py-12 text-base-content/50">
          할일을 여기로 드래그하세요
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <TodoListItem key={todo.id} todo={todo} onTodoClick={onTodoClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// 할일 리스트 아이템
interface TodoListItemProps {
  todo: InboxItem;
  onTodoClick?: (item: InboxItem) => void;
}

function TodoListItem({ todo, onTodoClick }: TodoListItemProps) {
  const handleClick = () => {
    if (onTodoClick) {
      onTodoClick(todo);
    }
  };

  return (
    <div className="bg-base-100 p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={handleClick}>
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={todo.is_completed} className="checkbox checkbox-sm mt-1" readOnly />
        <div className="flex-1">
          <p className="font-medium">{todo.content}</p>
          <div className="flex flex-wrap gap-2 mt-1 text-sm text-base-content/70">
            {todo.clarification && (
              <span className="badge badge-sm bg-base-200">{getClarificationLabel(todo.clarification)}</span>
            )}
            {todo.is_highlight && (
              <span className="badge badge-sm badge-primary">중요</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
