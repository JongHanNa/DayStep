/**
 * 일괄 생성 훅
 *
 * 선택된 추천 항목들을 한 번에 생성
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import type { GraphNodeType } from '@/types/graph';
import type { RecommendationItem } from './RecommendationData';
import { getAllSetItems } from './RecommendationData';
import { NODE_TYPE_COLORS } from '@/lib/graph-utils';
import { addTodoProject } from '@/lib/supabase/todo-projects';
import { linkProjectNote } from '@/lib/supabase/project-notes';
import { useGraphFocus } from '@/state/stores/graphStore';
import { useUsageStats, type CanCreateResult } from '@/hooks/useUsageStats';
import { type UsageEntityType, ENTITY_DISPLAY_NAME } from '@/lib/featureFlags';

/** 제한 초과 엔티티 정보 */
export interface ExceededEntity {
  entity: UsageEntityType;
  displayName: string;
  current: number;
  limit: number;
  willAdd: number;
  total: number;
}

/** 제한 체크 결과 */
export interface LimitCheckResult {
  canCreate: boolean;
  exceededEntities: ExceededEntity[];
}

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
  /** 제한 체크 결과 */
  limitCheck: LimitCheckResult;
  /** Pro 구독 여부 */
  hasActiveSubscription: boolean;
}

interface UseBatchCreateOptions {
  /** 생성 완료 후 호출되는 콜백 (그래프 데이터 refetch용) */
  onComplete?: () => Promise<void> | void;
}

