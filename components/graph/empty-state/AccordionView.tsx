/**
 * AccordionView - 세트 기반 아코디언 뷰
 *
 * 각 세트를 탭하면 세트 내 항목들이 펼쳐지는 형태
 * TreeView를 사용하여 실제 부모-자식 계층 구조 표시
 * 세트 전체 선택/해제 + 개별 항목 토글 가능
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  buildTree,
} from './RecommendationData';
import { TreeView } from './TreeView';
import { MiniGraphView } from './MiniGraphView';
import { ViewModeSegment, type CardViewMode } from './CarouselView';
import {
  CARD_ENTRANCE,
  CARD_VIEW_CROSSFADE,
  STAGGER,
  APPLE_SPRING,
} from '@/lib/animations/appleMotion';

interface AccordionViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string, descendantIds: string[]) => void;
  isSelected: (id: string) => boolean;
}

export function AccordionView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: AccordionViewProps) {
  // 트리 내부 펼침 상태 (세트별로 관리)
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => {
    // 초기에 루트 노드들만 펼침
    const initialExpanded = new Set<string>();
    RECOMMENDATION_SETS.forEach((set) => {
      const tree = buildTree(set.items);
      tree.forEach((root) => initialExpanded.add(root.id));
    });
    return initialExpanded;
  });

  const toggleTreeExpand = (nodeId: string) => {
    setExpandedTreeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // 세트별 뷰 모드 상태
  const [cardViewModes, setCardViewModes] = useState<Map<string, CardViewMode>>(
    new Map()
  );

  const getViewMode = (setId: string): CardViewMode => {
    return cardViewModes.get(setId) || 'detail';
  };

  const setViewMode = (setId: string, mode: CardViewMode) => {
    setCardViewModes((prev) => {
      const next = new Map(prev);
      next.set(setId, mode);
      return next;
    });
  };

  // 세트 전체 선택 여부
  const isSetFullySelected = (set: RecommendationSet): boolean => {
    return set.items.every((item) => isSelected(item.id));
  };

  // 세트 부분 선택 여부
  const isSetPartiallySelected = (set: RecommendationSet): boolean => {
    const selectedCount = set.items.filter((item) => isSelected(item.id)).length;
    return selectedCount > 0 && selectedCount < set.items.length;
  };

  // 세트 전체 토글
  const toggleSetSelection = (set: RecommendationSet) => {
    const allSelected = isSetFullySelected(set);
    set.items.forEach((item) => {
      if (allSelected) {
        if (isSelected(item.id)) {
          onToggleSelection(item.id, []);
        }
      } else {
        if (!isSelected(item.id)) {
          onToggleSelection(item.id, []);
        }
      }
    });
  };

  const sets = RECOMMENDATION_SETS;

  // 모든 세트의 트리를 미리 계산 (Rules of Hooks: map 콜백 내부에서 useMemo 사용 불가)
  const treesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTree>>();
    sets.forEach((set) => {
      map.set(set.id, buildTree(set.items));
    });
    return map;
  }, [sets]);

  return (
    <motion.div
      className="w-full max-w-lg mx-auto space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: STAGGER.normal, delayChildren: 0.1 },
        },
      }}
    >
      {sets.map((set, setIndex) => {
        const tree = treesMap.get(set.id) || [];
        const viewMode = getViewMode(set.id);
        const isListView = viewMode === 'detail' || viewMode === 'compact';

        return (
          <motion.div
            key={set.id}
            variants={CARD_ENTRANCE}
            custom={setIndex}
            className="bg-base-100 rounded-xl border border-base-300 overflow-hidden relative"
          >
            {/* 뷰 모드 세그먼트 컨트롤 (우상단) */}
            <div className="absolute top-3 right-3 z-10">
              <ViewModeSegment
                value={viewMode}
                onChange={(mode) => setViewMode(set.id, mode)}
              />
            </div>

            <div className="p-3 space-y-2">
              {/* 뷰 콘텐츠 */}
              <motion.div layout className="overflow-hidden pt-8">
                <AnimatePresence mode="wait">
                  {isListView ? (
                    <motion.div
                      key="list-view"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                      transition={APPLE_SPRING.smooth}
                      className="overflow-y-auto"
                    >
                      <TreeView
                        nodes={tree}
                        expandedIds={expandedTreeIds}
                        selectedIds={selectedIds}
                        onToggleExpand={toggleTreeExpand}
                        onToggleSelection={onToggleSelection}
                        isSelected={isSelected}
                        variant={viewMode === 'detail' ? 'compact' : 'chip'}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="graph-view"
                      variants={CARD_VIEW_CROSSFADE}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="h-[320px]"
                    >
                      <MiniGraphView
                        set={set}
                        tree={tree}
                        isItemSelected={isSelected}
                        onToggleItem={onToggleSelection}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* 세트 전체 선택 버튼 */}
              <motion.button
                onClick={() => toggleSetSelection(set)}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 mt-2
                  ${
                    isSetFullySelected(set)
                      ? 'bg-primary text-primary-content'
                      : isSetPartiallySelected(set)
                        ? 'bg-primary/20 text-primary border-2 border-primary/30'
                        : 'bg-base-300 text-base-content hover:bg-base-200'
                  }
                `}
              >
                {isSetFullySelected(set) ? (
                  <>
                    <Check className="w-4 h-4" />
                    선택됨
                  </>
                ) : isSetPartiallySelected(set) ? (
                  <>
                    <Check className="w-4 h-4" />
                    일부 선택됨
                  </>
                ) : (
                  '이 세트 선택하기'
                )}
              </motion.button>
            </div>
          </motion.div>
        );
      })}

      {/* 선택된 개수 */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-base-content/60 pt-2"
        >
          {selectedIds.size}개 선택됨
        </motion.div>
      )}
    </motion.div>
  );
}

export default AccordionView;
