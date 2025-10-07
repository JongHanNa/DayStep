'use client';

import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TimelineItemCard } from '../items';

interface AllDaySectionProps {
  allDayItems: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleComplete: (item: any) => void;
  onTodoClick: (itemId: string) => void;
  isDraggable?: boolean;
  isDragging?: boolean;
  draggedItemId?: string | null;
  cardOffsetY?: number; // 카드 위치 보정값
  onDragHandlers?: {
    onTouchStart: (e: React.TouchEvent | React.MouseEvent, itemId: string) => void;
    onTouchMove: (e: React.TouchEvent | React.MouseEvent) => void;
    onTouchEnd: () => void;
  };
}

// 종일 일정 섹션 컴포넌트
const AllDaySection = memo(({
  allDayItems,
  isCollapsed,
  onToggleCollapse,
  onToggleComplete,
  onTodoClick,
  isDraggable = false,
  isDragging = false,
  draggedItemId = null,
  cardOffsetY = 0,
  onDragHandlers
}: AllDaySectionProps) => {
  
  if (allDayItems.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-1 pb-4">
      {/* 종일 일정 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4 px-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-full transition-colors bg-section-header hover:bg-section-header-hover"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gray-700 dark:text-gray-300">종일 일정</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ({allDayItems.length})
            </span>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* 종일 일정 아이템들 */}
      {!isCollapsed && (
        <div className="space-y-2 px-2">
          {allDayItems.map((item) => (
            <TimelineItemCard
              key={item.id}
              item={item}
              onToggleComplete={() => onToggleComplete(item)}
              onTodoClick={() => onTodoClick(item.id)}
              isDraggable={isDraggable}
              isDragging={isDragging}
              draggedItemId={draggedItemId}
              cardOffsetY={cardOffsetY} // 카드 위치 보정값
              showCheckbox={false} // 종일 일정에서는 체크박스 숨김
              onDragHandlers={onDragHandlers}
            />
          ))}
        </div>
      )}
    </div>
  );
});

AllDaySection.displayName = 'AllDaySection';

export default AllDaySection;