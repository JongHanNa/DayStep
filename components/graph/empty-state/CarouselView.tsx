/**
 * CarouselView - 세트 기반 캐러셀 뷰
 *
 * 세트 단위로 추천 항목을 한번에 선택/해제
 * TreeView를 사용하여 실제 부모-자식 계층 구조 표시
 * 개별 항목 수정도 가능
 * 카드 내부에서 리스트↔그래프 뷰 토글 지원
 */

'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { Check, ChevronLeft, ChevronRight, GitBranch, AlignLeft, Rows3 } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  buildTree,
} from './RecommendationData';
import { TreeView } from './TreeView';
import { MiniGraphView } from './MiniGraphView';
import { CARD_VIEW_CROSSFADE, APPLE_SPRING } from '@/lib/animations/appleMotion';

// 카드 뷰 모드 타입
export type CardViewMode = 'detail' | 'compact' | 'graph';

interface CarouselViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string, descendantIds: string[]) => void;
  isSelected: (id: string) => boolean;
}

export function CarouselView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: CarouselViewProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Swiper 인스턴스 ref
  const swiperRef = useRef<SwiperType | null>(null);

  // 세트별 뷰 모드 상태 (detail | compact | graph)
  const [cardViewModes, setCardViewModes] = useState<Map<string, CardViewMode>>(
    new Map()
  );

  const setCardViewMode = useCallback((setId: string, mode: CardViewMode) => {
    setCardViewModes((prev) => {
      const next = new Map(prev);
      next.set(setId, mode);
      return next;
    });
  }, []);

  const getCardViewMode = useCallback(
    (setId: string): CardViewMode => {
      return cardViewModes.get(setId) || 'detail';
    },
    [cardViewModes]
  );

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

  // 카드 인덱스 변경 시 해당 탭으로 자동 스크롤 (세 번째 탭부터)
  useEffect(() => {
    const tabButton = tabRefs.current[currentCardIndex];
    const container = scrollContainerRef.current;
    if (tabButton && container) {
      // 첫 번째, 두 번째 탭은 스크롤하지 않음 (왼쪽에 자연스럽게 위치)
      if (currentCardIndex < 2) {
        container.scrollTo({
          left: 0,
          behavior: 'smooth',
        });
        return;
      }

      // 탭의 중앙이 컨테이너 중앙에 오도록 계산
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabButton.getBoundingClientRect();

      // 현재 스크롤 위치 + (탭 중앙 - 컨테이너 중앙)
      const tabCenter = tabRect.left + tabRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollOffset = tabCenter - containerCenter;

      const targetScroll = container.scrollLeft + scrollOffset;

      // 스크롤 범위 제한
      const maxScroll = container.scrollWidth - container.clientWidth;
      const finalScroll = Math.max(0, Math.min(targetScroll, maxScroll));

      container.scrollTo({
        left: finalScroll,
        behavior: 'smooth',
      });
    }
  }, [currentCardIndex]);

  const goToCard = (index: number) => {
    if (index < 0 || index >= sets.length) return;
    swiperRef.current?.slideTo(index);
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
          onToggleSelection(item.id, []);
        }
      } else {
        // 일부 또는 전혀 선택 안됨 → 전체 선택
        if (!isSelected(item.id)) {
          onToggleSelection(item.id, []);
        }
      }
    });
  };

  // 각 세트의 트리 구조를 메모이제이션
  const treesMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildTree>>();
    sets.forEach((set) => {
      map.set(set.id, buildTree(set.items));
    });
    return map;
  }, [sets]);

  return (
    <div className="w-full max-w-lg mx-auto">
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
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden touch-pan-x scrollbar-hide overscroll-x-contain"
        >
          <div className="flex gap-2 px-1 py-1 w-max">
            {sets.map((set, index) => {
              const isActive = index === currentCardIndex;
              // 세트의 첫 번째 책임(area/resource) 아이템의 제목과 아이콘 찾기
              const areaItem = set.items.find(
                (item) => item.type === 'area' || item.type === 'resource'
              );
              const displayTitle = areaItem?.title || set.title;
              const TabIcon = areaItem?.icon;

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
                  {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
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

      {/* 카드 컨테이너 - Swiper로 양옆 카드 노출 */}
      <div className="relative h-[480px]">
        <Swiper
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          slidesPerView={1.12}
          centeredSlides={true}
          spaceBetween={12}
          onSlideChange={(swiper) => setCurrentCardIndex(swiper.activeIndex)}
          initialSlide={currentCardIndex}
          className="!overflow-visible h-full"
        >
          {sets.map((set) => {
            const tree = treesMap.get(set.id) || [];
            return (
              <SwiperSlide key={set.id}>
                <SetCard
                  set={set}
                  tree={tree}
                  isFullySelected={isSetFullySelected(set)}
                  isPartiallySelected={isSetPartiallySelected(set)}
                  onToggleSet={() => toggleSetSelection(set)}
                  onToggleItem={onToggleSelection}
                  isItemSelected={isSelected}
                  expandedIds={expandedTreeIds}
                  onToggleExpand={toggleTreeExpand}
                  viewMode={getCardViewMode(set.id)}
                  onViewModeChange={(mode) => setCardViewMode(set.id, mode)}
                />
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>

      {/* 페이지 표시 */}
      <div className="text-center mt-3 text-sm text-base-content/50">
        {currentCardIndex + 1} / {sets.length}
      </div>
    </div>
  );
}

// ============================================
// 뷰 모드 세그먼트 컨트롤
// ============================================

export interface ViewModeSegmentProps {
  value: CardViewMode;
  onChange: (mode: CardViewMode) => void;
}

export function ViewModeSegment({ value, onChange }: ViewModeSegmentProps) {
  const isListMode = value === 'detail' || value === 'compact';
  const isGraphMode = value === 'graph';

  // 리스트 버튼 클릭: 상세 ↔ 간략 토글
  const handleListClick = () => {
    if (value === 'detail') {
      onChange('compact');
    } else {
      onChange('detail');
    }
  };

  // 그래프 버튼 클릭
  const handleGraphClick = () => {
    onChange('graph');
  };

  return (
    <div className="relative flex items-center bg-base-200/70 backdrop-blur-sm rounded-full p-0.5">
      {/* 슬라이딩 배경 인디케이터 */}
      <motion.div
        className="absolute bg-base-100 rounded-full shadow-sm"
        style={{ width: 26, height: 26 }}
        animate={{
          x: isGraphMode ? 2 + 26 : 2,
        }}
        transition={APPLE_SPRING.snappy}
      />

      {/* 리스트 모드 토글 버튼 (상세 ↔ 간략) */}
      <motion.button
        onClick={handleListClick}
        className="relative z-10 w-[26px] h-[26px] flex items-center justify-center rounded-full"
        whileTap={{ scale: 0.9 }}
        aria-label={value === 'detail' ? '간략히 보기' : '상세히 보기'}
      >
        {value === 'detail' ? (
          <AlignLeft
            className={`w-3.5 h-3.5 transition-colors duration-200 ${
              isListMode ? 'text-base-content' : 'text-base-content/40'
            }`}
          />
        ) : (
          <Rows3
            className={`w-3.5 h-3.5 transition-colors duration-200 ${
              isListMode ? 'text-base-content' : 'text-base-content/40'
            }`}
          />
        )}
      </motion.button>

      {/* 그래프 버튼 */}
      <motion.button
        onClick={handleGraphClick}
        className="relative z-10 w-[26px] h-[26px] flex items-center justify-center rounded-full"
        whileTap={{ scale: 0.9 }}
        aria-label="그래프 보기"
      >
        <GitBranch
          className={`w-3.5 h-3.5 transition-colors duration-200 ${
            isGraphMode ? 'text-base-content' : 'text-base-content/40'
          }`}
        />
      </motion.button>
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
  onToggleItem: (id: string, descendantIds: string[]) => void;
  isItemSelected: (id: string) => boolean;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  viewMode: CardViewMode;
  onViewModeChange: (mode: CardViewMode) => void;
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
  viewMode,
  onViewModeChange,
}: SetCardProps) {
  // 리스트 계열 뷰인지 확인 (detail 또는 compact)
  const isListView = viewMode === 'detail' || viewMode === 'compact';

  return (
    <div className="h-full py-4 px-0 bg-base-100 rounded-2xl shadow-lg border border-base-300 flex flex-col relative">
      {/* 뷰 모드 세그먼트 컨트롤 (우상단) */}
      <div className="absolute top-3 right-3 z-10">
        <ViewModeSegment value={viewMode} onChange={onViewModeChange} />
      </div>

      {/* 뷰 콘텐츠 (애니메이션 전환) */}
      <motion.div layout className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {isListView ? (
            <motion.div
              key="list-view"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              transition={APPLE_SPRING.smooth}
              className="h-full overflow-y-auto pr-1 pt-8"
            >
              <TreeView
                nodes={tree}
                expandedIds={expandedIds}
                selectedIds={new Set()}
                onToggleExpand={onToggleExpand}
                onToggleSelection={onToggleItem}
                isSelected={isItemSelected}
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
              className="h-full"
            >
              <MiniGraphView
                set={set}
                tree={tree}
                isItemSelected={isItemSelected}
                onToggleItem={onToggleItem}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 세트 전체 선택 버튼 */}
      <motion.button
        layout
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
