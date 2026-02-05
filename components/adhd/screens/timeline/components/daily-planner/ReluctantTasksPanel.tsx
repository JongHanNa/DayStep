'use client';

import { Plus, Dumbbell } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface ReluctantTasksPanelProps {
  todos: Todo[];
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onAddClick?: () => void;
}

export function ReluctantTasksPanel({ todos, onEditClick, onToggle, onSkipTodo, onPostpone, onAddClick }: ReluctantTasksPanelProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'reluctant-tasks',
    data: { type: 'reluctant' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200'
      }`}
    >
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Dumbbell className="w-4 h-4" />
        하기 싫어도 해야 할 일
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="btn btn-ghost btn-xs btn-circle ml-auto"
            aria-label="하기싫어도 할일 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </h3>

      <div className="space-y-1 min-h-[40px]">
        {todos.length === 0 ? (
          <div className="text-xs text-base-content/30 text-center py-2">
            할일을 여기로 드래그하세요
          </div>
        ) : (
          todos.map(todo => (
            <DraggableTodoChip key={`rl-${todo.id}`} todo={todo} onEditClick={onEditClick} onToggle={onToggle} onSkipTodo={onSkipTodo} onPostpone={onPostpone} />
          ))
        )}
      </div>
    </div>
  );
}
