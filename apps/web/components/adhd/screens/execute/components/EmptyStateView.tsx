'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ListTodo, Zap } from 'lucide-react';

interface EmptyStateViewProps {
  onStartAdhoc: () => void;
}

/**
 * 빈 상태 화면 (할일 없음)
 *
 * 할일이 없을 때 즉흥 포모도로를 시작할 수 있습니다.
 */
export function EmptyStateView({ onStartAdhoc }: EmptyStateViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <ListTodo className="w-16 h-16 mx-auto text-base-content/30 mb-6" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        할일이 없네요
      </h2>

      <p className="text-base-content/60 mb-8">
        지금 바로 집중할 것을 시작해볼까요?
      </p>

      <div className="flex flex-col gap-3">
        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Zap className="w-5 h-5" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>
      </div>
    </motion.div>
  );
}

export default EmptyStateView;
