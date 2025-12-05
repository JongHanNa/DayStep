/**
 * SelectedItemsBar - 선택된 항목 하단 바
 *
 * 선택된 항목 수를 표시하고 일괄 생성 버튼 제공
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, X, Sparkles } from 'lucide-react';
import { BOTTOM_BAR, APPLE_SPRING } from '@/lib/animations/appleMotion';
import { getAllRecommendations, type RecommendationItem } from './RecommendationData';

interface SelectedItemsBarProps {
  selectedCount: number;
  isLoading: boolean;
  error: string | null;
  onClear: () => void;
  onCreate: (items: RecommendationItem[]) => Promise<void>;
}

export function SelectedItemsBar({
  selectedCount,
  isLoading,
  error,
  onClear,
  onCreate,
}: SelectedItemsBarProps) {
  const allItems = getAllRecommendations();

  const handleCreate = async () => {
    await onCreate(allItems);
  };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          variants={BOTTOM_BAR}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        >
          {/* 배경 블러 */}
          <div className="absolute inset-0 bg-base-100/90 backdrop-blur-lg border-t border-base-300" />

          {/* 콘텐츠 */}
          <div className="relative px-4 py-3 max-w-md mx-auto">
            {/* 에러 메시지 */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-error text-sm text-center mb-2"
              >
                {error}
              </motion.div>
            )}

            <div className="flex items-center gap-3">
              {/* 선택 개수 */}
              <motion.div
                key={selectedCount}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={APPLE_SPRING.bouncy}
                className="flex items-center gap-2 bg-base-200 rounded-full px-3 py-1.5"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.4 }}
                  className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-primary-content" />
                </motion.div>
                <span className="text-sm font-medium">
                  {selectedCount}개 선택
                </span>
              </motion.div>

              {/* 초기화 버튼 */}
              <button
                onClick={onClear}
                disabled={isLoading}
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 일괄 생성 버튼 */}
              <motion.button
                onClick={handleCreate}
                disabled={isLoading || selectedCount === 0}
                whileTap={{ scale: 0.98 }}
                className="flex-1 btn btn-primary rounded-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    시작하기
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SelectedItemsBar;
