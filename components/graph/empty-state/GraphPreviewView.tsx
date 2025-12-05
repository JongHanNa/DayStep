/**
 * GraphPreviewView - 세트 기반 미니 그래프 데모 뷰
 *
 * 각 세트의 4개 노드를 트리 형태로 시각화
 * 세트 인디케이터로 다른 세트 미리보기 가능
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
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
  swipePower,
  SWIPE_THRESHOLD,
} from '@/lib/animations/appleMotion';

interface GraphPreviewViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

// 노드 위치 계산
interface NodePosition {
  item: RecommendationItem;
  x: number;
  y: number;
  parentX?: number;
  parentY?: number;
}

export function GraphPreviewView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: GraphPreviewViewProps) {
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const sets = RECOMMENDATION_SETS;
  const currentSet = sets[currentSetIndex];

  const goToSet = (index: number) => {
    if (index < 0 || index >= sets.length) { return; }
    setDirection(index > currentSetIndex ? 1 : -1);
    setCurrentSetIndex(index);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const power = swipePower(info.offset.x, info.velocity.x);

    if (power > SWIPE_THRESHOLD) {
      if (info.offset.x < 0 && currentSetIndex < sets.length - 1) {
        goToSet(currentSetIndex + 1);
      } else if (info.offset.x > 0 && currentSetIndex > 0) {
        goToSet(currentSetIndex - 1);
      }
    }
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

  // 트리 구조 생성
  const tree = useMemo(() => buildTree(currentSet.items), [currentSet.items]);

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

  const maxDepth = useMemo(() => getMaxDepth(tree), [tree]);
  const containerWidth = 420;
  const yStart = 50;
  const yGap = 80;
  const containerHeight = Math.max(420, yStart + maxDepth * yGap + 80);

  // 트리 기반 노드 위치 계산 (리프 가중치 방식)
  const nodePositions = useMemo((): NodePosition[] => {
    const positions: NodePosition[] = [];
    const padding = 15; // 좌우 여백
    const minNodeSpacing = 75; // 리프 노드 최소 간격

    // 전체 리프 수로 필요 너비 계산
    const totalLeaves = tree.reduce((sum, node) => sum + getLeafCount(node), 0);
    const neededWidth = totalLeaves * minNodeSpacing;
    const availableWidth = containerWidth - padding * 2;

    // 스케일 팩터: 필요 너비가 더 크면 축소
    const scale = neededWidth > availableWidth ? availableWidth / neededWidth : 1;
    const effectiveWidth = neededWidth * scale;
    const startX = padding + (availableWidth - effectiveWidth) / 2;

    // 재귀적으로 노드 위치 계산 (리프 가중치 기반)
    function calculatePositions(
      nodes: TreeNode[],
      depth: number,
      xStart: number,
      xEnd: number,
      parentX?: number,
      parentY?: number
    ) {
      const y = yStart + depth * yGap;
      const totalWidth = xEnd - xStart;

      // 각 노드의 가중치 계산 (리프 수 기반)
      const weights = nodes.map(node => getLeafCount(node));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let currentX = xStart;

      nodes.forEach((node, i) => {
        const nodeWidth = (weights[i] / totalWeight) * totalWidth;
        const x = currentX + nodeWidth / 2;

        positions.push({
          item: node,
          x,
          y,
          parentX,
          parentY,
        });

        if (node.children.length > 0) {
          calculatePositions(
            node.children,
            depth + 1,
            currentX,
            currentX + nodeWidth,
            x,
            y
          );
        }

        currentX += nodeWidth;
      });
    }

    calculatePositions(tree, 0, startX, startX + effectiveWidth);
    return positions;
  }, [tree]);

  const cardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: APPLE_SPRING.smooth,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      transition: APPLE_SPRING.smooth,
    }),
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 세트 인디케이터 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => goToSet(currentSetIndex - 1)}
          disabled={currentSetIndex === 0}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex gap-1.5">
          {sets.map((set, index) => (
            <motion.button
              key={set.id}
              onClick={() => goToSet(index)}
              className="h-2 rounded-full transition-colors"
              style={{ backgroundColor: set.color }}
              animate={{
                width: index === currentSetIndex ? 24 : 8,
                opacity: index === currentSetIndex ? 1 : 0.4,
              }}
              transition={APPLE_SPRING.snappy}
            />
          ))}
        </div>

        <button
          onClick={() => goToSet(currentSetIndex + 1)}
          disabled={currentSetIndex === sets.length - 1}
          className="btn btn-circle btn-ghost btn-sm disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 그래프 컨테이너 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSet.id}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="relative w-[420px] mx-auto bg-base-100 rounded-2xl border border-base-300 overflow-hidden" style={{ height: containerHeight }}>
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
                {nodePositions.map((node, index) => {
                  if (!node.parentX || !node.parentY) { return null; }

                  return (
                    <motion.line
                      key={`line-${node.item.id}`}
                      x1={node.parentX}
                      y1={node.parentY + 20}
                      x2={node.x}
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
              {nodePositions.map((node, index) => (
                <GraphNode
                  key={node.item.id}
                  item={node.item}
                  x={node.x}
                  y={node.y}
                  index={index}
                  isSelected={isSelected(node.item.id)}
                  onToggle={() => onToggleSelection(node.item.id)}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

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
  x: number;
  y: number;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}

function GraphNode({ item, x, y, index, isSelected, onToggle }: GraphNodeProps) {
  const Icon = item.icon;
  const size = item.type === 'area' || item.type === 'resource' ? 44 : 40;

  // 제목만 표시 (5자 초과 시 자름)
  const maxTitleLength = 5;
  const displayTitle = item.title.length > maxTitleLength
    ? item.title.slice(0, maxTitleLength) + '…'
    : item.title;

  return (
    <motion.button
      onClick={onToggle}
      className="absolute"
      style={{
        left: x - size / 2,
        top: y - size / 2,
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
        className="relative rounded-full flex items-center justify-center shadow-lg transition-shadow"
        style={{
          width: size,
          height: size,
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
        className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap"
      >
        <span className="text-[10px] font-medium text-base-content/70">
          {displayTitle}
        </span>
      </motion.div>
    </motion.button>
  );
}

export default GraphPreviewView;
