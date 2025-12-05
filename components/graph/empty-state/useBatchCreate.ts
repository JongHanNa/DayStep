/**
 * 일괄 생성 훅
 *
 * 선택된 추천 항목들을 한 번에 생성
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import type { GraphNodeType } from '@/types/graph';
import type { RecommendationItem } from './RecommendationData';
import { NODE_TYPE_COLORS } from '@/lib/graph-utils';

interface UseBatchCreateReturn {
  /** 선택된 항목 ID 목록 */
  selectedIds: Set<string>;
  /** 항목 선택 토글 */
  toggleSelection: (id: string) => void;
  /** 모든 항목 선택 해제 */
  clearSelection: () => void;
  /** 특정 타입의 모든 항목 선택/해제 */
  toggleTypeSelection: (type: GraphNodeType, items: RecommendationItem[], selectAll: boolean) => void;
  /** 선택된 항목 개수 */
  selectedCount: number;
  /** 일괄 생성 실행 */
  createSelected: (items: RecommendationItem[]) => Promise<void>;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 특정 항목이 선택되었는지 확인 */
  isSelected: (id: string) => boolean;
}

export function useBatchCreate(): UseBatchCreateReturn {
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 스토어 액션들
  const { createArea } = useAreaStore();
  const { createResource } = useResourceStore();
  const { createGoal } = useGoalStore();
  const { createProject } = useProjectStore();
  const { createTodo } = useTodoStore();
  const { createNote } = useNoteStore();

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleTypeSelection = useCallback(
    (type: GraphNodeType, items: RecommendationItem[], selectAll: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const typeItems = items.filter((item) => item.type === type);

        if (selectAll) {
          typeItems.forEach((item) => next.add(item.id));
        } else {
          typeItems.forEach((item) => next.delete(item.id));
        }

        return next;
      });
    },
    []
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const createItem = useCallback(
    async (item: RecommendationItem, userId: string): Promise<void> => {
      const color = NODE_TYPE_COLORS[item.type];

      switch (item.type) {
        case 'area':
          await createArea(userId, {
            title: item.title,
            color: color,
            is_pinned: false,
            order_index: 0,
          });
          break;

        case 'resource':
          await createResource(userId, {
            title: item.title,
            color: color,
            is_pinned: false,
            order_index: 0,
          });
          break;

        case 'goal':
          await createGoal(userId, {
            title: item.title,
            color: color,
            status: 'not_started',
          });
          break;

        case 'project':
          await createProject(userId, {
            title: item.title,
            color: color,
            status: 'not_started',
            order_index: 0,
          });
          break;

        case 'todo':
          await createTodo({
            title: item.title,
            schedule_type: 'anytime',
            priority: 'medium',
          });
          break;

        case 'note':
          await createNote(userId, {
            title: item.title,
            content: '',
            note_category: 'none',
            is_pinned: false,
          });
          break;
      }
    },
    [createArea, createResource, createGoal, createProject, createTodo, createNote]
  );

  const createSelected = useCallback(
    async (allItems: RecommendationItem[]) => {
      const userId = user?.id;
      if (!userId) {
        setError('로그인이 필요합니다.');
        return;
      }

      if (selectedIds.size === 0) {
        setError('선택된 항목이 없습니다.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 선택된 항목 필터링
        const itemsToCreate = allItems.filter((item) => selectedIds.has(item.id));

        // 계층 순서대로 생성 (area/resource → goal → project → todo → note)
        const typeOrder: GraphNodeType[] = ['area', 'resource', 'goal', 'project', 'todo', 'note'];

        for (const type of typeOrder) {
          const typeItems = itemsToCreate.filter((item) => item.type === type);
          for (const item of typeItems) {
            await createItem(item, userId);
          }
        }

        // 성공 시 선택 초기화
        clearSelection();
      } catch (err) {
        console.error('❌ 일괄 생성 실패:', err);
        setError(err instanceof Error ? err.message : '생성에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      user?.id,
      selectedIds,
      createItem,
      clearSelection,
    ]
  );

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    toggleTypeSelection,
    selectedCount: selectedIds.size,
    createSelected,
    isLoading,
    error,
    isSelected,
  };
}

export default useBatchCreate;
