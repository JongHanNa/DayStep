/**
 * AccordionView - 아코디언 펼침 뷰
 *
 * 각 계층을 탭하면 추천 항목들이 펼쳐지는 형태
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { RECOMMENDATIONS, type RecommendationItem } from './RecommendationData';
import {
  APPLE_SPRING,
  ACCORDION_CONTENT,
  ACCORDION_CHEVRON,
  CARD_ENTRANCE,
  STAGGER,
} from '@/lib/animations/appleMotion';

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['area']));

  const toggleSection = (type: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const categories = RECOMMENDATIONS;

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
      {categories.map((category, categoryIndex) => {
        const isExpanded = expandedSections.has(category.type);
        const Icon = category.items[0]?.icon;
        const selectedInCategory = category.items.filter((item) => isSelected(item.id)).length;

        return (
          <motion.div
            key={category.type}
            variants={CARD_ENTRANCE}
            custom={categoryIndex}
            className="bg-base-100 rounded-xl border border-base-300 overflow-hidden"
          >
            {/* 섹션 헤더 */}
            <button
              onClick={() => toggleSection(category.type)}
              className={`
                w-full p-4 flex items-center gap-3 text-left transition-colors
                ${isExpanded ? 'bg-base-200' : 'hover:bg-base-200/50'}
              `}
            >
              {/* 아이콘 */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: category.items[0]?.color }}
              >
                {Icon && <Icon className="w-5 h-5 text-white" />}
              </div>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{category.label}</h3>
                  {categoryIndex === 0 && (
                    <div className="px-1.5 py-0.5 bg-primary/10 rounded-full flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-primary" />
                      <span className="text-[10px] text-primary font-medium">시작</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-base-content/60">{category.description}</p>
              </div>

              {/* 선택된 개수 뱃지 */}
              {selectedInCategory > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={APPLE_SPRING.bouncy}
                  className="px-2 py-1 bg-primary text-primary-content text-xs font-medium rounded-full"
                >
                  {selectedInCategory}
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
                    {category.items.map((item, index) => (
                      <AccordionItem
                        key={item.id}
                        item={item}
                        isSelected={isSelected(item.id)}
                        onToggle={() => onToggleSelection(item.id)}
                        index={index}
                      />
                    ))}
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

  return (
    <motion.button
      onClick={onToggle}
      variants={CARD_ENTRANCE}
      custom={index}
      whileTap={{ scale: 0.98 }}
      className={`
        group w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors
        ${isSelected
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
          ${isSelected
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
        <div className="font-medium text-sm truncate">{item.title}</div>
        <div className="text-xs text-base-content/50 truncate">{item.description}</div>
      </div>
    </motion.button>
  );
}

export default AccordionView;
