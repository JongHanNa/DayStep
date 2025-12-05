/**
 * ChipListView - 세트 기반 칩/태그 목록 뷰
 *
 * 각 세트별로 칩들을 나열하여 빠른 다중 선택
 * 세트 전체 선택 + 개별 항목 토글 가능
 */

'use client';

import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  type RecommendationItem,
} from './RecommendationData';
import {
  APPLE_SPRING,
  CHIP_VARIANTS,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';
import { NODE_TYPE_LABELS } from '@/lib/graph-utils';

interface ChipListViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

export function ChipListView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: ChipListViewProps) {
  const sets = RECOMMENDATION_SETS;

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
        if (isSelected(item.id)) onToggleSelection(item.id);
      } else {
        if (!isSelected(item.id)) onToggleSelection(item.id);
      }
    });
  };

  return (
    <motion.div
      className="w-full max-w-sm mx-auto space-y-5"
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
      {sets.map((set, setIndex) => (
        <SetSection
          key={set.id}
          set={set}
          setIndex={setIndex}
          onToggleSelection={onToggleSelection}
          onToggleSet={() => toggleSetSelection(set)}
          isSelected={isSelected}
          isSetFullySelected={isSetFullySelected(set)}
          isSetPartiallySelected={isSetPartiallySelected(set)}
        />
      ))}

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

interface SetSectionProps {
  set: RecommendationSet;
  setIndex: number;
  onToggleSelection: (id: string) => void;
  onToggleSet: () => void;
  isSelected: (id: string) => boolean;
  isSetFullySelected: boolean;
  isSetPartiallySelected: boolean;
}

function SetSection({
  set,
  setIndex,
  onToggleSelection,
  onToggleSet,
  isSelected,
  isSetFullySelected,
  isSetPartiallySelected,
}: SetSectionProps) {
  const selectedInSet = set.items.filter((item) => isSelected(item.id)).length;

  return (
    <motion.div variants={CARD_ENTRANCE} custom={setIndex}>
      {/* 세트 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{set.emoji}</span>
        <h3 className="font-semibold text-sm">{set.title}</h3>
        {selectedInSet > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={APPLE_SPRING.bouncy}
            className="ml-auto px-1.5 py-0.5 bg-primary text-primary-content text-[10px] font-medium rounded-full"
          >
            {selectedInSet}/{set.items.length}
          </motion.div>
        )}
      </div>

      {/* 칩 컨테이너 */}
      <motion.div
        className="flex flex-wrap gap-2"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: STAGGER.fast },
          },
        }}
      >
        {set.items.map((item) => (
          <Chip
            key={item.id}
            item={item}
            isSelected={isSelected(item.id)}
            onToggle={() => onToggleSelection(item.id)}
          />
        ))}

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
      </motion.div>
    </motion.div>
  );
}

// ============================================
// 칩 컴포넌트
// ============================================

interface ChipProps {
  item: RecommendationItem;
  isSelected: boolean;
  onToggle: () => void;
}

function Chip({ item, isSelected, onToggle }: ChipProps) {
  const Icon = item.icon;
  const typeLabel = NODE_TYPE_LABELS[item.type];

  return (
    <motion.button
      onClick={onToggle}
      variants={CHIP_VARIANTS}
      whileTap="tap"
      animate={isSelected ? 'selected' : 'visible'}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors border-2
        ${
          isSelected
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-base-300 bg-base-100 hover:bg-base-200 text-base-content'
        }
      `}
    >
      {/* 아이콘 또는 체크 */}
      <motion.div
        animate={{ rotate: isSelected ? 360 : 0 }}
        transition={APPLE_SPRING.bouncy}
      >
        {isSelected ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
        )}
      </motion.div>

      {/* 텍스트 */}
      <span>{item.title}</span>

      {/* 타입 뱃지 */}
      <span
        className="text-[9px] px-1 py-0.5 rounded"
        style={{
          backgroundColor: `${item.color}20`,
          color: item.color,
        }}
      >
        {typeLabel}
      </span>
    </motion.button>
  );
}

export default ChipListView;
