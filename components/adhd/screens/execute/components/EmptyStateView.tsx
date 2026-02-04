'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ListTodo, Zap } from 'lucide-react';

interface EmptyStateViewProps {
  onGoToOrganize: () => void;
  onStartAdhoc: () => void;
}

/**
 * 빈 상태 화면 (할일 없음)
 *
 * 할일이 없을 때 정리 모드로 이동하거나
 * 즉흥 포모도로를 시작할 수 있습니다.
 */
export function EmptyStateView({ onGoToOrganize, onStartAdhoc }: EmptyStateViewProps) {
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
        정리하기로 할일을 먼저 만들어볼까요?
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

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-base-300" />
          <span className="text-xs text-base-content/40">또는</span>
          <div className="flex-1 h-px bg-base-300" />
        </div>

        {/* 정리하러 가기 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoToOrganize}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <ListTodo className="w-5 h-5" />
          정리하러 가기
        </motion.button>
      </div>
    </motion.div>
  );
}

export default EmptyStateView;
