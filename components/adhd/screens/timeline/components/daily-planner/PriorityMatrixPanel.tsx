'use client';

import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface QuadrantProps {
  id: string;
  label: string;
  sublabel: string;
  todos: Todo[];
  bgColor: string;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
}

function Quadrant({ id, label, sublabel, todos, bgColor, onEditClick, onToggle }: QuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'matrix',
      importance: id === 'matrix-q1' || id === 'matrix-q3',
      urgency: id === 'matrix-q1' || id === 'matrix-q2',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-2 min-h-[80px] transition-colors ${
        isOver ? 'border-primary bg-primary/5' : `border-base-300 ${bgColor}`
      }`}
    >
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-semibold text-base-content/70">{label}</span>
        <span className="text-[10px] text-base-content/40">{sublabel}</span>
      </div>
      <div className="space-y-1">
        {todos.length === 0 ? (
          <div className="text-[10px] text-base-content/25 text-center py-2">드래그</div>
        ) : (
          todos.map(todo => (
            <DraggableTodoChip key={`mx-${todo.id}`} todo={todo} onEditClick={onEditClick} onToggle={onToggle} />
          ))
        )}
      </div>
    </div>
  );
}

interface PriorityMatrixPanelProps {
  todos: Todo[];
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onAddClick?: () => void;
}

export function PriorityMatrixPanel({ todos, onEditClick, onToggle, onAddClick }: PriorityMatrixPanelProps) {
  const q1 = todos.filter((t: any) => t.importance === true && t.urgency === true);
  const q2 = todos.filter((t: any) => t.importance === false && t.urgency === true);
  const q3 = todos.filter((t: any) => t.importance === true && t.urgency === false);
  const q4 = todos.filter((t: any) => t.importance === false && t.urgency === false);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <span>🎯</span>
        우선순위
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="btn btn-ghost btn-xs btn-circle ml-auto"
            aria-label="우선순위 할일 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </h3>

      {/* 축 라벨 */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-base-content/40 mb-1">
        <span>긴급O ←</span>
        <span>→ 긴급X</span>
      </div>

      {/* 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-2">
        <Quadrant
          id="matrix-q1"
          label="🔥 지금!"
          sublabel="중요O 긴급O"
          todos={q1}
          bgColor="bg-error/5"
          onEditClick={onEditClick}
          onToggle={onToggle}
        />
        <Quadrant
          id="matrix-q2"
          label="⚡ 빠르게"
          sublabel="중요X 긴급O"
          todos={q2}
          bgColor="bg-warning/5"
          onEditClick={onEditClick}
          onToggle={onToggle}
        />
        <Quadrant
          id="matrix-q3"
          label="📋 계획"
          sublabel="중요O 긴급X"
          todos={q3}
          bgColor="bg-info/5"
          onEditClick={onEditClick}
          onToggle={onToggle}
        />
        <Quadrant
          id="matrix-q4"
          label="💭 나중에"
          sublabel="중요X 긴급X"
          todos={q4}
          bgColor="bg-base-100"
          onEditClick={onEditClick}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
