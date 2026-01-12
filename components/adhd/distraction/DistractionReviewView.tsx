'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import {
  DistractionPlan,
  DistractionReviewResult,
  REVIEW_RESULT_LABELS,
} from '@/types/distraction';

interface DistractionReviewViewProps {
  plan: DistractionPlan | null;
  onSubmit: (result: DistractionReviewResult) => void;
  onSkip: () => void;
}

/**
 * 방해 요소 회고 화면
 * 타이머 완료 후 방해요소 대응 결과를 평가
 */
export default function DistractionReviewView({
  plan,
  onSubmit,
  onSkip,
}: DistractionReviewViewProps) {
  const [selectedResult, setSelectedResult] = useState<DistractionReviewResult | null>(null);

  // 계획이 없으면 건너뛰기
  if (!plan) {
    return null;
  }

  const handleSubmit = () => {
    if (selectedResult) {
      onSubmit(selectedResult);
    }
  };

  const reviewOptions: DistractionReviewResult[] = ['success', 'partial', 'failed'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full px-4 py-6"
    >
      {/* 축하 헤더 */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
        >
          <Sparkles className="w-8 h-8 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">수고했어요!</h2>
        <p className="text-sm text-base-content/60">
          방해 요소를 잘 피했나요?
        </p>
      </div>

      {/* 계획 리마인더 */}
      <div className="bg-base-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-base-content/70 mb-2">나의 계획:</p>
        <p className="text-sm">
          <span className="font-medium text-primary">만약</span>{' '}
          <span>{plan.distraction}</span>
          <span className="font-medium text-secondary ml-1">그러면</span>{' '}
          <span>{plan.response}</span>
        </p>
      </div>

      {/* 회고 선택 */}
      <div className="flex-1">
        <div className="grid grid-cols-3 gap-3">
          {reviewOptions.map((result) => {
            const { emoji, label } = REVIEW_RESULT_LABELS[result];
            const isSelected = selectedResult === result;

            return (
              <motion.button
                key={result}
                onClick={() => setSelectedResult(result)}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? result === 'success'
                      ? 'border-success bg-success/10'
                      : result === 'partial'
                      ? 'border-warning bg-warning/10'
                      : 'border-error bg-error/10'
                    : 'border-base-300 bg-base-100 hover:bg-base-200'
                }`}
              >
                <span className="text-3xl mb-2">{emoji}</span>
                <span className={`text-sm font-medium ${
                  isSelected
                    ? result === 'success'
                      ? 'text-success'
                      : result === 'partial'
                      ? 'text-warning'
                      : 'text-error'
                    : 'text-base-content/70'
                }`}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* 선택된 결과에 따른 메시지 */}
        {selectedResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            {selectedResult === 'success' && (
              <p className="text-sm text-success">
                대단해요! 계획대로 집중했군요!
              </p>
            )}
            {selectedResult === 'partial' && (
              <p className="text-sm text-warning">
                괜찮아요. 조금씩 나아지고 있어요!
              </p>
            )}
            {selectedResult === 'failed' && (
              <p className="text-sm text-error">
                다음엔 더 잘할 수 있어요. 포기하지 마세요!
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onSkip}
          className="btn btn-ghost flex-1"
        >
          건너뛰기
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedResult}
          className="btn btn-primary flex-1"
        >
          다음
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
