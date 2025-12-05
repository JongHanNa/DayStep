/**
 * AccordionView - 세트 기반 아코디언 뷰
 *
 * 각 세트를 탭하면 세트 내 항목들이 펼쳐지는 형태
 * 세트 전체 선택/해제 + 개별 항목 토글 가능
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Clock, Calendar, ChevronRight } from 'lucide-react';
import {
  RECOMMENDATION_SETS,
  type RecommendationSet,
  type RecommendationItem,
  getItemDates,
  getRelativeDateText,
} from './RecommendationData';
import {
  APPLE_SPRING,
  ACCORDION_CONTENT,
  ACCORDION_CHEVRON,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';
import { NODE_TYPE_LABELS } from '@/lib/graph-utils';

interface AccordionViewProps {
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
}

export function AccordionView({
  selectedIds,
  onToggleSelection,
  isSelected,
}: AccordionViewProps) {
  const [expandedSets, setExpandedSets] = useState<Set<string>>(
    new Set([RECOMMENDATION_SETS[0]?.id])
  );

  const toggleSet = (setId: string) => {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
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

  const sets = RECOMMENDATION_SETS;

  return (
    <motion.div
      className="w-full max-w-sm mx-auto space-y-3"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: STAGGER.normal, delayChildren: 0.1 },
        },
      }}
    >
      {sets.map((set, setIndex) => {
        const isExpanded = expandedSets.has(set.id);
        const selectedInSet = set.items.filter((item) => isSelected(item.id)).length;

        return (
          <motion.div
            key={set.id}
            variants={CARD_ENTRANCE}
            custom={setIndex}
            className="bg-base-100 rounded-xl border border-base-300 overflow-hidden"
          >
            {/* 세트 헤더 */}
            <button
              onClick={() => toggleSet(set.id)}
              className={`
                w-full p-4 flex items-center gap-3 text-left transition-colors
                ${isExpanded ? 'bg-base-200' : 'hover:bg-base-200/50'}
              `}
            >
              {/* 이모지 아이콘 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                style={{ backgroundColor: `${set.color}20` }}
              >
                {set.emoji}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold">{set.title}</h3>
                <p className="text-sm text-base-content/60">{set.description}</p>
              </div>

              {/* 선택된 개수 뱃지 */}
              {selectedInSet > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={APPLE_SPRING.bouncy}
                  className="px-2 py-1 bg-primary text-primary-content text-xs font-medium rounded-full"
                >
                  {selectedInSet}/{set.items.length}
                </motion.div>
              )}

              {/* 화살표 */}
              <motion.div
                animate={isExpanded ? 'expanded' : 'collapsed'}
                variants={ACCORDION_CHEVRON}
              >
                <ChevronDown className="w-5 h-5 text-base-content/40" />
              </motion.div>
            </button>

            {/* 펼쳐지는 콘텐츠 */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  variants={ACCORDION_CONTENT}
                  className="overflow-hidden"
                >
                  <motion.div
                    className="p-3 pt-0 space-y-2"
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
                    {set.items.map((item, index) => (
                      <AccordionItem
                        key={item.id}
                        item={item}
                        isSelected={isSelected(item.id)}
                        onToggle={() => onToggleSelection(item.id)}
                        index={index}
                      />
                    ))}

                    {/* 세트 전체 선택 버튼 */}
                    <motion.button
                      onClick={() => toggleSetSelection(set)}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 mt-2
                        ${
                          isSetFullySelected(set)
                            ? 'bg-primary text-primary-content'
                            : isSetPartiallySelected(set)
                            ? 'bg-primary/20 text-primary border-2 border-primary/30'
                            : 'bg-base-300 text-base-content hover:bg-base-200'
                        }
                      `}
                    >
                      {isSetFullySelected(set) ? (
                        <>
                          <Check className="w-4 h-4" />
                          선택됨
                        </>
                      ) : isSetPartiallySelected(set) ? (
                        <>
                          <Check className="w-4 h-4" />
                          일부 선택됨
                        </>
                      ) : (
                        '이 세트 선택하기'
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* 선택된 개수 */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-base-content/60 pt-2"
        >
          {selectedIds.size}개 선택됨
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================
// 아코디언 아이템 컴포넌트
// ============================================

interface AccordionItemProps {
  item: RecommendationItem;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

function AccordionItem({ item, isSelected, onToggle, index }: AccordionItemProps) {
  const Icon = item.icon;
  const typeLabel = NODE_TYPE_LABELS[item.type];
  const dates = getItemDates(item);
  const hasChildCount = item.childCount !== undefined && item.childCount > 0;
  const isTodo = item.type === 'todo';
  const isGoalOrProject = item.type === 'goal' || item.type === 'project';

  return (
    <motion.button
      onClick={onToggle}
      variants={CARD_ENTRANCE}
      custom={index}
      whileTap={{ scale: 0.98 }}
      className={`
        group w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors
        ${
          isSelected
            ? 'bg-primary/10 border border-primary/30'
            : 'bg-base-200 border border-transparent hover:bg-base-300'
        }
      `}
    >
      {/* 체크박스 */}
      <motion.div
        animate={isSelected ? 'checked' : 'unchecked'}
        variants={{
          unchecked: { scale: 1 },
          checked: { scale: 1 },
        }}
        whileTap={{ scale: 0.9 }}
        className={`
          w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0
          border-2 transition-all
          ${
            isSelected
              ? 'border-transparent'
              : 'border-base-content/30 bg-base-100 group-hover:border-base-content/50'
          }
        `}
        style={isSelected ? { backgroundColor: item.color } : undefined}
      >
        {isSelected && (
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
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color: item.color }} />
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.title}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor: `${item.color}20`,
              color: item.color,
            }}
          >
            {typeLabel}
          </span>
          {/* 하위 항목 수 */}
          {hasChildCount && (
            <span className="text-[10px] text-base-content/40 flex items-center gap-0.5">
              <ChevronRight className="w-3 h-3" />
              {item.childCount}개
            </span>
          )}
        </div>

        {/* 설명 + 날짜/시간 */}
        <div className="flex items-center gap-2 mt-0.5">
          <div className="text-xs text-base-content/50 truncate flex-1">{item.description}</div>

          {/* Todo 시간 표시 */}
          {isTodo && dates.formattedTime && (
            <span className="text-[10px] text-base-content/60 flex items-center gap-1 flex-shrink-0 bg-base-300 px-1.5 py-0.5 rounded">
              <Clock className="w-3 h-3" />
              {item.dateConfig?.startOffset !== undefined && item.dateConfig.startOffset > 0
                ? getRelativeDateText(item.dateConfig.startOffset)
                : '오늘'}{' '}
              {dates.formattedTime}
            </span>
          )}

          {/* Goal/Project 기간 표시 */}
          {isGoalOrProject && item.dateConfig?.endOffset !== undefined && (
            <span className="text-[10px] text-base-content/60 flex items-center gap-1 flex-shrink-0 bg-base-300 px-1.5 py-0.5 rounded">
              <Calendar className="w-3 h-3" />
              ~{getRelativeDateText(item.dateConfig.endOffset)}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default AccordionView;
