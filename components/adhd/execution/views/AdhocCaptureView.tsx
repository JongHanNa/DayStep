'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface AdhocCaptureViewProps {
  title: string;
  onTitleChange: (title: string) => void;
  onCapture: () => void;
  onSkip: () => void;
  isAnimating: boolean;
}

/**
 * 즉흥 완료 후 기록 화면
 *
 * 포모도로 완료 후 방금 한 일을 기록합니다.
 */
export function AdhocCaptureView({
  title,
  onTitleChange,
  onCapture,
  onSkip,
  isAnimating,
}: AdhocCaptureViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <Check className="w-16 h-16 mx-auto text-success mb-4" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        뭐 했어요?
      </h2>

      <p className="text-base-content/60 mb-6">
        방금 한 일을 기록해두면 나중에 도움이 돼요
      </p>

      {/* 입력 필드 */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="방금 한 일을 한 줄로"
        className="input input-bordered w-full rounded-xl mb-4 text-center"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onCapture();
          }
        }}
      />

      <div className="flex flex-col gap-3 mt-6">
        {/* 기록할게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCapture}
          disabled={!title.trim() || isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          기록할게
        </motion.button>

        {/* 그냥 넘어갈게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/50"
        >
          그냥 넘어갈게
        </motion.button>
      </div>
    </motion.div>
  );
}

export default AdhocCaptureView;
