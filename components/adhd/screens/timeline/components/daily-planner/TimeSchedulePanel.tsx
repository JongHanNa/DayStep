'use client';

import { TimeSlotSection } from './TimeSlotSection';
import type { Todo } from '@/entities/todo/Todo';

interface TimeSchedulePanelProps {
  morningTodos: Todo[];
  afternoonTodos: Todo[];
  eveningTodos: Todo[];
  onEditClick?: (todo: Todo) => void;
  onToggle?: (todo: Todo) => void;
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
  onAddMorning,
  onAddAfternoon,
  onAddEvening,
}: TimeSchedulePanelProps) {
  return (
    <div className="space-y-3">
      <TimeSlotSection
        id="schedule-morning"
        label="오전"
        icon="🌅"
        todos={morningTodos}
        accentColor="text-amber-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onAddClick={onAddMorning}
      />
      <TimeSlotSection
        id="schedule-afternoon"
        label="오후"
        icon="☀️"
        todos={afternoonTodos}
        accentColor="text-orange-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onAddClick={onAddAfternoon}
      />
      <TimeSlotSection
        id="schedule-evening"
        label="저녁"
        icon="🌙"
        todos={eveningTodos}
        accentColor="text-indigo-600"
        onEditClick={onEditClick}
        onToggle={onToggle}
        onAddClick={onAddEvening}
      />
    </div>
  );
}
