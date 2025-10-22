'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  MeasuringConfiguration,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { TimelineItem } from '@/types';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { useTodoStore } from '@/state/stores/todoStore';

interface TimelineDndProviderProps {
  children: React.ReactNode;
}

// Custom measuring configuration for better performance
const measuringConfig: MeasuringConfiguration = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export const TimelineDndProvider: React.FC<TimelineDndProviderProps> = ({ children }) => {
  const [activeItem, setActiveItem] = useState<TimelineItem | null>(null);
  const { updateItem, moveItemToDate } = useTimelineViewStore();
  const updateTodo = useTodoStore(state => state.updateTodo);

  // Configure sensors for better touch and keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay for touch to avoid scroll conflicts
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const item = active.data.current?.item as TimelineItem;
    if (item) {
      setActiveItem(item);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveItem(null);

    if (!over || !active.data.current?.item) return;

    const item = active.data.current.item as TimelineItem;
    const targetDate = over.data.current?.date as Date;
    const targetHour = over.data.current?.hour as number | undefined;

    if (!targetDate) return;

    // Calculate new date with hour if provided
    const newDate = new Date(targetDate);
    if (targetHour !== undefined) {
      newDate.setHours(targetHour, 0, 0, 0);
    }

    // Check if the date actually changed
    const originalDate = new Date(item.startTime);
    if (originalDate.getTime() === newDate.getTime()) return;

    // Update the item in the appropriate store based on type
    // Note: Individual stores may not support date updates directly
    switch (item.type) {
      case 'todo':
        // Todo items don't have direct date properties, only due_date
        // updateTodo(item.id, { due_date: newDate.toISOString() });
        break;
      case 'calendar':
        // Calendar items are read-only
        break;
    }

    // Update the timeline view
    moveItemToDate(item.id, newDate);
  }, [moveItemToDate]);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToWindowEdges]}
      measuring={measuringConfig}
    >
      {children}
      <DragOverlay>
        {activeItem ? (
          <div className="bg-background border rounded-md p-2 shadow-lg opacity-90">
            <div className="text-sm font-medium">{activeItem.title}</div>
            <div className="text-xs text-muted-foreground">
              {activeItem.type === 'todo' ? '할일' : '일정'}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};