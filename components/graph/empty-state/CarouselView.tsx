/**
 * CarouselView - 세트 기반 캐러셀 뷰
 *
 * 세트 단위로 추천 항목을 한번에 선택/해제
 * 개별 항목 수정도 가능
 */

'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationItem,
  type RecommendationSet
} from './RecommendationData';
import {
  APPLE_SPRING,
  CARD_ENTRANCE,
  STAGGER,
  swipePower,
  SWIPE_THRESHOLD,
} from '@/lib/animations/appleMotion';
import { NODE_TYPE_LABELS } from '@/lib/graph-utils';

interface CarouselViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

export function CarouselView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: CarouselViewProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const sets = RECOMMENDATION_SETS;
  const currentSet = sets[currentCardIndex];

  const goToCard = (index: number) => {
    if (index < 0 || index >= sets.length) return;
    setDirection(index > currentCardIndex ? 1 : -1);
    setCurrentCardIndex(index);
    setExpandedSetId(null); // 카드 변경 시 접기
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);

    if (power > SWIPE_THRESHOLD) {
      if (info.offset.x < 0 && currentCardIndex < sets.length - 1) {
        goToCard(currentCardIndex + 1);
      } else if (info.offset.x > 0 && currentCardIndex > 0) {
        goToCard(currentCardIndex - 1);
      }
    }
  };

  // 세트 전체 선택 여부 확인
  const isSetFullySelected = (set: RecommendationSet): boolean => {
    return set.items.every((item) => isSelected(item.id));
  };

  // 세트 부분 선택 여부 확인
  const isSetPartiallySelected = (set: RecommendationSet): boolean => {
    const selectedCount = set.items.filter((item) => isSelected(item.id)).length;
    return selectedCount > 0 && selectedCount < set.items.length;
  };

  // 세트 전체 토글
  const toggleSetSelection = (set: RecommendationSet) => {
    const allSelected = isSetFullySelected(set);
    set.items.forEach((item) => {
      if (allSelected) {
        // 모두 선택된 상태 → 전체 해제
        if (isSelected(item.id)) {
          onToggleSelection(item.id);
        }
      } else {
        // 일부 또는 전혀 선택 안됨 → 전체 선택
        if (!isSelected(item.id)) {
          onToggleSelection(item.id);
        }
      }
    });
  };

  const cardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: APPLE_SPRING.smooth,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      transition: APPLE_SPRING.smooth,
    }),
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 카테고리 인디케이터 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => goToCard(currentCardIndex - 1)}
          disabled={currentCardIndex === 0}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-1.5">
          {sets.map((set, index) => (
            <motion.button
              key={set.id}
              onClick={() => goToCard(index)}
              className="h-2 rounded-full transition-colors"
              style={{ backgroundColor: set.color }}
              animate={{
                width: index === currentCardIndex ? 24 : 8,
                opacity: index === currentCardIndex ? 1 : 0.4,
              }}
              transition={APPLE_SPRING.snappy}
            />
          ))}
        </div>

        <button
          onClick={() => goToCard(currentCardIndex + 1)}
          disabled={currentCardIndex === sets.length - 1}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 카드 컨테이너 */}
      <div
        ref={constraintsRef}
        className="relative h-[420px] overflow-hidden"
      >
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentCardIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <SetCard
              set={currentSet}
              isFullySelected={isSetFullySelected(currentSet)}
              isPartiallySelected={isSetPartiallySelected(currentSet)}
              onToggleSet={() => toggleSetSelection(currentSet)}
              onToggleItem={onToggleSelection}
              isItemSelected={isSelected}
              isExpanded={expandedSetId === currentSet.id}
              onToggleExpand={() =>
                setExpandedSetId(expandedSetId === currentSet.id ? null : currentSet.id)
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 페이지 표시 */}
      <div className="text-center mt-3 text-sm text-base-content/50">
        {currentCardIndex + 1} / {sets.length}
      </div>
    </div>
  );
}

