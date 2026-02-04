'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Minus, Plus } from 'lucide-react';
import type { TimerControlsProps } from '@/types/adhd';

/**
 * 타이머 제어 버튼 컴포넌트
 *
 * 재생/일시정지, 중지, 시간 조정 버튼을 제공합니다.
 */
export function TimerControls({
  onPause,
  onResume,
  onStop,
  onAdjustTime,
  isPaused,
  canAdjust = true,
}: TimerControlsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* -1분 버튼 */}
      {canAdjust && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(-60 * 1000)}
          className="btn btn-circle btn-ghost btn-sm"
          aria-label="1분 줄이기"
        >
          <Minus className="w-4 h-4" />
        </motion.button>
      )}

      {/* 재생/일시정지 버튼 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isPaused ? onResume : onPause}
        className="btn btn-circle btn-primary btn-lg"
        aria-label={isPaused ? '재생' : '일시정지'}
      >
        {isPaused ? (
          <Play className="w-6 h-6 ml-1" />
        ) : (
          <Pause className="w-6 h-6" />
        )}
      </motion.button>

      {/* 중지 버튼 */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStop}
        className="btn btn-circle btn-ghost btn-md"
        aria-label="중지"
      >
        <Square className="w-5 h-5" />
      </motion.button>

      {/* +1분 버튼 */}
      {canAdjust && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(60 * 1000)}
          className="btn btn-circle btn-ghost btn-sm"
          aria-label="1분 늘리기"
        >
          <Plus className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}

export default TimerControls;
