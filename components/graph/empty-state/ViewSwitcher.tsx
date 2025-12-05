/**
 * ViewSwitcher - 뷰 전환 도트 인디케이터
 *
 * 현재 뷰를 표시하고 클릭하여 뷰 전환
 */

'use client';

import { motion } from 'framer-motion';
import { LayoutGrid, List, GitBranch, Tag } from 'lucide-react';
import { VIEW_TYPES, type EmptyStateViewType } from './RecommendationData';
import { APPLE_SPRING, DOT_INDICATOR } from '@/lib/animations/appleMotion';

interface ViewSwitcherProps {
  currentView: EmptyStateViewType;
  onViewChange: (view: EmptyStateViewType) => void;
}

const VIEW_ICONS: Record<EmptyStateViewType, React.ElementType> = {
  carousel: LayoutGrid,
  accordion: List,
  graph: GitBranch,
  chips: Tag,
};

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* 뷰 타입 라벨 */}
      <motion.div
        key={currentView}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={APPLE_SPRING.snappy}
        className="text-center"
      >
        <span className="text-sm font-medium text-base-content/60">
          {VIEW_TYPES.find((v) => v.type === currentView)?.description}
        </span>
      </motion.div>

      {/* 도트/아이콘 인디케이터 */}
      <div className="flex items-center gap-3">
        {VIEW_TYPES.map(({ type, label }) => {
          const Icon = VIEW_ICONS[type];
          const isActive = currentView === type;

          return (
            <motion.button
              key={type}
              onClick={() => onViewChange(type)}
              className={`
                flex items-center justify-center rounded-full transition-colors
                ${isActive
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content/60 hover:bg-base-300'
                }
              `}
              animate={{
                width: isActive ? 48 : 36,
                height: isActive ? 36 : 36,
              }}
              transition={APPLE_SPRING.bouncy}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={APPLE_SPRING.snappy}
              >
                <Icon className="w-4 h-4" />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* 스와이프 힌트 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-xs text-base-content/40"
      >
        좌우로 스와이프하여 뷰 전환
      </motion.p>
    </div>
  );
}

// ============================================
// 간단한 도트 인디케이터 (대안)
// ============================================

interface DotIndicatorProps {
  total: number;
  current: number;
  onDotClick: (index: number) => void;
}

export function DotIndicator({ total, current, onDotClick }: DotIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <motion.button
          key={index}
          onClick={() => onDotClick(index)}
          className="h-2 rounded-full bg-primary"
          animate={index === current ? 'active' : 'inactive'}
          variants={DOT_INDICATOR}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        />
      ))}
    </div>
  );
}

export default ViewSwitcher;
