/**
 * CarouselView - 세트 기반 캐러셀 뷰
 *
 * 세트 단위로 추천 항목을 한번에 선택/해제
 * TreeView를 사용하여 실제 부모-자식 계층 구조 표시
 * 개별 항목 수정도 가능
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  buildTree,
} from './RecommendationData';
import { TreeView } from './TreeView';
import {
  APPLE_SPRING,
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
  const currentSet = sets[currentCardIndex];

  // 탭 버튼 refs (자동 스크롤용)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 카드 인덱스 변경 시 해당 탭으로 자동 스크롤 (중앙 정렬)
  useEffect(() => {
    const tabButton = tabRefs.current[currentCardIndex];
    const container = scrollContainerRef.current;
    if (tabButton && container) {
      // 컨테이너와 탭 정보
      const containerWidth = container.offsetWidth;
      const containerScrollWidth = container.scrollWidth;
      const tabLeft = tabButton.offsetLeft;
      const tabWidth = tabButton.offsetWidth;

      // 탭을 정확히 중앙에 위치시키기 위한 스크롤 위치
      const idealScrollLeft = tabLeft - (containerWidth / 2) + (tabWidth / 2);

      // 스크롤 범위 제한 (0 ~ maxScroll)
      const maxScroll = containerScrollWidth - containerWidth;
      const targetScroll = Math.max(0, Math.min(idealScrollLeft, maxScroll));

      // 부드러운 스크롤 애니메이션
      container.scrollTo({
        left: targetScroll,
        behavior: 'smooth',
      });
    }
  }, [currentCardIndex]);

  const goToCard = (index: number) => {
    if (index < 0 || index >= sets.length) return;
    setDirection(index > currentCardIndex ? 1 : -1);
    setCurrentCardIndex(index);
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

  // 현재 세트의 트리 구조
  const currentTree = useMemo(() => buildTree(currentSet.items), [currentSet.items]);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 카테고리 네비게이터 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => goToCard(currentCardIndex - 1)}
          disabled={currentCardIndex === 0}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* 가로 스크롤 탭 */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden touch-pan-x scrollbar-hide"
        >
          <div className="flex gap-2 px-1 py-1 w-max">
            {sets.map((set, index) => {
              const isActive = index === currentCardIndex;
              // 세트의 첫 번째 책임(area/resource) 아이템의 제목 찾기
              const areaItem = set.items.find(
                (item) => item.type === 'area' || item.type === 'resource'
              );
              const displayTitle = areaItem?.title || set.title;

              return (
                <motion.button
                  key={set.id}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  onClick={() => goToCard(index)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap
                    text-xs font-medium flex-shrink-0
                    ${isActive
                      ? 'text-white shadow-md'
                      : 'bg-base-200 text-base-content/60 hover:bg-base-300'
                    }
                  `}
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : 0.92,
                    backgroundColor: isActive ? set.color : 'oklch(var(--b2))',
                    opacity: isActive ? 1 : 0.7,
                  }}
                  whileHover={{
                    scale: isActive ? 1 : 0.96,
                    opacity: 1,
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                    mass: 0.5,
                  }}
                >
                  <span>{set.emoji}</span>
                  <span>{displayTitle}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => goToCard(currentCardIndex + 1)}
          disabled={currentCardIndex === sets.length - 1}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30 flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 카드 컨테이너 */}
      <div className="relative h-[480px] overflow-hidden">
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
              tree={currentTree}
              isFullySelected={isSetFullySelected(currentSet)}
              isPartiallySelected={isSetPartiallySelected(currentSet)}
              onToggleSet={() => toggleSetSelection(currentSet)}
              onToggleItem={onToggleSelection}
              isItemSelected={isSelected}
              expandedIds={expandedTreeIds}
              onToggleExpand={toggleTreeExpand}
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

import type { TreeNode } from './RecommendationData';

interface SetCardProps {
  set: RecommendationSet;
  tree: TreeNode[];
  isFullySelected: boolean;
  isPartiallySelected: boolean;
  onToggleSet: () => void;
  onToggleItem: (id: string) => void;
  isItemSelected: (id: string) => boolean;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

function SetCard({
  set,
  tree,
  isFullySelected,
  isPartiallySelected,
  onToggleSet,
  onToggleItem,
  isItemSelected,
  expandedIds,
  onToggleExpand,
}: SetCardProps) {
  return (
    <div className="h-full p-4 bg-base-100 rounded-2xl shadow-lg border border-base-300 flex flex-col">
      {/* TreeView로 계층 구조 표시 */}
      <div className="flex-1 overflow-y-auto pr-1">
        <TreeView
          nodes={tree}
          expandedIds={expandedIds}
          selectedIds={new Set()}
          onToggleExpand={onToggleExpand}
          onToggleSelection={onToggleItem}
          isSelected={isItemSelected}
          variant="compact"
        />
      </div>

      {/* 세트 전체 선택 버튼 */}
      <motion.button
        onClick={onToggleSet}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-4
          ${
            isFullySelected
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

export default CarouselView;
