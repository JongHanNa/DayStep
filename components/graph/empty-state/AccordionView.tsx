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
import { Check, ChevronDown } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  buildTree,
  collectAllNodeIds,
} from './RecommendationData';
import { TreeView } from './TreeView';
import {
  APPLE_SPRING,
  ACCORDION_CONTENT,
  ACCORDION_CHEVRON,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';

interface AccordionViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

export function AccordionView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: AccordionViewProps) {
  // 펼쳐진 세트 ID
  const [expandedSets, setExpandedSets] = useState<Set<string>>(
    new Set([RECOMMENDATION_SETS[0]?.id])
  );

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

  const toggleSet = (setId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  };

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
          onToggleSelection(item.id);
        }
      } else {
        if (!isSelected(item.id)) {
          onToggleSelection(item.id);
        }
      }
    });
  };

  const sets = RECOMMENDATION_SETS;

  return (
    <motion.div
      className="w-full max-w-sm mx-auto space-y-3"
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
        const isExpanded = expandedSets.has(set.id);
        const selectedInSet = set.items.filter((item) => isSelected(item.id)).length;
        const tree = useMemo(() => buildTree(set.items), [set.items]);

        return (
          <motion.div
            key={set.id}
            variants={CARD_ENTRANCE}
            custom={setIndex}
            className="bg-base-100 rounded-xl border border-base-300 overflow-hidden"
          >
            {/* 세트 헤더 */}
            <button
              onClick={() => toggleSet(set.id)}
              className={`
                w-full p-4 flex items-center gap-3 text-left transition-colors
                ${isExpanded ? 'bg-base-200' : 'hover:bg-base-200/50'}
              `}
            >
              {/* 이모지 아이콘 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                style={{ backgroundColor: `${set.color}20` }}
              >
                {set.emoji}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{set.title}</h3>
                <p className="text-sm text-base-content/60">{set.description}</p>
              </div>

              {/* 선택된 개수 뱃지 */}
              {selectedInSet > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={APPLE_SPRING.bouncy}
                  className="px-2 py-1 bg-primary text-primary-content text-xs font-medium rounded-full"
                >
                  {selectedInSet}/{set.items.length}
                </motion.div>
              )}

              {/* 화살표 */}
              <motion.div
                animate={isExpanded ? 'expanded' : 'collapsed'}
                variants={ACCORDION_CHEVRON}
              >
                <ChevronDown className="w-5 h-5 text-base-content/40" />
              </motion.div>
            </button>

            {/* 펼쳐지는 콘텐츠 */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={ACCORDION_CONTENT}
                  className="overflow-hidden"
                >
                  <div className="p-3 pt-0 space-y-2">
                    {/* TreeView로 계층 구조 표시 */}
                    <TreeView
                      nodes={tree}
                      expandedIds={expandedTreeIds}
                      selectedIds={selectedIds}
                      onToggleExpand={toggleTreeExpand}
                      onToggleSelection={onToggleSelection}
                      isSelected={isSelected}
                      variant="default"
                    />

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
              )}
            </AnimatePresence>
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
