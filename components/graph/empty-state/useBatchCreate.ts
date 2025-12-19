/**
 * 일괄 생성 훅 (Todos 전용)
 *
 * 선택된 Todo 추천 항목들을 한 번에 생성
 */

import { useState, useCallback, useMemo } from 'react';
import { addDays, format, setHours, setMinutes } from 'date-fns';
import { useAuth } from '@/app/context/AuthContext';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/noteStore';
import type { GraphNodeType } from '@/types/graph';
import type { RecommendationItem } from './RecommendationData';
import { getAllSetItems } from './RecommendationData';
import { NODE_TYPE_COLORS } from '@/lib/graph-utils';
import { useGraphFocus } from '@/state/stores/graphStore';
import { useUsageStats } from '@/hooks/useUsageStats';
import { type UsageEntityType } from '@/lib/featureFlags';

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
  /** 노드 + 하위 자손 전체 토글 */
  toggleSelectionWithDescendants: (nodeId: string, descendantIds: string[]) => void;
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

  // Todo 스토어 액션
  const { createTodo } = useTodoStore();
  // Note 스토어 액션
  const { createNote } = useNoteStore();
  const { setFocusNodeId } = useGraphFocus();

  // 사용량 통계
  const { canCreate, hasActiveSubscription } = useUsageStats();

  // GraphNodeType을 UsageEntityType으로 매핑 (Todo + Note)
  const nodeTypeToEntityType = useCallback((nodeType: GraphNodeType): UsageEntityType | null => {
    if (nodeType === 'todo') return 'todo';
    if (nodeType === 'note') return 'note';
    return null;
  }, []);

  // 선택된 항목들의 제한 체크 (Todo + Note)
  const limitCheck = useMemo((): LimitCheckResult => {
    // Pro 사용자는 무제한
    if (hasActiveSubscription) {
      return { canCreate: true, exceededEntities: [] };
    }

    // 선택된 항목 가져오기
    const allItems = getAllSetItems();
    const selectedTodos = allItems.filter((item) => selectedIds.has(item.id) && item.type === 'todo');
    const selectedNotes = allItems.filter((item) => selectedIds.has(item.id) && item.type === 'note');

    if (selectedTodos.length === 0 && selectedNotes.length === 0) {
      return { canCreate: true, exceededEntities: [] };
    }

    const exceededEntities: ExceededEntity[] = [];

    // Todo 개수 체크
    if (selectedTodos.length > 0) {
      const willAdd = selectedTodos.length;
      const result = canCreate('todo');
      const total = result.current + willAdd;

      if (total > result.limit) {
        exceededEntities.push({
          entity: 'todo',
          displayName: result.displayName,
          current: result.current,
          limit: result.limit,
          willAdd,
          total,
        });
      }
    }

    // Note 개수 체크
    if (selectedNotes.length > 0) {
      const willAdd = selectedNotes.length;
      const result = canCreate('note');
      const total = result.current + willAdd;

      if (total > result.limit) {
        exceededEntities.push({
          entity: 'note',
          displayName: result.displayName,
          current: result.current,
          limit: result.limit,
          willAdd,
          total,
        });
      }
    }

    return {
      canCreate: exceededEntities.length === 0,
      exceededEntities,
    };
  }, [selectedIds, hasActiveSubscription, canCreate]);

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

  // 노드 + 하위 자손 전체 토글
  const toggleSelectionWithDescendants = useCallback(
    (nodeId: string, descendantIds: string[]) => {
      const allIds = [nodeId, ...descendantIds];

      setSelectedIds((prev) => {
        const isCurrentlySelected = prev.has(nodeId);
        const next = new Set(prev);
        allIds.forEach((id) => {
          if (isCurrentlySelected) {
            next.delete(id);
          } else {
            next.add(id);
          }
        });
        return next;
      });
    },
    []
  );

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
   * Todo 항목 생성
   * @param item - 추천 항목 (Todo만)
   * @param userId - 사용자 ID
   * @returns 생성된 Todo ID
   */
  const createTodoItem = useCallback(
    async (item: RecommendationItem, userId: string): Promise<string> => {
      if (item.type !== 'todo') {
        throw new Error('Todo 타입만 생성할 수 있습니다.');
      }

      // 날짜/시간 설정 처리
      const dateConfig = item.dateConfig;
      const recurrence = item.recurrenceConfig;

      // start_time 계산
      let startTime: Date | null = null;
      let endTime: Date | null = null;
      if (dateConfig?.startOffset !== undefined) {
        startTime = addDays(new Date(), dateConfig.startOffset);
        if (dateConfig.time) {
          const [hours, minutes] = dateConfig.time.split(':').map(Number);
          startTime = setHours(setMinutes(startTime, minutes), hours);
          // end_time은 start_time + 1시간 (기본 duration)
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }
      }

      // schedule_type 결정 (시간 설정이 있으면 'timed', 없으면 'anytime')
      const scheduleType = dateConfig?.time ? 'timed' : 'anytime';

      // 반복 종료일 계산
      const recurrenceEndDate = recurrence?.endOffset
        ? addDays(new Date(), recurrence.endOffset)
        : null;

      const todo = await createTodo({
        title: item.title,
        schedule_type: scheduleType,
        start_time: startTime?.toISOString(),
        end_time: endTime?.toISOString(),
        priority: 'medium',
        // 반복 패턴 필드
        recurrence_pattern: recurrence?.pattern ?? 'none',
        recurrence_interval: recurrence?.interval ?? 1,
        recurrence_days_of_week: recurrence?.daysOfWeek,
        recurrence_day_of_month: recurrence?.dayOfMonth,
        recurrence_end_date: recurrenceEndDate
          ? format(recurrenceEndDate, 'yyyy-MM-dd')
          : undefined,
      });

      if (!todo) {
        throw new Error('Todo 생성에 실패했습니다.');
      }

      return todo.id;
    },
    [createTodo]
  );

  /**
   * Note 항목 생성
   * @param item - 추천 항목 (Note만)
   * @param userId - 사용자 ID
   * @returns 생성된 Note ID
   */
  const createNoteItem = useCallback(
    async (item: RecommendationItem, userId: string): Promise<string> => {
      if (item.type !== 'note') {
        throw new Error('Note 타입만 생성할 수 있습니다.');
      }

      const note = await createNote({
        title: item.title,
        content: '',
        note_category: 'none',
        is_pinned: false,
        user_id: userId,
      });

      return note.id;
    },
    [createNote]
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
        // 선택된 Todo/Note 항목 필터링
        const todosToCreate = allItems.filter(
          (item) => selectedIds.has(item.id) && item.type === 'todo'
        );
        const notesToCreate = allItems.filter(
          (item) => selectedIds.has(item.id) && item.type === 'note'
        );

        const createdIds: string[] = [];

        // Todo 생성
        for (const item of todosToCreate) {
          const createdId = await createTodoItem(item, userId);
          createdIds.push(createdId);
        }

        // Note 생성
        for (const item of notesToCreate) {
          const createdId = await createNoteItem(item, userId);
          createdIds.push(createdId);
        }

        console.log('✅ 일괄 생성 완료:', {
          todos: todosToCreate.length,
          notes: notesToCreate.length,
          total: createdIds.length,
          ids: createdIds,
        });

        // 성공 시 선택 초기화
        clearSelection();

        // 생성된 첫 번째 노드로 포커스 (줌 + 중앙 이동)
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
      createTodoItem,
      createNoteItem,
      clearSelection,
      setFocusNodeId,
      options?.onComplete,
    ]
  );

  return {
    selectedIds,
    toggleSelection,
    toggleSelectionWithDescendants,
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
