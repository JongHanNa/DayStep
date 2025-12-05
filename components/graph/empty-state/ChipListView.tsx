/**
 * ChipListView - 칩/태그 목록 뷰
 *
 * 각 계층별로 클릭 가능한 칩들을 나열하여 빠른 다중 선택
 */

'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { RECOMMENDATIONS, type RecommendationItem, type RecommendationCategory } from './RecommendationData';
import {
  APPLE_SPRING,
  CHIP_VARIANTS,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';

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
  const categories = RECOMMENDATIONS;

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
      {categories.map((category, categoryIndex) => (
        <CategorySection
          key={category.type}
          category={category}
          categoryIndex={categoryIndex}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          isSelected={isSelected}
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
// 카테고리 섹션 컴포넌트
// ============================================

interface CategorySectionProps {
  category: RecommendationCategory;
  categoryIndex: number;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

function CategorySection({
  category,
  categoryIndex,
  selectedIds,
  onToggleSelection,
  isSelected,
}: CategorySectionProps) {
  const Icon = category.items[0]?.icon;
  const selectedInCategory = category.items.filter((item) => isSelected(item.id)).length;
  const isStartCategory = categoryIndex === 0;

  return (
    <motion.div
      variants={CARD_ENTRANCE}
      custom={categoryIndex}
    >
      {/* 카테고리 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: category.items[0]?.color }}
        >
          {Icon && <Icon className="w-3.5 h-3.5 text-white" />}
        </div>
        <h3 className="font-semibold text-sm">{category.label}</h3>
        {isStartCategory && (
          <div className="px-1.5 py-0.5 bg-primary/10 rounded-full flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-primary" />
            <span className="text-[10px] text-primary font-medium">시작</span>
          </div>
        )}
        {selectedInCategory > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={APPLE_SPRING.bouncy}
            className="ml-auto px-1.5 py-0.5 bg-primary text-primary-content text-[10px] font-medium rounded-full"
          >
            {selectedInCategory}
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
        {category.items.map((item) => (
          <Chip
            key={item.id}
            item={item}
            isSelected={isSelected(item.id)}
            onToggle={() => onToggleSelection(item.id)}
          />
        ))}
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

  return (
    <motion.button
      onClick={onToggle}
      variants={CHIP_VARIANTS}
      whileTap="tap"
      animate={isSelected ? 'selected' : 'visible'}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors border-2
        ${isSelected
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
    </motion.button>
  );
}

export default ChipListView;
