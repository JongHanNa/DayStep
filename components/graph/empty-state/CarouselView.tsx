/**
 * CarouselView - 가로 스와이프 캐러셀 뷰
 *
 * 계층별 카드를 가로로 스와이프하며 추천 항목 선택
 */

'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { RECOMMENDATIONS, type RecommendationItem } from './RecommendationData';
import {
  APPLE_SPRING,
  CARD_ENTRANCE,
  SELECTION_FEEDBACK,
  STAGGER,
  swipePower,
  SWIPE_THRESHOLD,
} from '@/lib/animations/appleMotion';

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
  const constraintsRef = useRef<HTMLDivElement>(null);

  const categories = RECOMMENDATIONS;
  const currentCategory = categories[currentCardIndex];

  const goToCard = (index: number) => {
    if (index < 0 || index >= categories.length) return;
    setDirection(index > currentCardIndex ? 1 : -1);
    setCurrentCardIndex(index);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);

    if (power > SWIPE_THRESHOLD) {
      if (info.offset.x < 0 && currentCardIndex < categories.length - 1) {
        goToCard(currentCardIndex + 1);
      } else if (info.offset.x > 0 && currentCardIndex > 0) {
        goToCard(currentCardIndex - 1);
      }
    }
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
          {categories.map((cat, index) => (
            <motion.button
              key={cat.type}
              onClick={() => goToCard(index)}
              className="h-2 rounded-full transition-colors"
              style={{ backgroundColor: cat.items[0]?.color || '#ccc' }}
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
          disabled={currentCardIndex === categories.length - 1}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 카드 컨테이너 */}
      <div
        ref={constraintsRef}
        className="relative h-[400px] overflow-hidden"
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
            <div className="h-full p-4 bg-base-100 rounded-2xl shadow-lg border border-base-300">
              {/* 카드 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const firstItem = currentCategory.items[0];
                  const FirstIcon = firstItem?.icon;
                  return (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: firstItem?.color }}
                    >
                      {FirstIcon && <FirstIcon className="w-5 h-5 text-white" />}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-bold text-lg">{currentCategory.label}</h3>
                  <p className="text-sm text-base-content/60">{currentCategory.description}</p>
                </div>
                {currentCardIndex === 0 && (
                  <div className="ml-auto px-2 py-1 bg-primary/10 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">시작</span>
                  </div>
                )}
              </div>

              {/* 추천 항목 리스트 */}
              <motion.div
                className="space-y-2 overflow-y-auto max-h-[280px] pr-2"
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
                {currentCategory.items.map((item, index) => (
                  <RecommendationCard
                    key={item.id}
                    item={item}
                    isSelected={isSelected(item.id)}
                    onToggle={() => onToggleSelection(item.id)}
                    index={index}
                  />
                ))}
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 선택된 개수 */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4 text-sm text-base-content/60"
        >
          {selectedIds.size}개 선택됨
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// 추천 카드 컴포넌트
// ============================================

interface RecommendationCardProps {
  item: RecommendationItem;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function RecommendationCard({ item, isSelected, onToggle, index }: RecommendationCardProps) {
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onToggle}
      variants={CARD_ENTRANCE}
      custom={index}
      whileTap={{ scale: 0.98 }}
      className={`
        group w-full p-3 rounded-xl flex items-center gap-3 text-left transition-colors
        ${isSelected
          ? 'bg-primary/10 border-2 border-primary/30'
          : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
        }
      `}
    >
      {/* 아이콘 */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: item.color }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.title}</div>
        <div className="text-xs text-base-content/50 truncate">{item.description}</div>
      </div>

      {/* 체크박스 */}
      <motion.div
        animate={isSelected ? 'checked' : 'unchecked'}
        variants={{
          unchecked: { scale: 1 },
          checked: { scale: 1 },
        }}
        whileTap={{ scale: 0.9 }}
        className={`
          w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
          border-2 transition-all
          ${isSelected
            ? 'border-transparent'
            : 'border-base-content/30 bg-base-100 group-hover:border-base-content/50 group-hover:bg-base-200'
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
            <Check className="w-3.5 h-3.5 text-white" />
          </motion.div>
        )}
      </motion.div>
    </motion.button>
  );
}

export default CarouselView;
