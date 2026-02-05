'use client';

import { TimeSlotSection } from './TimeSlotSection';
import type { Todo } from '@/entities/todo/Todo';

interface TimeSchedulePanelProps {
  morningTodos: Todo[];
  afternoonTodos: Todo[];
  eveningTodos: Todo[];
}

export function TimeSchedulePanel({ morningTodos, afternoonTodos, eveningTodos }: TimeSchedulePanelProps) {
  return (
    <div className="space-y-3">
      <TimeSlotSection
        id="schedule-morning"
        label="오전"
        icon="🌅"
        todos={morningTodos}
        accentColor="text-amber-600"
      />
      <TimeSlotSection
        id="schedule-afternoon"
        label="오후"
        icon="☀️"
        todos={afternoonTodos}
        accentColor="text-orange-600"
      />
      <TimeSlotSection
        id="schedule-evening"
        label="저녁"
        icon="🌙"
        todos={eveningTodos}
        accentColor="text-indigo-600"
      />
    </div>
  );
}
