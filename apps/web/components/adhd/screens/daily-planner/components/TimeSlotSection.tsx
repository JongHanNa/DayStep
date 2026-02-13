'use client';

import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface TimeSlotSectionProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  todos: Todo[];
  accentColor: string;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onRestoreOriginal?: (todo: Todo) => void;
  onStartFocus?: (todo: Todo) => void;
  onAddClick?: () => void;
}

export function TimeSlotSection({ id, label, icon, todos, accentColor, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onRestoreOriginal, onStartFocus, onAddClick }: TimeSlotSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'time-slot', period: id.replace('schedule-', '') },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200'
      }`}
    >
      {/* 헤더 */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-base-300`}>
        {icon}
        <span className={`text-sm font-semibold ${accentColor}`}>{label}</span>
        <span className="text-xs text-base-content/40 ml-auto">{todos.length}개</span>
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="btn btn-ghost btn-xs btn-circle"
            aria-label={`${label} 할일 추가`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 할일 목록 */}
      <div className="p-2 space-y-1 min-h-[60px]">
        {todos.length === 0 ? (
          <div className="text-xs text-base-content/30 text-center py-3">
            할일을 여기로 드래그하세요
          </div>
        ) : (
          todos
            .sort((a, b) => {
              if (!a.startTime || !b.startTime) return 0;
              return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
            })
            .map(todo => (
              <DraggableTodoChip key={`ts-${todo.id}`} todo={todo} showTime onEditClick={onEditClick} onToggle={onToggle} onUnskip={onUnskip} onSkipTodo={onSkipTodo} onPostpone={onPostpone} onRestoreOriginal={onRestoreOriginal} onStartFocus={onStartFocus} />
            ))
        )}
      </div>
    </div>
  );
}
