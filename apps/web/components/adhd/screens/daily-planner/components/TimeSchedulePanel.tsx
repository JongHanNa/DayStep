'use client';

import { Sunrise, Sun, Moon } from 'lucide-react';
import { TimeSlotSection } from './TimeSlotSection';
import type { Todo } from '@/entities/todo/Todo';

interface TimeSchedulePanelProps {
  morningTodos: Todo[];
  afternoonTodos: Todo[];
  eveningTodos: Todo[];
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
  onUnskip?: (todo: Todo) => void;
  onSkipTodo?: (todo: Todo, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
  onAddMorning?: () => void;
  onAddAfternoon?: () => void;
  onAddEvening?: () => void;
}

export function TimeSchedulePanel({
  morningTodos,
  afternoonTodos,
  eveningTodos,
  onEditClick,
  onToggle,
  onUnskip,
  onSkipTodo,
  onPostpone,
  onAddMorning,
  onAddAfternoon,
  onAddEvening,
}: TimeSchedulePanelProps) {
  return (
    <div className="space-y-3">
      <TimeSlotSection
        id="schedule-morning"
        label="오전"
        icon={<Sunrise className="w-4 h-4 text-amber-600" />}
        todos={morningTodos}
        accentColor="text-amber-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onAddClick={onAddMorning}
      />
      <TimeSlotSection
        id="schedule-afternoon"
        label="오후"
        icon={<Sun className="w-4 h-4 text-orange-600" />}
        todos={afternoonTodos}
        accentColor="text-orange-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onAddClick={onAddAfternoon}
      />
      <TimeSlotSection
        id="schedule-evening"
        label="저녁"
        icon={<Moon className="w-4 h-4 text-indigo-600" />}
        todos={eveningTodos}
        accentColor="text-indigo-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onUnskip={onUnskip}
        onSkipTodo={onSkipTodo}
        onPostpone={onPostpone}
        onAddClick={onAddEvening}
      />
    </div>
  );
}
