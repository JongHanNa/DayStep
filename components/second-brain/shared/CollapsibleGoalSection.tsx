'use client';

import { useState, useMemo } from 'react';
import { Target, Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Goal } from '@/types/second-brain';

interface CollapsibleGoalSectionProps {
  selectedGoalIds: string[];
  allGoals: Goal[];
  onChange: (goalIds: string[]) => void;
  onCreateGoal?: (title: string) => Promise<Goal>;
  onGoalClick?: (goal: Goal) => void;
  areaResourceColor?: string;
  // 즉시 DB 저장을 위한 props
  areaResourceId?: string;
  userId?: string;
  onImmediateSave?: (goalIds: string[]) => Promise<void>;
}

export default function CollapsibleGoalSection({
  selectedGoalIds = [],
  allGoals = [],
  onChange,
  onCreateGoal,
  onGoalClick,
  areaResourceColor = '#808080',
  areaResourceId,
  userId,
  onImmediateSave,
}: CollapsibleGoalSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredGoals = useMemo(() => {
    if (!searchQuery.trim()) return allGoals;

    const query = searchQuery.toLowerCase();
    return allGoals.filter(goal =>
      goal.title?.toLowerCase().includes(query)
    );
  }, [allGoals, searchQuery]);

  // 연결된 목표와 다른 목표 분리
  const connectedGoals = useMemo(() =>
    filteredGoals.filter(g => selectedGoalIds.includes(g.id)),
    [filteredGoals, selectedGoalIds]
  );

  const otherGoals = useMemo(() =>
    filteredGoals.filter(g => !selectedGoalIds.includes(g.id)),
    [filteredGoals, selectedGoalIds]
  );

  // 목표 선택/해제 토글
  const toggleGoal = async (goalId: string) => {
    const newIds = selectedGoalIds.includes(goalId)
      ? selectedGoalIds.filter(id => id !== goalId)
      : [...selectedGoalIds, goalId];

    // 로컬 상태 즉시 업데이트
    onChange(newIds);

    // DB에 즉시 저장 (선택적)
    if (onImmediateSave) {
      try {
        await onImmediateSave(newIds);
      } catch (error) {
        console.error('목표 연결 저장 실패:', error);
        // 실패 시 원래 상태로 되돌리기
        onChange(selectedGoalIds);
      }
    }
  };

  // 목표 생성 및 자동 연결
  const handleCreateGoal = async () => {
    if (!onCreateGoal || !searchQuery.trim()) return;

    try {
      const newGoal = await onCreateGoal(searchQuery.trim());
      const newIds = [...selectedGoalIds, newGoal.id];

      // 로컬 상태 즉시 업데이트
      onChange(newIds);

      // DB에 즉시 저장 (선택적)
      if (onImmediateSave) {
        await onImmediateSave(newIds);
      }

      // 검색어 초기화
      setSearchQuery('');
    } catch (error) {
      console.error('목표 생성 실패:', error);
    }
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5" style={{ color: areaResourceColor }} />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                목표 {selectedGoalIds.length}개
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5" style={{ color: areaResourceColor }} />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              목표 {selectedGoalIds.length}개
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="목표 연결 또는 생성"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 연결된 목표 */}
        {connectedGoals.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              연결된 목표 {connectedGoals.length}개
            </div>
            <div className="space-y-1">
              {connectedGoals.map(goal => (
                <div
                  key={goal.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  {/* 체크박스 - 연결/해제 */}
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleGoal(goal.id);
                    }}
                    className="checkbox checkbox-sm cursor-pointer"
                  />

                  {/* 클릭 가능 영역 - 목표 편집 모달 열기 */}
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => onGoalClick?.(goal)}
                  >
                    <Target className="h-4 w-4" style={{ color: goal.color || '#808080' }} />
                    <span className="text-sm">{goal.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다른 목표들 */}
        {otherGoals.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 목표들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {otherGoals.map(goal => (
                <div
                  key={goal.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  {/* 체크박스 - 연결/해제 */}
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleGoal(goal.id);
                    }}
                    className="checkbox checkbox-sm cursor-pointer"
                  />

                  {/* 클릭 가능 영역 - 목표 편집 모달 열기 */}
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => onGoalClick?.(goal)}
                  >
                    <Target className="h-4 w-4" style={{ color: goal.color || '#808080' }} />
                    <span className="text-sm">{goal.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 목표가 없을 때 (검색어 없을 때만) */}
        {filteredGoals.length === 0 && !searchQuery && (
          <div className="p-8 text-center text-base-content/50">
            목표가 없습니다
          </div>
        )}

        {/* 검색어가 있을 때 항상 생성 버튼 표시 */}
        {onCreateGoal && searchQuery.trim() && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={handleCreateGoal}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <Plus className="h-5 w-5 text-base-content/70" />
              <Target className="h-5 w-5 text-base-content/70" />
              <span className="text-sm">
                새로운 <strong>{searchQuery}</strong> 목표 생성
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
