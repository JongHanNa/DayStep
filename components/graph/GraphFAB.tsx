/**
 * GraphFAB - 노드 생성용 FAB (Floating Action Button)
 * 메인 버튼 클릭 시 6개 노드 타입 버튼 확장
 */

'use client';

import { useState } from 'react';
import { Plus, X, Briefcase, Archive, Target, FolderOpen, CheckSquare, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGraphStore } from '@/state/stores/graphStore';
import type { GraphNodeType } from '@/types/graph';
import { NODE_TYPE_COLORS, NODE_TYPE_LABELS } from '@/lib/graph-utils';

// 노드 타입별 아이콘 컴포넌트
const NODE_ICONS: Record<GraphNodeType, React.ElementType> = {
  area: Briefcase,
  resource: Archive,
  goal: Target,
  project: FolderOpen,
  todo: CheckSquare,
  note: StickyNote,
};

export function GraphFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openCreateModal } = useGraphStore();

  const handleCreateNode = (type: GraphNodeType) => {
    openCreateModal(type);
    setIsExpanded(false);
  };

  const nodeTypes: GraphNodeType[] = ['area', 'resource', 'goal', 'project', 'todo', 'note'];

  return (
    <div className="absolute bottom-6 right-6 z-20">
      {/* 확장된 버튼들 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse gap-2"
          >
            {nodeTypes.map((type, index) => {
              const Icon = NODE_ICONS[type];
              return (
                <motion.button
                  key={type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { delay: index * 0.05 },
                  }}
                  exit={{
                    opacity: 0,
                    y: 20,
                    transition: { delay: (nodeTypes.length - index) * 0.03 },
                  }}
                  onClick={() => handleCreateNode(type)}
                  className="flex items-center gap-2 px-3 py-2 bg-base-100 rounded-full shadow-lg hover:shadow-xl transition-shadow"
                  title={`${NODE_TYPE_LABELS[type]} 생성`}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: NODE_TYPE_COLORS[type] }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-sm font-medium pr-1">
                    {NODE_TYPE_LABELS[type]}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 FAB 버튼 */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn-circle btn-lg btn-primary shadow-xl"
        animate={{ rotate: isExpanded ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </motion.button>
    </div>
  );
}

export default GraphFAB;
