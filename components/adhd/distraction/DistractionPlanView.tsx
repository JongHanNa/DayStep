'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Target, Check } from 'lucide-react';
import {
  EnvironmentCheckItem,
  EnvironmentSetup,
  DEFAULT_ENVIRONMENT_ITEMS,
  CATEGORY_ICONS,
} from '@/types/distraction';

interface DistractionPlanViewProps {
  isLoading: boolean;
  onNext: (setup: EnvironmentSetup) => void;
  onSkip: () => void;
}

/**
 * 집중 환경 준비 화면
 * - "지금 바로" 체크리스트
 * - 핵심 3개 항목만 표시
 */
export default function DistractionPlanView({
  isLoading,
  onNext,
  onSkip,
}: DistractionPlanViewProps) {
  // 체크 항목 초기화
  const [items, setItems] = useState<EnvironmentCheckItem[]>(() =>
    DEFAULT_ENVIRONMENT_ITEMS.map((item, idx) => ({
      ...item,
      id: `default-${idx}`,
      checked: false,
    }))
  );

  // 체크 토글
  const handleToggle = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  // 완료 핸들러
  const handleComplete = () => {
    const setup: EnvironmentSetup = {
      items: items.filter(item => item.checked),
      completedAt: new Date().toISOString(),
    };
    onNext(setup);
  };

  // 최소 1개 이상 체크 필요
  const checkedCount = items.filter(item => item.checked).length;
  const canProceed = checkedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full px-4 py-6"
    >
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Target className="w-7 h-7 text-primary" />
          <h2 className="text-xl font-bold">집중 환경 준비</h2>
        </div>
        <p className="text-sm text-base-content/60">
          시작 전에 방해 요소를 치워요
        </p>
      </div>

      {/* 체크리스트 */}
      <div className="flex-1 space-y-3">
        {items.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleToggle(item.id)}
            whileTap={{ scale: 0.98 }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
              item.checked
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-base-200 border-2 border-transparent hover:bg-base-300'
            }`}
          >
            {/* 체크박스 */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                item.checked
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-300'
              }`}
            >
              {item.checked && <Check className="w-4 h-4" />}
            </div>

            {/* 카테고리 아이콘 */}
            <span className="text-xl">{CATEGORY_ICONS[item.category]}</span>

            {/* 텍스트 */}
            <span
              className={`flex-1 text-left text-sm ${
                item.checked
                  ? 'text-primary font-medium'
                  : 'text-base-content'
              }`}
            >
              {item.text}
            </span>
          </motion.button>
        ))}
      </div>

      {/* 체크 상태 표시 */}
      {checkedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-3"
        >
          <span className="text-sm text-primary font-medium">
            {checkedCount}개 준비 완료
          </span>
        </motion.div>
      )}

      {/* 하단 버튼 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onSkip}
          className="btn btn-ghost flex-1"
        >
          건너뛰기
        </button>
        <button
          onClick={handleComplete}
          disabled={!canProceed || isLoading}
          className="btn btn-primary flex-1"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <>
              준비 완료
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
