/**
 * GraphPreviewView - 미니 그래프 데모 뷰
 *
 * 실제 그래프처럼 노드들이 연결된 시각화로 계층 구조를 보여줌
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { RECOMMENDATIONS, type RecommendationItem } from './RecommendationData';
import {
  APPLE_SPRING,
  FLOATING_NODE,
  CONNECTION_LINE,
  STAGGER,
} from '@/lib/animations/appleMotion';
import { NODE_TYPE_COLORS } from '@/lib/graph-utils';

interface GraphPreviewViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

// 노드 위치 계산 (트리 레이아웃)
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
  // 미리 정의된 샘플 노드들 (각 카테고리에서 대표 항목)
  const sampleNodes = useMemo(() => {
    const positions: NodePosition[] = [];
    const containerWidth = 320;
    const containerHeight = 400;
    const centerX = containerWidth / 2;

    // 계층별 Y 위치
    const levelY = {
      area: 60,
      resource: 60,
      goal: 150,
      project: 240,
      todo: 330,
      note: 330,
    };

    // Area (왼쪽 상단)
    const area = RECOMMENDATIONS.find((c) => c.type === 'area')?.items[0];
    if (area) {
      positions.push({
        item: area,
        x: centerX - 80,
        y: levelY.area,
      });
    }

    // Resource (오른쪽 상단)
    const resource = RECOMMENDATIONS.find((c) => c.type === 'resource')?.items[0];
    if (resource) {
      positions.push({
        item: resource,
        x: centerX + 80,
        y: levelY.resource,
      });
    }

    // Goals (Area 아래)
    const goals = RECOMMENDATIONS.find((c) => c.type === 'goal')?.items.slice(0, 2) || [];
    goals.forEach((goal, i) => {
      positions.push({
        item: goal,
        x: centerX - 60 + i * 120,
        y: levelY.goal,
        parentX: i === 0 ? centerX - 80 : centerX + 80,
        parentY: levelY.area,
      });
    });

    // Projects (Goal 아래)
    const projects = RECOMMENDATIONS.find((c) => c.type === 'project')?.items.slice(0, 2) || [];
    projects.forEach((project, i) => {
      positions.push({
        item: project,
        x: centerX - 60 + i * 120,
        y: levelY.project,
        parentX: centerX - 60 + i * 120,
        parentY: levelY.goal,
      });
    });

    // Todos (Project 아래 왼쪽)
    const todos = RECOMMENDATIONS.find((c) => c.type === 'todo')?.items.slice(0, 1) || [];
    todos.forEach((todo) => {
      positions.push({
        item: todo,
        x: centerX - 80,
        y: levelY.todo,
        parentX: centerX - 60,
        parentY: levelY.project,
      });
    });

    // Notes (독립적 - 오른쪽 하단)
    const notes = RECOMMENDATIONS.find((c) => c.type === 'note')?.items.slice(0, 1) || [];
    notes.forEach((note) => {
      positions.push({
        item: note,
        x: centerX + 80,
        y: levelY.note,
      });
    });

    return positions;
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* 그래프 컨테이너 */}
      <div className="relative h-[400px] bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
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
          {sampleNodes.map((node, index) => {
            if (!node.parentX || !node.parentY) return null;

            return (
              <motion.path
                key={`line-${node.item.id}`}
                d={`M ${node.parentX} ${node.parentY} Q ${(node.parentX + node.x) / 2} ${(node.parentY + node.y) / 2 + 20} ${node.x} ${node.y}`}
                fill="none"
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
        {sampleNodes.map((node, index) => (
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

        {/* 범례 */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-center gap-3 flex-wrap">
          {Object.entries(NODE_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-base-content/50">
                {type === 'area' ? '책임' :
                 type === 'resource' ? '자원' :
                 type === 'goal' ? '목표' :
                 type === 'project' ? '프로젝트' :
                 type === 'todo' ? '할일' : '노트'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 안내 텍스트 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-sm text-base-content/50 mt-4"
      >
        노드를 클릭하여 선택하세요
      </motion.p>

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
  const size = item.type === 'area' || item.type === 'resource' ? 48 : 40;

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

      {/* 라벨 */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 + index * 0.1 }}
        className="absolute left-1/2 -translate-x-1/2 -bottom-6 whitespace-nowrap"
      >
        <span className="text-[10px] font-medium text-base-content/70 bg-base-100/80 px-1.5 py-0.5 rounded">
          {item.title}
        </span>
      </motion.div>
    </motion.button>
  );
}

export default GraphPreviewView;
