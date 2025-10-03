'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableTimelineAreaProps {
  id: string;
  date: Date;
  hour?: number;
  children: React.ReactNode;
  className?: string;
  isHighlighted?: boolean;
}

export const DroppableTimelineArea = React.memo(function DroppableTimelineArea({
  id,
  date,
  hour,
  children,
  className,
  isHighlighted = false,
}: DroppableTimelineAreaProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      date,
      hour,
      type: 'timeline-drop-area',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative transition-colors duration-200',
        isOver && 'bg-primary/10 ring-2 ring-primary/50',
        isHighlighted && 'bg-accent/20',
        className
      )}
    >
      {children}
    </div>
  );
});

DroppableTimelineArea.displayName = 'DroppableTimelineArea';