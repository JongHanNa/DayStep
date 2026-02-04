'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Timer, Trash2, Zap } from 'lucide-react';
import type { Todo } from '@/entities/todo/Todo';
import { getScheduleTypeLabel } from '@/types/adhd';

interface RecommendationViewProps {
  todo: Todo;
  awakeningSentence: string | null;
  isAnimating: boolean;
  onComplete: () => void;
  onStartPomodoroWithTodo: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onStartAdhoc: () => void;
}

/**
 * 할일 추천 화면
 *
 * ADHD 사용자에게 "지금 할 수 있는 가장 작은 것 하나"를 추천합니다.
 */
export function RecommendationView({
  todo,
  awakeningSentence,
  isAnimating,
  onComplete,
  onStartPomodoroWithTodo,
  onSkip,
  onDelete,
  onStartAdhoc,
}: RecommendationViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      {/* 안내 문구 */}
      <p className="text-base-content/60 mb-4">
        지금 할 수 있는 가장 작은 것 하나:
      </p>

      {/* 할일 제목 */}
      <motion.div
        key={todo.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-base-200 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold text-base-content leading-relaxed">
            {todo.title}
          </h2>
        </div>

        {/* 속성 정보: 일정 유형 */}
        {todo.scheduleType && (
          <div className="text-sm text-base-content/60 mt-3 flex items-center justify-center gap-2">
            <span>{getScheduleTypeLabel(todo.scheduleType)}</span>
          </div>
        )}
      </motion.div>

      {/* 버튼들 */}
      <div className="flex flex-col gap-3">
        {/* 했어 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          disabled={isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Check className="w-6 h-6" />
          했어
        </motion.button>

        {/* 타이머 켜고 할래 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartPomodoroWithTodo}
          disabled={isAnimating}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <Timer className="w-5 h-5" />
          타이머 켜고 할래
        </motion.button>

        {/* 다른 거 추천해줘 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/60"
        >
          다른 거 추천해줘
        </motion.button>

        {/* 필요 없는 할일 삭제 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDelete}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-error/60"
        >
          <Trash2 className="w-4 h-4" />
          필요 없는 할일이야
        </motion.button>

        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-primary/70 mt-4"
        >
          <Zap className="w-4 h-4" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>
      </div>

      {/* 각성 문장 */}
      {awakeningSentence && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-base-content/40 italic"
        >
          &ldquo;{awakeningSentence}&rdquo;
        </motion.p>
      )}
    </motion.div>
  );
}

export default RecommendationView;
