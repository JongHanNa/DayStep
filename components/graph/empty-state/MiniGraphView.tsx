/**
 * MiniGraphView - SetCard 내부 미니 그래프 뷰
 *
 * GraphPreviewView의 노드 위치 계산 로직을 SetCard 크기에 맞게 조정
 * 카드 내부에서 리스트↔그래프 전환용
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import {
  type RecommendationSet,
  type RecommendationItem,
  type TreeNode,
  collectDescendantIds,
} from './RecommendationData';
import {
  APPLE_SPRING,
  FLOATING_NODE,
  CONNECTION_LINE,
} from '@/lib/animations/appleMotion';

interface MiniGraphViewProps {
  set: RecommendationSet;
  tree: TreeNode[];
  isItemSelected: (id: string) => boolean;
  onToggleItem: (id: string, descendantIds: string[]) => void;
}

interface NodePosition {
  item: RecommendationItem;
  xPercent: number;
  y: number;
  parentXPercent?: number;
  parentY?: number;
  descendantIds: string[];
}

// SetCard 크기에 맞춘 설정
const Y_START = 30;
const Y_GAP = 55;
const PADDING_PERCENT = 10;

export function MiniGraphView({
  set,
  tree,
  isItemSelected,
  onToggleItem,
}: MiniGraphViewProps) {
  // 노드 위치 계산 (GraphPreviewView 로직 재사용)
  const positions = useMemo(() => {
    const result: NodePosition[] = [];

    function getMaxDepth(nodes: TreeNode[]): number {
      if (nodes.length === 0) return 0;
      return 1 + Math.max(0, ...nodes.map((n) => getMaxDepth(n.children)));
    }

    function getLeafCount(node: TreeNode): number {
      if (node.children.length === 0) return 1;
      return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
    }

    function calculatePositions(
      nodes: TreeNode[],
      depth: number,
      xStartPercent: number,
      xEndPercent: number,
      parentXPercent?: number,
      parentY?: number
    ) {
      const y = Y_START + depth * Y_GAP;
      const totalWidth = xEndPercent - xStartPercent;

      const weights = nodes.map((node) => getLeafCount(node));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      let currentX = xStartPercent;

      nodes.forEach((node, i) => {
        const nodeWidth = (weights[i] / totalWeight) * totalWidth;
        const xPercent = currentX + nodeWidth / 2;

        result.push({
          item: node,
          xPercent,
          y,
          parentXPercent,
          parentY,
          descendantIds: collectDescendantIds(node),
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

    calculatePositions(tree, 0, PADDING_PERCENT, 100 - PADDING_PERCENT);
    return result;
  }, [tree]);

  return (
    <div className="relative w-full h-full">
      {/* 배경 그리드 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      />

      {/* 연결선 SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {positions.map((node, index) => {
          if (node.parentXPercent === undefined || !node.parentY) return null;

          return (
            <motion.line
              key={`line-${node.item.id}`}
              x1={`${node.parentXPercent}%`}
              y1={node.parentY + 16}
              x2={`${node.xPercent}%`}
              y2={node.y - 16}
              stroke={node.item.color}
              strokeWidth={1.5}
              strokeOpacity={isItemSelected(node.item.id) ? 0.8 : 0.3}
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
        <MiniGraphNode
          key={node.item.id}
          item={node.item}
          xPercent={node.xPercent}
          y={node.y}
          index={index}
          isSelected={isItemSelected(node.item.id)}
          onToggle={() => onToggleItem(node.item.id, node.descendantIds)}
        />
      ))}
    </div>
  );
}

// 미니 노드 컴포넌트 (크기 축소)
interface MiniGraphNodeProps {
  item: RecommendationItem;
  xPercent: number;
  y: number;
  index: number;
  isSelected: boolean;
  onToggle: () => void;
}

function MiniGraphNode({
  item,
  xPercent,
  y,
  index,
  isSelected,
  onToggle,
}: MiniGraphNodeProps) {
  const Icon = item.icon;
  // 축소된 노드 크기
  const size = item.type === 'area' || item.type === 'resource' ? 36 : 32;

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
        className="w-full h-full rounded-full flex items-center justify-center shadow-md transition-shadow"
        style={{
          backgroundColor: item.color,
          boxShadow: isSelected
            ? `0 0 16px ${item.color}60`
            : `0 3px 8px ${item.color}40`,
        }}
      >
        <Icon
          className="text-white"
          style={{ width: size * 0.45, height: size * 0.45 }}
        />

        {/* 선택 체크 */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={APPLE_SPRING.bouncy}
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
          >
            <Check className="w-2.5 h-2.5 text-primary-content" />
          </motion.div>
        )}
      </div>

      {/* 라벨 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 + index * 0.03 }}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 whitespace-nowrap"
      >
        <span className="text-[9px] font-medium text-base-content/70">
          {item.title}
        </span>
      </motion.div>
    </motion.button>
  );
}

export default MiniGraphView;
