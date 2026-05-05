'use client';

import { Plus, Target } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';
import type { ProjectMapValue, DepartmentMapValue } from '../../timeline/types';

interface QuadrantProps {
  id: string;
  label: React.ReactNode;
  sublabel: string;
  todos: Todo[];
  bgColor: string;
  hideOverdue?: boolean;
  projectMap?: Map<string, ProjectMapValue>;
  departmentMap?: Map<string, DepartmentMapValue>;
  highlightProjectId?: string | null;
  todoMotivationMap?: Record<string, {id: string; title: string; content: string}[]>;
  expandedMotivationId?: string | null;
  onExpandMotivation?: (id: string | null) => void;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onUnassign?: (todo: Todo) => void;
}

function Quadrant({ id, label, sublabel, todos, bgColor, hideOverdue, projectMap, departmentMap, highlightProjectId, todoMotivationMap, expandedMotivationId, onExpandMotivation, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onUnassign }: QuadrantProps) {
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
            <DraggableTodoChip key={`mx-${todo.id}`} todo={todo} hideOverdue={hideOverdue} projectMap={projectMap} departmentMap={departmentMap} highlightProjectId={highlightProjectId} linkedMotivations={todoMotivationMap?.[todo.id]} expandedMotivationId={expandedMotivationId} onExpandMotivation={onExpandMotivation} onEditClick={onEditClick} onToggle={onToggle} onUnskip={onUnskip} onSkipTodo={onSkipTodo} onPostpone={onPostpone} onUnassign={onUnassign} />
          ))
        )}
      </div>
    </div>
  );
}

interface PriorityMatrixPanelProps {
  todos: Todo[];
  projectMap?: Map<string, ProjectMapValue>;
  departmentMap?: Map<string, DepartmentMapValue>;
  highlightProjectId?: string | null;
  todoMotivationMap?: Record<string, {id: string; title: string; content: string}[]>;
  expandedMotivationId?: string | null;
  onExpandMotivation?: (id: string | null) => void;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onAddClick?: () => void;
  onUnassign?: (todo: Todo) => void;
}

export function PriorityMatrixPanel({ todos, projectMap, departmentMap, highlightProjectId, todoMotivationMap, expandedMotivationId, onExpandMotivation, onEditClick, onToggle, onUnskip, onSkipTodo, onPostpone, onAddClick, onUnassign }: PriorityMatrixPanelProps) {
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
          label="중요O 긴급O"
          sublabel=""
          todos={q1}
          bgColor="bg-error/5"
          hideOverdue
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoMotivationMap={todoMotivationMap}
          expandedMotivationId={expandedMotivationId}
          onExpandMotivation={onExpandMotivation}
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q2"
          label="중요X 긴급O"
          sublabel=""
          todos={q2}
          bgColor="bg-warning/5"
          hideOverdue
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoMotivationMap={todoMotivationMap}
          expandedMotivationId={expandedMotivationId}
          onExpandMotivation={onExpandMotivation}
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q3"
          label="중요O 긴급X"
          sublabel=""
          todos={q3}
          bgColor="bg-info/5"
          hideOverdue
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoMotivationMap={todoMotivationMap}
          expandedMotivationId={expandedMotivationId}
          onExpandMotivation={onExpandMotivation}
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onUnassign={onUnassign}
        />
        <Quadrant
          id="matrix-q4"
          label="중요X 긴급X"
          sublabel=""
          todos={q4}
          bgColor="bg-base-100"
          hideOverdue
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoMotivationMap={todoMotivationMap}
          expandedMotivationId={expandedMotivationId}
          onExpandMotivation={onExpandMotivation}
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
