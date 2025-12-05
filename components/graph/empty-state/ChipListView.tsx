/**
 * ChipListView - 세트 기반 칩/태그 목록 뷰
 *
 * 각 세트별로 칩들을 나열하여 빠른 다중 선택
 * TreeView를 사용하여 실제 부모-자식 계층 구조 표시
 * 세트 전체 선택 + 개별 항목 토글 가능
 */

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  buildTree,
} from './RecommendationData';
import { TreeView } from './TreeView';
import {
  APPLE_SPRING,
  CHIP_VARIANTS,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';

interface ChipListViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string, descendantIds: string[]) => void;
  isSelected: (id: string) => boolean;
}

export function ChipListView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: ChipListViewProps) {
  // 트리 내부 펼침 상태
  const [expandedTreeIds, setExpandedTreeIds] = useState<Set<string>>(() => {
    // 초기에 루트 노드들만 펼침
    const initialExpanded = new Set<string>();
    RECOMMENDATION_SETS.forEach((set) => {
      const tree = buildTree(set.items);
      tree.forEach((root) => initialExpanded.add(root.id));
    });
    return initialExpanded;
  });

  const sets = RECOMMENDATION_SETS;

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
          onToggleSelection(item.id, []);
        }
      } else {
        if (!isSelected(item.id)) {
          onToggleSelection(item.id, []);
        }
      }
    });
  };

  return (
    <motion.div
      className="w-full max-w-lg mx-auto space-y-5"
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
        const tree = useMemo(() => buildTree(set.items), [set.items]);

        return (
          <SetSection
            key={set.id}
            set={set}
            setIndex={setIndex}
            tree={tree}
            expandedTreeIds={expandedTreeIds}
            onToggleExpand={toggleTreeExpand}
            onToggleSelection={onToggleSelection}
            onToggleSet={() => toggleSetSelection(set)}
            isSelected={isSelected}
            isSetFullySelected={isSetFullySelected(set)}
            isSetPartiallySelected={isSetPartiallySelected(set)}
          />
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

// ============================================
// 세트 섹션 컴포넌트
// ============================================

import type { TreeNode } from './RecommendationData';

interface SetSectionProps {
  set: RecommendationSet;
  setIndex: number;
  tree: TreeNode[];
  expandedTreeIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelection: (id: string, descendantIds: string[]) => void;
  onToggleSet: () => void;
  isSelected: (id: string) => boolean;
  isSetFullySelected: boolean;
  isSetPartiallySelected: boolean;
}

function SetSection({
  set,
  setIndex,
  tree,
  expandedTreeIds,
  onToggleExpand,
  onToggleSelection,
  onToggleSet,
  isSelected,
  isSetFullySelected,
  isSetPartiallySelected,
}: SetSectionProps) {
  return (
    <motion.div variants={CARD_ENTRANCE} custom={setIndex}>
      {/* TreeView로 계층 구조 표시 */}
      <div className="space-y-2">
        <TreeView
          nodes={tree}
          expandedIds={expandedTreeIds}
          selectedIds={new Set()}
          onToggleExpand={onToggleExpand}
          onToggleSelection={onToggleSelection}
          isSelected={isSelected}
          variant="chip"
        />

        {/* 세트 전체 선택 칩 */}
        <motion.button
          onClick={onToggleSet}
          variants={CHIP_VARIANTS}
          whileTap="tap"
          animate={isSetFullySelected ? 'selected' : 'visible'}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
            transition-colors border-2
            ${
              isSetFullySelected
                ? 'border-primary bg-primary text-primary-content'
                : isSetPartiallySelected
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-base-300 bg-base-200 hover:bg-base-300 text-base-content/70'
            }
          `}
        >
          <motion.div
            animate={{ rotate: isSetFullySelected ? 360 : 0 }}
            transition={APPLE_SPRING.bouncy}
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </motion.div>
          <span>전체</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default ChipListView;
