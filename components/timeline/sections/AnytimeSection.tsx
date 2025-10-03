'use client';

import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TimelineItemCard } from '../items';

interface AnytimeSectionProps {
  anytimeItems: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleComplete: (itemId: string) => void;
  onTodoClick: (itemId: string) => void;
}

// 언제든지 할일 섹션 컴포넌트
const AnytimeSection = memo(({
  anytimeItems,
  isCollapsed,
  onToggleCollapse,
  onToggleComplete,
  onTodoClick
}: AnytimeSectionProps) => {
  
  if (anytimeItems.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-1 pb-4">
      <div className="flex items-center justify-between mb-4 px-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-full transition-colors bg-[#e5e5e5] hover:bg-[#d5d5d5]"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gray-700 dark:text-gray-300">언제든지</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ({anytimeItems.length})
            </span>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="space-y-2 px-2">
          {anytimeItems.map((item) => (
            <TimelineItemCard
              key={item.id}
              item={item}
              onTodoClick={(itemId) => {
                // 할일 타입인 경우 수정 모달 열기, 아니면 완료 토글
                if (item.type === 'todo') {
                  onTodoClick(itemId);
                } else {
                  onToggleComplete(itemId);
                }
              }}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
});

AnytimeSection.displayName = 'AnytimeSection';

export default AnytimeSection;