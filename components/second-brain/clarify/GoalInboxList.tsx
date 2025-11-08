'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { Goal } from '@/types/second-brain';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

interface GoalInboxListProps {
  goals: Goal[];
  onGoalClick?: (goal: Goal) => void;

  // 편집 모드 관련
  isEditMode: boolean;
  selectedIds: Set<string>;
  swipedItemId: string | null;
  onSelectionChange: (id: string, isChecked: boolean, shiftKey: boolean, index: number) => void;
  onSwipe: (itemId: string | null) => void;
  onDeleteClick: (e: React.MouseEvent, itemId: string) => void;
  dragStartX: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
}

export default function GoalInboxList({
  goals,
  onGoalClick,
  isEditMode,
  selectedIds,
  swipedItemId,
  onSelectionChange,
  onSwipe,
  onDeleteClick,
  dragStartX,
  isDragging,
}: GoalInboxListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          목표 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          영역/자원, 종료일을 배정하면 수집함에서 사라집니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {goals.map((goal, index) => {
        const IconComponent = getUnifiedIcon(goal.icon as UnifiedIconKey);

        // 미배정 상태 확인
        const hasNoAreaOrResource = !goal.area_id && !goal.resource_id;
        const hasNoEndDate = !goal.end_date;

        return (
          <div key={goal.id} className="relative overflow-hidden rounded-lg">
            {/* 배경 레이어 - 삭제 버튼 */}
            <div className="absolute inset-0 bg-error flex items-center justify-end px-4">
              <button
                onClick={(e) => onDeleteClick(e, goal.id)}
                className="text-white flex items-center gap-2 font-medium"
              >
                <Trash2 className="w-5 h-5" />
                삭제
              </button>
            </div>

            {/* 카드 레이어 */}
            <motion.div
              drag={!isEditMode ? "x" : false}
              dragConstraints={{ left: -80, right: 0 }}
              dragElastic={0.1}
              onDragStart={() => {
                isDragging.current = true;
              }}
              onDragEnd={(_, info) => {
                const threshold = -60;
                if (info.offset.x < threshold) {
                  onSwipe(goal.id);
                } else {
                  onSwipe(null);
                }
                setTimeout(() => {
                  isDragging.current = false;
                }, 0);
              }}
              animate={{
                x: swipedItemId === goal.id ? -80 : 0,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-white"
            >
              <button
                onClick={(e) => {
                  if (isDragging.current) {
                    e.preventDefault();
                    return;
                  }

                  if (isEditMode) {
                    onSelectionChange(
                      goal.id,
                      !selectedIds.has(goal.id),
                      e.nativeEvent.shiftKey,
                      index
                    );
                  } else {
                    onGoalClick?.(goal);
                  }
                }}
                className="relative hover:bg-base-100 transition-colors cursor-pointer w-full text-left"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 편집 모드: 체크박스 */}
                    {isEditMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(goal.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          onSelectionChange(
                            goal.id,
                            e.target.checked,
                            (e.nativeEvent as MouseEvent).shiftKey,
                            index
                          );
                        }}
                        className="checkbox checkbox-primary flex-shrink-0 mt-1"
                      />
                    )}

                    {/* 아이콘 */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: goal.color + '30',
                        borderColor: goal.color,
                        borderWidth: '2px',
                      }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: goal.color }} />
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{goal.title}</p>
                      {goal.description && (
                        <p className="text-sm text-base-content/60 mb-2">{goal.description}</p>
                      )}

                      {/* 미배정 상태 표시 */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {hasNoAreaOrResource && (
                          <span className="badge badge-sm badge-warning">영역/자원 미배정</span>
                        )}
                        {hasNoEndDate && (
                          <span className="badge badge-sm badge-warning">종료일 미배정</span>
                        )}
                        {goal.quarter_goal && (
                          <span className="badge badge-sm">분기</span>
                        )}
                        {goal.year_goal && !goal.quarter_goal && (
                          <span className="badge badge-sm">연간</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
