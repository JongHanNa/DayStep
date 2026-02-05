'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface TimeSlotSectionProps {
  id: string;
  label: string;
  icon: string;
  todos: Todo[];
  accentColor: string;
}

export function TimeSlotSection({ id, label, icon, todos, accentColor }: TimeSlotSectionProps) {
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
        <span className="text-base">{icon}</span>
        <span className={`text-sm font-semibold ${accentColor}`}>{label}</span>
        <span className="text-xs text-base-content/40 ml-auto">{todos.length}개</span>
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
              <DraggableTodoChip key={`ts-${todo.id}`} todo={todo} showTime />
            ))
        )}
      </div>
    </div>
  );
}
