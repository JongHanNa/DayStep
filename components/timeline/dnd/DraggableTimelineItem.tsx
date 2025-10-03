'use client';

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { TimelineItem } from '@/types';

interface DraggableTimelineItemProps {
  item: TimelineItem;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const DraggableTimelineItem = React.memo(function DraggableTimelineItem({
  item,
  children,
  className,
  disabled = false,
}: DraggableTimelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: {
      item,
      type: item.type,
    },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-all duration-200',
        isDragging && 'z-50 shadow-lg scale-105',
        className
      )}
      {...(disabled ? {} : { ...listeners, ...attributes })}
    >
      {children}
    </div>
  );
});

DraggableTimelineItem.displayName = 'DraggableTimelineItem';