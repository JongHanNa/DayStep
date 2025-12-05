/**
 * TreeView - 재귀적 트리 구조 컴포넌트
 *
 * parentId 기반으로 구축된 트리 구조를 렌더링
 * - 같은 부모의 자식들은 같은 레벨
 * - 접기/펼치기 기능
 * - 고급스러운 Framer Motion 애니메이션
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Clock, Calendar } from 'lucide-react';
import {
  type TreeNode,
  getItemDates,
  getRelativeDateText,
  collectDescendantIds,
} from './RecommendationData';
import {
  APPLE_SPRING,
  TREE_COLLAPSE,
  TREE_CHEVRON,
  TREE_NODE_VARIANTS,
  STAGGER,
} from '@/lib/animations/appleMotion';
import { NODE_TYPE_LABELS } from '@/lib/graph-utils';

// ============================================
// 타입 정의
// ============================================

interface TreeViewProps {
  nodes: TreeNode[];
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
  variant?: 'default' | 'compact' | 'chip';
}

interface TreeNodeItemProps {
  node: TreeNode;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
  variant: 'default' | 'compact' | 'chip';
}

// ============================================
// TreeView 컴포넌트
// ============================================

// 들여쓰기 최대 깊이 (참고 스크린샷 기준 2레벨 정도)
const MAX_INDENT = 24;

export function TreeView({
  nodes,
  expandedIds,
  selectedIds,
  onToggleExpand,
  onToggleSelection,
  isSelected,
  variant = 'default',
}: TreeViewProps) {
  return (
    <motion.div
      className=""
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: STAGGER.fast, delayChildren: 0.05 },
        },
      }}
    >
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          selectedIds={selectedIds}
          onToggleExpand={onToggleExpand}
          onToggleSelection={onToggleSelection}
          isSelected={isSelected}
          variant={variant}
        />
      ))}
    </motion.div>
  );
}

// ============================================
// TreeNodeItem 컴포넌트 (재귀)
// ============================================

function TreeNodeItem({
  node,
  expandedIds,
  selectedIds,
  onToggleExpand,
  onToggleSelection,
  isSelected,
  variant,
}: TreeNodeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const nodeSelected = isSelected(node.id);
  const Icon = node.icon;
  const typeLabel = NODE_TYPE_LABELS[node.type];
  const dates = getItemDates(node);
  const isTodo = node.type === 'todo';
  const isGoalOrProject = node.type === 'goal' || node.type === 'project';

  // 자손 노드 수 계산
  const descendantCount = hasChildren ? collectDescendantIds(node).length : 0;

  // 시간/기간 텍스트
  const timeText =
    isTodo && dates.formattedTime
      ? `${node.dateConfig?.startOffset && node.dateConfig.startOffset > 0 ? getRelativeDateText(node.dateConfig.startOffset) : '오늘'} ${dates.formattedTime}`
      : null;

  const periodText =
    isGoalOrProject && node.dateConfig?.endOffset
      ? `~${getRelativeDateText(node.dateConfig.endOffset)}`
      : null;

  // 노드 클릭 핸들러 (선택 토글)
  const handleNodeClick = () => {
    onToggleSelection(node.id);
  };

  // 펼치기/접기 핸들러
  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  };

  // 들여쓰기: 최대 깊이 제한 적용
  const indent = node.depth > 0 ? MAX_INDENT : 0;

  return (
    <motion.div
      className="relative"
      style={{ marginLeft: indent }}
      variants={TREE_NODE_VARIANTS}
    >
      {/* 노드 콘텐츠 - 깔끔한 블록 스타일 */}
      <motion.div
        onClick={handleNodeClick}
        whileTap={{ scale: 0.98 }}
        className={`
          group flex items-center gap-2 cursor-pointer transition-colors
          ${variant === 'chip' ? 'py-1.5 px-2' : 'py-2.5 px-2'}
          ${nodeSelected ? 'bg-primary/10' : 'hover:bg-base-200/50'}
        `}
      >
        {/* 펼치기/접기 버튼 */}
        {hasChildren && (
          <motion.button
            onClick={handleExpandClick}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-base-300"
            animate={isExpanded ? 'expanded' : 'collapsed'}
            variants={TREE_CHEVRON}
          >
            <ChevronRight className="w-3.5 h-3.5 text-base-content/60" />
          </motion.button>
        )}

        {/* 자식 없는 경우 여백 */}
        {!hasChildren && <div className="w-5 flex-shrink-0" />}

        {/* 체크박스 */}
        <motion.div
          whileTap={{ scale: 0.9 }}
          className={`
            w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
            border-2 transition-all
            ${
              nodeSelected
                ? 'border-transparent'
                : 'border-base-content/30 bg-base-100 group-hover:border-base-content/50'
            }
          `}
          style={nodeSelected ? { backgroundColor: node.color } : undefined}
        >
          {nodeSelected && (
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
          className={`rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'chip' ? 'w-6 h-6' : 'w-8 h-8'}`}
          style={{ backgroundColor: `${node.color}20` }}
        >
          <Icon
            className={variant === 'chip' ? 'w-3 h-3' : 'w-4 h-4'}
            style={{ color: node.color }}
          />
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-medium truncate ${variant === 'chip' ? 'text-xs' : 'text-sm'}`}
            >
              {node.title}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full flex-shrink-0 ${variant === 'chip' ? 'text-[8px]' : 'text-[10px]'}`}
              style={{
                backgroundColor: `${node.color}20`,
                color: node.color,
              }}
            >
              {typeLabel}
            </span>

            {/* 접혀 있을 때 자손 수 표시 */}
            {hasChildren && !isExpanded && (
              <span className="text-[10px] text-base-content/50">
                ({descendantCount}개)
              </span>
            )}
          </div>

          {/* 설명 + 날짜/시간 (compact/default만) */}
          {variant !== 'chip' && (
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="text-xs text-base-content/50 truncate flex-1 min-w-0">
                {node.description}
              </div>

              {/* Todo 시간 표시 */}
              {timeText && (
                <span className="text-[10px] text-base-content/60 flex items-center gap-1 flex-shrink-0 bg-base-300 px-1.5 py-0.5 rounded">
                  <Clock className="w-3 h-3" />
                  {timeText}
                </span>
              )}

              {/* Goal/Project 기간 표시 */}
              {periodText && (
                <span className="text-[10px] text-base-content/60 flex items-center gap-1 flex-shrink-0 bg-base-300 px-1.5 py-0.5 rounded">
                  <Calendar className="w-3 h-3" />
                  {periodText}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* 자식 노드들 */}
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && (
          <motion.div
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={TREE_COLLAPSE}
            className="overflow-hidden"
          >
            <div className="">
              {node.children.map((child) => (
                <TreeNodeItem
                  key={child.id}
                  node={child}
                  expandedIds={expandedIds}
                  selectedIds={selectedIds}
                  onToggleExpand={onToggleExpand}
                  onToggleSelection={onToggleSelection}
                  isSelected={isSelected}
                  variant={variant}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TreeView;
