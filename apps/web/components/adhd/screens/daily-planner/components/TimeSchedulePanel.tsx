'use client';

import { Sunrise, Sun, Moon, Infinity, PauseCircle } from 'lucide-react';
import { TimeSlotSection } from './TimeSlotSection';
import type { Todo } from '@/entities/todo/Todo';
import type { ProjectMapValue, DepartmentMapValue } from '../../timeline/types';

interface TimeSchedulePanelProps {
  anytimeTodos: Todo[];
  deferredTodos: Todo[];
  morningTodos: Todo[];
  afternoonTodos: Todo[];
  eveningTodos: Todo[];
  projectMap?: Map<string, ProjectMapValue>;
  departmentMap?: Map<string, DepartmentMapValue>;
  highlightProjectId?: string | null;
  todoFuelMap?: Record<string, {id: string; title: string; content: string}[]>;
  expandedFuelId?: string | null;
  onExpandFuel?: (id: string | null) => void;
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onRestoreOriginal?: (todo: Todo) => void;
  onStartFocus?: (todo: Todo) => void;
  onAddMorning?: () => void;
  onAddAfternoon?: () => void;
  onAddEvening?: () => void;
}

export function TimeSchedulePanel({
  anytimeTodos,
  deferredTodos,
  morningTodos,
  afternoonTodos,
  eveningTodos,
  projectMap,
  departmentMap,
  highlightProjectId,
  todoFuelMap,
  expandedFuelId,
  onExpandFuel,
  onEditClick,
  onToggle,
  onUnskip,
  onSkipTodo,
  onPostpone,
  onRestoreOriginal,
  onStartFocus,
  onAddMorning,
  onAddAfternoon,
  onAddEvening,
}: TimeSchedulePanelProps) {
  return (
    <div className="space-y-3">
      {anytimeTodos.length > 0 && (
        <TimeSlotSection
          id="schedule-anytime"
          label="언제든지"
          icon={<Infinity className="w-4 h-4 text-emerald-600" />}
          todos={anytimeTodos}
          accentColor="text-emerald-600"
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoFuelMap={todoFuelMap}
          expandedFuelId={expandedFuelId}
          onExpandFuel={onExpandFuel}
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onRestoreOriginal={onRestoreOriginal}
          onStartFocus={onStartFocus}
        />
      )}
      {deferredTodos.length > 0 && (
        <TimeSlotSection
          id="schedule-deferred"
          label="미룸"
          icon={<PauseCircle className="w-4 h-4 text-purple-600" />}
          todos={deferredTodos}
          accentColor="text-purple-600"
          projectMap={projectMap}
          departmentMap={departmentMap}
          highlightProjectId={highlightProjectId}
          todoFuelMap={todoFuelMap}
          expandedFuelId={expandedFuelId}
          onExpandFuel={onExpandFuel}
          onEditClick={onEditClick}
          onToggle={onToggle}
          onUnskip={onUnskip}
          onSkipTodo={onSkipTodo}
          onPostpone={onPostpone}
          onRestoreOriginal={onRestoreOriginal}
          onStartFocus={onStartFocus}
        />
      )}
      <TimeSlotSection
        id="schedule-morning"
        label="오전"
        icon={<Sunrise className="w-4 h-4 text-amber-600" />}
        todos={morningTodos}
        accentColor="text-amber-600"
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onRestoreOriginal={onRestoreOriginal}
        onStartFocus={onStartFocus}
        onAddClick={onAddMorning}
      />
      <TimeSlotSection
        id="schedule-afternoon"
        label="오후"
        icon={<Sun className="w-4 h-4 text-orange-600" />}
        todos={afternoonTodos}
        accentColor="text-orange-600"
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onRestoreOriginal={onRestoreOriginal}
        onStartFocus={onStartFocus}
        onAddClick={onAddAfternoon}
      />
      <TimeSlotSection
        id="schedule-evening"
        label="저녁"
        icon={<Moon className="w-4 h-4 text-indigo-600" />}
        todos={eveningTodos}
        accentColor="text-indigo-600"
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onRestoreOriginal={onRestoreOriginal}
        onStartFocus={onStartFocus}
        onAddClick={onAddEvening}
      />
    </div>
  );
}
