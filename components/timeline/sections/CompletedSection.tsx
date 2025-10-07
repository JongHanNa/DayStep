'use client';

import React, { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TimelineItemCard } from '../items';

interface CompletedSectionProps {
  completedItems: any[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleComplete: (itemId: string) => void;
  onTodoClick: (itemId: string, item?: any) => void;
  onEditModalOpen: (todo: any) => void;
}

// 완료된 할일 섹션 컴포넌트
const CompletedSection = memo(({
  completedItems,
  isCollapsed,
  onToggleCollapse,
  onToggleComplete,
  onTodoClick,
  onEditModalOpen
}: CompletedSectionProps) => {
  
  if (completedItems.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-1 pb-4">
      {/* 완료된 할일 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4 px-0">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-full transition-colors bg-section-header hover:bg-section-header-hover"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-gray-700 dark:text-gray-300">완료된 할일</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              ({completedItems.length})
            </span>
          </div>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          )}
        </button>
      </div>
      
      {/* 완료된 할일 아이템들 */}
      {!isCollapsed && (
        <div className="space-y-2 px-2">
          {completedItems.map((item: any, index: number) => {
            const todoData = item.data;
            const isRecurring = todoData?.is_recurrence_instance || 
                              (todoData?.recurrence_pattern && todoData.recurrence_pattern !== 'none');
            
            return (
              <div key={`completed-${item.id}-${index}`} className={`opacity-60 ${isRecurring ? 'group hover:opacity-80 transition-opacity' : ''}`}>
                {isRecurring && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-popover border rounded-md px-2 py-1 text-xs text-muted-foreground">
                      클릭하여 완료 해제
                    </div>
                  </div>
                )}
                <TimelineItemCard
                  item={item}
                  onTodoClick={(itemId: string) => {
                    // 완료된 할일 클릭 시 처리
                    if (item.type === 'todo') {
                      const todoData = item.data;
                      const isRecurring = todoData?.is_recurrence_instance || 
                                        (todoData?.recurrence_pattern && todoData.recurrence_pattern !== 'none');
                      
                      if (isRecurring) {
                        // 반복 할일: 완료 상태 해제 (미완료로 토글)
                        console.log('🔄 완료된 반복 할일 클릭 - 완료 해제:', {
                          todoContent: todoData.content,
                          currentDate: new Date().toISOString().split('T')[0]
                        });
                        onToggleComplete(itemId);
                      } else {
                        // 일반 할일: 편집 모달 열기
                        onEditModalOpen(item.data);
                      }
                    }
                  }}
                  onToggleComplete={onToggleComplete}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

CompletedSection.displayName = 'CompletedSection';

export default CompletedSection;