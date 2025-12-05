/**
 * GraphPreviewView - 세트 기반 미니 그래프 데모 뷰
 *
 * 각 세트의 4개 노드를 트리 형태로 시각화
 * 세트 인디케이터로 다른 세트 미리보기 가능
 */

'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  type RecommendationItem,
  type TreeNode,
  buildTree,
} from './RecommendationData';
import {
  APPLE_SPRING,
  FLOATING_NODE,
  CONNECTION_LINE,
} from '@/lib/animations/appleMotion';

interface GraphPreviewViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

// 노드 위치 계산 (퍼센트 기반)
interface NodePosition {
  item: RecommendationItem;
  xPercent: number; // 0-100 퍼센트
  y: number;
  parentXPercent?: number;
  parentY?: number;
}

export function GraphPreviewView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: GraphPreviewViewProps) {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  // Swiper 인스턴스 ref
  const swiperRef = useRef<SwiperType | null>(null);

  // 탭 버튼 refs (자동 스크롤용)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sets = RECOMMENDATION_SETS;
  const currentSet = sets[currentSetIndex];

  // 카드 인덱스 변경 시 해당 탭으로 자동 스크롤 (세 번째 탭부터)
  useEffect(() => {
    const tabButton = tabRefs.current[currentSetIndex];
    const container = scrollContainerRef.current;
    if (tabButton && container) {
      // 첫 번째, 두 번째 탭은 스크롤하지 않음 (왼쪽에 자연스럽게 위치)
      if (currentSetIndex < 2) {
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
  }, [currentSetIndex]);

  const goToSet = (index: number) => {
    if (index < 0 || index >= sets.length) { return; }
    swiperRef.current?.slideTo(index);
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
        if (isSelected(item.id)) { onToggleSelection(item.id); }
      } else {
        if (!isSelected(item.id)) { onToggleSelection(item.id); }
      }
    });
  };

  // 트리 최대 깊이 계산
  function getMaxDepth(nodes: TreeNode[]): number {
    if (nodes.length === 0) return 0;
    return 1 + Math.max(0, ...nodes.map(n => getMaxDepth(n.children)));
  }

  // 리프 노드 수 계산 (가중치 기반 배치용)
  function getLeafCount(node: TreeNode): number {
    if (node.children.length === 0) return 1;
    return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
  }

  const yStart = 50;
  const yGap = 80;

  // 각 세트별 트리 구조와 노드 위치를 메모이제이션
  const setsData = useMemo(() => {
    return sets.map((set) => {
      const tree = buildTree(set.items);
      const maxDepth = getMaxDepth(tree);
      const containerHeight = Math.max(420, yStart + maxDepth * yGap + 80);

      const positions: NodePosition[] = [];
      const paddingPercent = 8;

      function calculatePositions(
        nodes: TreeNode[],
        depth: number,
        xStartPercent: number,
        xEndPercent: number,
        parentXPercent?: number,
        parentY?: number
      ) {
        const y = yStart + depth * yGap;
        const totalWidth = xEndPercent - xStartPercent;

        const weights = nodes.map(node => getLeafCount(node));
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        let currentX = xStartPercent;

        nodes.forEach((node, i) => {
          const nodeWidth = (weights[i] / totalWeight) * totalWidth;
          const xPercent = currentX + nodeWidth / 2;

          positions.push({
            item: node,
            xPercent,
            y,
            parentXPercent,
            parentY,
          });

          if (node.children.length > 0) {
            calculatePositions(
              node.children,
              depth + 1,
              currentX,
              currentX + nodeWidth,
              xPercent,
              y
            );
          }

          currentX += nodeWidth;
        });
      }

      calculatePositions(tree, 0, paddingPercent, 100 - paddingPercent);

      return { set, tree, maxDepth, containerHeight, positions };
    });
  }, [sets]);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* 카테고리 네비게이터 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => goToSet(currentSetIndex - 1)}
          disabled={currentSetIndex === 0}
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
              const isActive = index === currentSetIndex;
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
                  onClick={() => goToSet(index)}
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
          onClick={() => goToSet(currentSetIndex + 1)}
          disabled={currentSetIndex === sets.length - 1}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30 flex-shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 그래프 컨테이너 - Swiper로 양옆 카드 노출 */}
      <div className="relative h-[480px]">
        <Swiper
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          slidesPerView={1.12}
          centeredSlides={true}
          spaceBetween={12}
          onSlideChange={(swiper) => setCurrentSetIndex(swiper.activeIndex)}
          initialSlide={currentSetIndex}
          className="!overflow-visible h-full"
        >
          {setsData.map(({ set, positions, containerHeight }) => (
            <SwiperSlide key={set.id}>
              <div
                className="relative w-full bg-base-100 rounded-2xl border border-base-300 overflow-hidden h-full"
              >
                {/* 배경 그리드 */}
                <div
                  className="absolute inset-0 opacity-5"
                  style={{
                    backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                />

                {/* 연결선 SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {positions.map((node, index) => {
                    if (node.parentXPercent === undefined || !node.parentY) { return null; }

                    return (
                      <motion.line
                        key={`line-${node.item.id}`}
                        x1={`${node.parentXPercent}%`}
                        y1={node.parentY + 20}
                        x2={`${node.xPercent}%`}
                        y2={node.y - 20}
                        stroke={node.item.color}
                        strokeWidth={2}
                        strokeOpacity={isSelected(node.item.id) ? 0.8 : 0.3}
                        variants={CONNECTION_LINE}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                      />
                    );
                  })}
                </svg>

                {/* 노드들 */}
                {positions.map((node, index) => (
                  <GraphNode
                    key={node.item.id}
                    item={node.item}
                    xPercent={node.xPercent}
                    y={node.y}
                    index={index}
                    isSelected={isSelected(node.item.id)}
                    onToggle={() => onToggleSelection(node.item.id)}
                  />
                ))}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* 세트 전체 선택 버튼 */}
      <motion.button
        onClick={() => toggleSetSelection(currentSet)}
        whileTap={{ scale: 0.98 }}
        className={`
          w-full mt-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2
          ${
            isSetFullySelected(currentSet)
              ? 'bg-primary text-primary-content'
              : isSetPartiallySelected(currentSet)
              ? 'bg-primary/20 text-primary border-2 border-primary/30'
              : 'bg-base-200 text-base-content hover:bg-base-300'
          }
        `}
      >
        {isSetFullySelected(currentSet) ? (
          <>
            <Check className="w-5 h-5" />
            선택됨
          </>
        ) : isSetPartiallySelected(currentSet) ? (
          <>
            <Check className="w-5 h-5" />
            일부 선택됨
          </>
        ) : (
          '이 세트 선택하기'
        )}
      </motion.button>

      {/* 페이지 표시 */}
      <div className="text-center mt-3 text-sm text-base-content/50">
        {currentSetIndex + 1} / {sets.length}
      </div>

      {/* 선택된 개수 */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-base-content/60 mt-2"
        >
          {selectedIds.size}개 선택됨
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// 그래프 노드 컴포넌트
// ============================================

interface GraphNodeProps {
  item: RecommendationItem;
  xPercent: number;
  y: number;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}

function GraphNode({ item, xPercent, y, index, isSelected, onToggle }: GraphNodeProps) {
  const Icon = item.icon;
  const size = item.type === 'area' || item.type === 'resource' ? 44 : 40;

  // 제목 전체 표시
  const displayTitle = item.title;

  return (
    <motion.button
      onClick={onToggle}
      className="absolute"
      style={{
        left: `calc(${xPercent}% - ${size / 2}px)`,
        top: y - size / 2,
        width: size,
        height: size,
      }}
      variants={FLOATING_NODE}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap="tap"
      custom={index}
    >
      {/* 선택 링 */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -inset-1 rounded-full"
          style={{
            backgroundColor: `${item.color}20`,
            border: `2px solid ${item.color}`,
          }}
        />
      )}

      {/* 노드 본체 */}
      <div
        className="w-full h-full rounded-full flex items-center justify-center shadow-lg transition-shadow"
        style={{
          backgroundColor: item.color,
          boxShadow: isSelected
            ? `0 0 20px ${item.color}60`
            : `0 4px 12px ${item.color}40`,
        }}
      >
        <Icon className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} />

        {/* 선택 체크 */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={APPLE_SPRING.bouncy}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
          >
            <Check className="w-3 h-3 text-primary-content" />
          </motion.div>
        )}
      </div>

      {/* 라벨 - 노드 바로 아래 중앙에 제목만 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + index * 0.05 }}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap"
      >
        <span className="text-[10px] font-medium text-base-content/70">
          {displayTitle}
        </span>
      </motion.div>
    </motion.button>
  );
}

export default GraphPreviewView;
