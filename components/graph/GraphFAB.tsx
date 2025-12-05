/**
 * GraphFAB - 노드 생성용 FAB (Floating Action Button)
 * 메인 버튼 클릭 시 그룹화된 노드 타입 버튼 확장
 * 시작점(책임/자원)을 강조하여 계층 구조 인지 유도
 */

'use client';

import { useState } from 'react';
import { Plus, X, Briefcase, Archive, Target, FolderOpen, CheckSquare, StickyNote, Sparkles } from 'lucide-react';
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

// 그룹화된 노드 구조
interface NodeGroup {
  id: string;
  label?: string;
  types: GraphNodeType[];
  isPrimary?: boolean;
}

const NODE_GROUPS: NodeGroup[] = [
  {
    id: 'container',
    label: '시작 추천',
    types: ['area', 'resource'],
    isPrimary: true,
  },
  {
    id: 'planning',
    types: ['goal', 'project'],
  },
  {
    id: 'execution',
    types: ['todo'],
  },
  {
    id: 'knowledge',
    types: ['note'],
  },
];

export function GraphFAB() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openCreateModal } = useGraphStore();

  const handleCreateNode = (type: GraphNodeType) => {
    openCreateModal(type);
    setIsExpanded(false);
  };

  // 전체 아이템 개수 계산 (애니메이션 딜레이용)
  const totalItems = NODE_GROUPS.reduce((acc, group) => acc + group.types.length, 0);
  let itemIndex = 0;

  return (
    <div className="absolute bottom-20 right-6 z-20">
      {/* 확장된 버튼들 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse gap-1"
          >
            {NODE_GROUPS.map((group, groupIndex) => {
              const groupStartIndex = itemIndex;

              return (
                <div key={group.id} className="flex flex-col-reverse gap-1">
                  {/* 그룹 구분선 (첫 그룹 제외) */}
                  {groupIndex > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1, transition: { delay: groupStartIndex * 0.05 } }}
                      exit={{ opacity: 0, scaleX: 0 }}
                      className="h-px bg-base-content/10 mx-3 my-1 origin-right"
                    />
                  )}

                  {group.types.map((type) => {
                    const Icon = NODE_ICONS[type];
                    const currentIndex = itemIndex++;

                    return (
                      <motion.button
                        key={type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          transition: { delay: currentIndex * 0.05 },
                        }}
                        exit={{
                          opacity: 0,
                          y: 20,
                          transition: { delay: (totalItems - currentIndex) * 0.03 },
                        }}
                        onClick={() => handleCreateNode(type)}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-full shadow-lg hover:shadow-xl transition-all
                          ${group.isPrimary
                            ? 'bg-primary/10 border-2 border-primary/30 hover:border-primary/50'
                            : 'bg-base-100 hover:bg-base-200'
                          }
                        `}
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
                        {/* 시작 추천 뱃지 (첫 그룹 첫 아이템에만) */}
                        {group.isPrimary && type === group.types[0] && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-content text-[10px] font-medium rounded-full">
                            <Sparkles className="w-2.5 h-2.5" />
                            시작
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
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
