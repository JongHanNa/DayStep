'use client';

import { Plus, Target, Flame, Zap, ClipboardList, MessageCircle } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface QuadrantProps {
  id: string;
  label: React.ReactNode;
  sublabel: string;
  todos: Todo[];
  bgColor: string;
  hideOverdue?: boolean;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onUnassign?: (todo: Todo) => void;
}

function Quadrant({ id, label, sublabel, todos, bgColor, hideOverdue, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onUnassign }: QuadrantProps) {
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
            <DraggableTodoChip key={`mx-${todo.id}`} todo={todo} hideOverdue={hideOverdue} onEditClick={onEditClick} onToggle={onToggle} onUnskip={onUnskip} onSkipTodo={onSkipTodo} onPostpone={onPostpone} onUnassign={onUnassign} />
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
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onAddClick?: () => void;
  onUnassign?: (todo: Todo) => void;
}

export function PriorityMatrixPanel({ todos, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onAddClick, onUnassign }: PriorityMatrixPanelProps) {
  const q1 = todos.filter((t: any) => t.importance === true && t.urgency === true);
  const q2 = todos.filter((t: any) => t.importance === false && t.urgency === true);
  const q3 = todos.filter((t: any) => t.importance === true && t.urgency === false);
  const q4 = todos.filter((t: any) => t.importance === false && t.urgency === false);

  return (
    <div className="rounded-lg border border-base-300 bg-base-200 p-3">
      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Target className="w-4 h-4" />
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
          label={<><Flame className="w-3.5 h-3.5 text-error inline" /> 지금!</>}
          sublabel="중요O 긴급O"
          todos={q1}
          bgColor="bg-error/5"
          hideOverdue
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q2"
          label={<><Zap className="w-3.5 h-3.5 text-warning inline" /> 빠르게</>}
          sublabel="중요X 긴급O"
          todos={q2}
          bgColor="bg-warning/5"
          hideOverdue
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q3"
          label={<><ClipboardList className="w-3.5 h-3.5 text-info inline" /> 계획</>}
          sublabel="중요O 긴급X"
          todos={q3}
          bgColor="bg-info/5"
          hideOverdue
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q4"
          label={<><MessageCircle className="w-3.5 h-3.5 text-base-content/50 inline" /> 나중에</>}
          sublabel="중요X 긴급X"
          todos={q4}
          bgColor="bg-base-100"
          hideOverdue
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
      </div>
    </div>
  );
}
