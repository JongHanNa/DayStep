'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Check, Sparkles } from 'lucide-react';
import { usePomodoro } from '@/hooks/usePomodoro';
import { REFLECTION_TIMER_OPTIONS, type ReflectionTimerDuration } from '@/types/learning-reflection';
import CircularProgress from '@/components/pomodoro/CircularProgress';

interface ReflectionTimerProps {
  onComplete: () => void;
}

export default function ReflectionTimer({ onComplete }: ReflectionTimerProps) {
  const [selectedDuration, setSelectedDuration] = useState<ReflectionTimerDuration>(10);
  const [isCompleted, setIsCompleted] = useState(false);

  const {
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    timerState,
    formatTime,
    isWorkerReady,
  } = usePomodoro();

  const { isRunning, isPaused, remainingTime, progress, status } = timerState;

  // 타이머 완료 처리
  useEffect(() => {
    if (status === 'completed' && !isCompleted) {
      setIsCompleted(true);
    }
  }, [status, isCompleted]);

  // 타이머 시작
  const handleStart = useCallback(() => {
    if (!isWorkerReady) return;
    setIsCompleted(false);
    startTimer(selectedDuration * 60 * 1000, 'POMODORO', `reflection-${Date.now()}`);
  }, [isWorkerReady, selectedDuration, startTimer]);

  // 일시정지/재개
  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  }, [isPaused, pauseTimer, resumeTimer]);

  // 리셋
  const handleReset = useCallback(() => {
    stopTimer();
    setIsCompleted(false);
  }, [stopTimer]);

  // 기록하기 클릭
  const handleWriteEntry = useCallback(() => {
    handleReset();
    onComplete();
  }, [handleReset, onComplete]);

  // 진행률 계산 (0 ~ 1)
  const progressValue = isRunning || isPaused
    ? 1 - progress
    : 0;

  return (
    <div className="flex flex-col items-center py-4">
      {/* 안내 문구 */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-1">성찰 타이머</h3>
        <p className="text-sm text-base-content/60">
          조용히 마음을 돌보는 시간을 가져보세요
        </p>
      </div>

      {/* 시간 선택 (타이머 비활성 상태에서만) */}
      {!isRunning && !isPaused && !isCompleted && (
        <div className="flex gap-2 mb-6">
          {REFLECTION_TIMER_OPTIONS.map((mins) => (
            <button
              key={mins}
              onClick={() => setSelectedDuration(mins)}
              className={`btn btn-sm rounded-full ${
                selectedDuration === mins
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {mins}분
            </button>
          ))}
        </div>
      )}

      {/* 타이머 원형 디스플레이 */}
      <div className="relative w-56 h-56 mb-6">
        {/* 배경 원 */}
        <div className="absolute inset-0 rounded-full bg-base-200"></div>

        {/* 진행률 원 */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="112"
            cy="112"
            r="100"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-primary"
            style={{
              strokeDasharray: 2 * Math.PI * 100,
              strokeDashoffset: 2 * Math.PI * 100 * (1 - progressValue),
              transition: 'stroke-dashoffset 0.5s ease-out',
            }}
          />
        </svg>

        {/* 시간 표시 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-lg font-semibold">완료!</p>
              </motion.div>
            ) : (
              <motion.div
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <span className="text-4xl font-bold tabular-nums">
                  {isRunning || isPaused
                    ? formatTime(remainingTime)
                    : `${selectedDuration}:00`}
                </span>
                {(isRunning || isPaused) && (
                  <p className="text-sm text-base-content/60 mt-1">
                    {isPaused ? '일시정지' : '진행 중'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center gap-4">
        {isCompleted ? (
          <>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-circle"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handleWriteEntry}
              className="btn btn-primary btn-lg rounded-full px-8 gap-2"
            >
              <Check className="w-5 h-5" />
              기록하기
            </button>
          </>
        ) : isRunning || isPaused ? (
          <>
            <button
              onClick={handleReset}
              className="btn btn-ghost btn-circle"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={handlePauseResume}
              className={`btn btn-lg btn-circle ${isPaused ? 'btn-primary' : 'btn-ghost bg-base-200'}`}
            >
              {isPaused ? (
                <Play className="w-6 h-6 ml-0.5" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isWorkerReady}
            className="btn btn-primary btn-lg btn-circle"
          >
            <Play className="w-6 h-6 ml-0.5" />
          </button>
        )}
      </div>

      {/* 완료 시 안내 */}
      {isCompleted && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-base-content/60 mt-4 text-center"
        >
          방금 성찰한 내용을 기록해볼까요?
        </motion.p>
      )}

      {/* 진행 중 안내 */}
      {(isRunning || isPaused) && !isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 p-4 bg-base-200 rounded-xl text-center max-w-xs"
        >
          <p className="text-sm text-base-content/70">
            💭 조용히 눈을 감고
            <br />
            오늘 있었던 일들을 떠올려보세요
          </p>
        </motion.div>
      )}
    </div>
  );
}