// ============================================
// 세트 카드 컴포넌트
// ============================================

interface SetCardProps {
  set: RecommendationSet;
  isFullySelected: boolean;
  isPartiallySelected: boolean;
  onToggleSet: () => void;
  onToggleItem: (id: string) => void;
  isItemSelected: (id: string) => boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function SetCard({
  set,
  isFullySelected,
  isPartiallySelected,
  onToggleSet,
  onToggleItem,
  isItemSelected,
  isExpanded,
  onToggleExpand,
}: SetCardProps) {
  return (
    <div className="h-full p-4 bg-base-100 rounded-2xl shadow-lg border border-base-300 flex flex-col">
      {/* 세트 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${set.color}20` }}
        >
          {set.emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{set.title}</h3>
          <p className="text-sm text-base-content/60">{set.description}</p>
        </div>
      </div>

      {/* 세트 항목 미리보기 */}
      <motion.div
        className="space-y-2 flex-1 overflow-y-auto pr-1"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: STAGGER.fast, delayChildren: 0.1 },
          },
        }}
      >
        {set.items.map((item, index) => (
          <SetItemRow
            key={item.id}
            item={item}
            index={index}
            isSelected={isItemSelected(item.id)}
            onToggle={() => onToggleItem(item.id)}
            showDetails={isExpanded}
          />
        ))}
      </motion.div>

      {/* 상세 보기 토글 */}
      <button
        onClick={onToggleExpand}
        className="flex items-center justify-center gap-1 py-2 text-sm text-base-content/50 hover:text-base-content/70 transition-colors"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            간략히
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            상세 보기
          </>
        )}
      </button>

      {/* 세트 전체 선택 버튼 */}
      <motion.button
        onClick={onToggleSet}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
          ${isFullySelected
            ? 'bg-primary text-primary-content'
            : isPartiallySelected
            ? 'bg-primary/20 text-primary border-2 border-primary/30'
            : 'bg-base-200 text-base-content hover:bg-base-300'
          }
        `}
      >
        {isFullySelected ? (
          <>
            <Check className="w-5 h-5" />
            선택됨
          </>
        ) : isPartiallySelected ? (
          <>
            <Check className="w-5 h-5" />
            일부 선택됨
          </>
        ) : (
          '이 세트 선택하기'
        )}
      </motion.button>
    </div>
  );
}

// ============================================
// 세트 항목 행 컴포넌트
// ============================================

interface SetItemRowProps {
  item: RecommendationItem;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
  showDetails: boolean;
}

function SetItemRow({ item, index, isSelected, onToggle, showDetails }: SetItemRowProps) {
  const Icon = item.icon;
  const typeLabel = NODE_TYPE_LABELS[item.type];

  return (
    <motion.button
      onClick={onToggle}
      variants={CARD_ENTRANCE}
      custom={index}
      whileTap={{ scale: 0.98 }}
      className={`
        w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all
        ${isSelected
          ? 'bg-primary/10 border-2 border-primary/30'
          : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
        }
      `}
    >
      {/* 체크박스 */}
      <motion.div
        animate={isSelected ? 'checked' : 'unchecked'}
        className={`
          w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
          border-2 transition-all
          ${isSelected
            ? 'border-transparent'
            : 'border-base-content/30 bg-base-100'
          }
        `}
        style={isSelected ? { backgroundColor: item.color } : undefined}
      >
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={APPLE_SPRING.bouncy}
          >
            <Check className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </motion.div>

      {/* 아이콘 */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: item.color }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.title}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `${item.color}20`,
              color: item.color,
            }}
          >
            {typeLabel}
          </span>
        </div>
        {showDetails && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-base-content/50 truncate mt-0.5"
          >
            {item.description}
          </motion.p>
        )}
      </div>
    </motion.button>
  );
}

export default CarouselView;
