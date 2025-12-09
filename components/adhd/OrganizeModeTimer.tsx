'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';

interface OrganizeModeTimerProps {
  /** 타이머 시간 (초) */
  durationSeconds: number;
  /** 타이머 종료 시 콜백 */
  onTimeUp: () => void;
  /** 각성 문장 */
  awakeningSentence?: string | null;
  /** 타이머 닫기 (정리 모드 종료) */
  onClose?: () => void;
}

/**
 * 정리 모드 타이머 컴포넌트
 *
 * 화면 상단에 남은 시간을 부드럽게 표시합니다.
 * 스트레스를 주지 않는 부드러운 UI를 목표로 합니다.
 */
export default function OrganizeModeTimer({
  durationSeconds,
  onTimeUp,
  awakeningSentence,
  onClose,
}: OrganizeModeTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // 타이머 로직
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, onTimeUp]);

  // 시간 포맷팅 (MM:SS)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 진행률 계산 (0-100)
  const progress = ((durationSeconds - remainingSeconds) / durationSeconds) * 100;

  // 남은 시간에 따른 색상 (부드럽게)
  const getProgressColor = () => {
    if (remainingSeconds > durationSeconds * 0.5) return 'bg-primary/70';
    if (remainingSeconds > durationSeconds * 0.2) return 'bg-warning/70';
    return 'bg-error/70';
  };

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* 컴팩트 뷰 (기본) */}
      <motion.div
        onClick={() => setIsExpanded(!isExpanded)}
        className="mx-4 mt-2 bg-base-200/95 backdrop-blur-sm rounded-full shadow-lg cursor-pointer"
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-base-content/60" />
            <span className="text-sm font-medium text-base-content">
              정리 중...
            </span>
          </div>

          <div className="flex items-center gap-3">
            <motion.span
              key={remainingSeconds}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold text-base-content tabular-nums"
            >
              {formatTime(remainingSeconds)}
            </motion.span>

            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-1 bg-base-300 rounded-full overflow-hidden mx-2 mb-2">
          <motion.div
            className={`h-full ${getProgressColor()} transition-colors duration-500`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>

      {/* 확장 뷰 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2 bg-base-200/95 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="p-4">
              {/* 각성 문장 */}
              {awakeningSentence && (
                <p className="text-sm text-base-content/60 italic text-center mb-4">
                  &ldquo;{awakeningSentence}&rdquo;
                </p>
              )}

              {/* 버튼들 */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  className="btn btn-sm btn-ghost rounded-full"
                >
                  {isPaused ? '계속하기' : '잠깐 멈춤'}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemainingSeconds((prev) => prev + 60);
                  }}
                  className="btn btn-sm btn-ghost rounded-full"
                >
                  +1분
                </button>
              </div>

              <p className="text-xs text-base-content/40 text-center mt-3">
                완벽하지 않아도 돼
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