export function useBatchCreate(options?: UseBatchCreateOptions): UseBatchCreateReturn {
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
  const { setFocusNodeId } = useGraphFocus();

  // 사용량 통계
  const { canCreate, hasActiveSubscription } = useUsageStats();

  // GraphNodeType을 UsageEntityType으로 매핑
  const nodeTypeToEntityType = useCallback((nodeType: GraphNodeType): UsageEntityType | null => {
    switch (nodeType) {
      case 'area':
      case 'resource':
        return 'area_resource';
      case 'goal':
        return 'goal';
      case 'project':
        return 'project';
      case 'todo':
        return 'todo';
      case 'note':
        return 'note';
      default:
        return null;
    }
  }, []);

  // 선택된 항목들의 제한 체크
  const limitCheck = useMemo((): LimitCheckResult => {
    // Pro 사용자는 무제한
    if (hasActiveSubscription) {
      return { canCreate: true, exceededEntities: [] };
    }

    // 선택된 항목 가져오기
    const allItems = getAllSetItems();
    const selectedItems = allItems.filter((item) => selectedIds.has(item.id));

    if (selectedItems.length === 0) {
      return { canCreate: true, exceededEntities: [] };
    }

    // 타입별 카운트
    const typeCounts: Record<string, number> = {};
    selectedItems.forEach((item) => {
      const entityType = nodeTypeToEntityType(item.type);
      if (entityType) {
        typeCounts[entityType] = (typeCounts[entityType] || 0) + 1;
      }
    });

    // 제한 초과 엔티티 확인
    const exceededEntities: ExceededEntity[] = [];
    const entityTypes: UsageEntityType[] = ['area_resource', 'goal', 'project', 'todo', 'note'];

    entityTypes.forEach((entityType) => {
      const willAdd = typeCounts[entityType] || 0;
      if (willAdd === 0) return;

      const result = canCreate(entityType);
      const total = result.current + willAdd;

      if (total > result.limit) {
        exceededEntities.push({
          entity: entityType,
          displayName: result.displayName,
          current: result.current,
          limit: result.limit,
          willAdd,
          total,
        });
      }
    });

    return {
      canCreate: exceededEntities.length === 0,
      exceededEntities,
    };
  }, [selectedIds, hasActiveSubscription, canCreate, nodeTypeToEntityType]);

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

  /**
   * 항목 생성 (관계 설정 포함)
   * @param item - 추천 항목
   * @param userId - 사용자 ID
   * @param parentDbId - 부모의 실제 DB ID (없으면 연결 없이 생성)
   * @param parentType - 부모의 타입 (area, resource, goal, project)
   * @returns 생성된 항목의 ID
   */
  const createItemWithRelation = useCallback(
    async (
      item: RecommendationItem,
      userId: string,
      parentDbId?: string,
      parentType?: GraphNodeType
    ): Promise<string> => {
      const color = NODE_TYPE_COLORS[item.type];

      switch (item.type) {
        case 'area': {
          const area = await createArea(userId, {
            title: item.title,
            color: color,
            is_pinned: false,
            order_index: 0,
          });
          return area.id;
        }

        case 'resource': {
          const resource = await createResource(userId, {
            title: item.title,
            color: color,
            is_pinned: false,
            order_index: 0,
          });
          return resource.id;
        }

        case 'goal': {
          // Goal → Area 또는 Resource 연결
          const goal = await createGoal(userId, {
            title: item.title,
            color: color,
            status: 'not_started',
            ...(parentType === 'area' && parentDbId ? { area_id: parentDbId } : {}),
            ...(parentType === 'resource' && parentDbId ? { resource_id: parentDbId } : {}),
          });
          return goal.id;
        }

        case 'project': {
          // Project → Goal 또는 Area/Resource 연결
          const project = await createProject(userId, {
            title: item.title,
            color: color,
            status: 'not_started',
            order_index: 0,
            ...(parentType === 'goal' && parentDbId ? { goal_id: parentDbId } : {}),
            ...((parentType === 'area' || parentType === 'resource') && parentDbId
              ? { area_resource_id: parentDbId }
              : {}),
          });
          return project.id;
        }

        case 'todo': {
          const todo = await createTodo({
            title: item.title,
            schedule_type: 'anytime',
            priority: 'medium',
          });
          if (!todo) {
            throw new Error('Todo 생성에 실패했습니다.');
          }
          // Todo → Project 연결 (junction 테이블)
          if (parentType === 'project' && parentDbId && todo.id) {
            await addTodoProject(todo.id, parentDbId, userId);
          }
          return todo.id;
        }

        case 'note': {
          const note = await createNote(userId, {
            title: item.title,
            content: '',
            note_category: 'none',
            is_pinned: false,
          });
          // Note → Project 연결 (junction 테이블)
          if (parentType === 'project' && parentDbId && note.id) {
            await linkProjectNote(parentDbId, note.id);
          }
          return note.id;
        }

        default:
          return '';
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

        // recommendationId → 실제 DB ID 매핑
        const idMap = new Map<string, string>();

        // 부모 항목 찾기 헬퍼 함수
        const findParentItem = (parentId: string) =>
          allItems.find((item) => item.id === parentId);

        // 계층 순서대로 생성 (area/resource → goal → project → todo → note)
        const typeOrder: GraphNodeType[] = ['area', 'resource', 'goal', 'project', 'todo', 'note'];

        for (const type of typeOrder) {
          const typeItems = itemsToCreate.filter((item) => item.type === type);

          for (const item of typeItems) {
            // 부모 ID와 타입 확인
            let parentDbId: string | undefined;
            let parentType: GraphNodeType | undefined;

            if (item.parentId) {
              const parentItem = findParentItem(item.parentId);

              if (parentItem) {
                // 부모가 선택되어 생성되었는지 확인
                parentDbId = idMap.get(item.parentId);
                parentType = parentItem.type;
              }
            }

            // 항목 생성 (관계 포함)
            const createdId = await createItemWithRelation(
              item,
              userId,
              parentDbId,
              parentType
            );

            // ID 매핑 저장
            idMap.set(item.id, createdId);
          }
        }

        console.log('✅ 일괄 생성 완료:', {
          total: itemsToCreate.length,
          relations: Array.from(idMap.entries()),
        });

        // 성공 시 선택 초기화
        clearSelection();

        // 생성된 첫 번째 노드로 포커스 (줌 + 중앙 이동)
        const createdIds = Array.from(idMap.values());
        if (createdIds.length > 0) {
          setTimeout(() => {
            setFocusNodeId(createdIds[0]);
          }, 100);
        }

        // 완료 콜백 호출 (그래프 데이터 refetch)
        if (options?.onComplete) {
          await options.onComplete();
        }
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
      createItemWithRelation,
      clearSelection,
      setFocusNodeId,
      options?.onComplete,
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
    limitCheck,
    hasActiveSubscription,
  };
}

export default useBatchCreate;
