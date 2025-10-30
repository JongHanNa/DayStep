'use client';

import type { Goal } from '@/types/second-brain';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';

interface GoalInboxListProps {
  goals: Goal[];
  onGoalClick?: (goal: Goal) => void;
}

export default function GoalInboxList({ goals, onGoalClick }: GoalInboxListProps) {
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
      {goals.map((goal) => {
        const IconComponent = getUnifiedIcon(goal.icon as UnifiedIconKey);

        // 미배정 상태 확인
        const hasNoAreaOrResource = !goal.area_id && !goal.resource_id;
        const hasNoEndDate = !goal.end_date;

        return (
          <button
            key={goal.id}
            onClick={() => onGoalClick?.(goal)}
            className="w-full text-left p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
          >
            <div className="flex items-start gap-3">
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
          </button>
        );
      })}
    </div>
  );
}
