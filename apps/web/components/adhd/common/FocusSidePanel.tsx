'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Minus, Plus, Pause, Play, X, CheckCircle2, SkipForward, Zap, Timer,
} from 'lucide-react';
import { CircularProgressSlider } from './CircularProgressSlider';
import type { UseFocusSessionReturn } from '../hooks/useFocusSession';
import type { Todo } from '@/entities/todo/Todo';

interface FocusSidePanelProps {
  session: UseFocusSessionReturn;
  todo: Todo;
  onClose: () => void;
}

/**
 * 데스크톱 우측 사이드패널 포커스 타이머
 *
 * PriorityMatrixPanel 위치를 대체하여 포커스 활성 시 표시.
 */
export function FocusSidePanel({ session, todo, onClose }: FocusSidePanelProps) {
  const {
    timerState,
    totalDuration,
    timerDisplayMode,
    toggleDisplayMode,
    pause,
    resume,
    stop,
    adjustTime,
    handleDragComplete,
    completeCurrent,
    skipToNext,
    nextTodos,
    sessionStats,
    shouldShowEnvToast,
    dismissEnvToast,
  } = session;

  const [isDragging, setIsDragging] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const isTimerCompleted = timerState.status === 'completed' || showCompleted;

  const formatTime = useCallback((ms: number) => {
    const mins = Math.floor(Math.abs(ms) / 60000);
    const secs = Math.floor((Math.abs(ms) % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatDuration = useCallback((ms: number) => {
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}분`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}h${remainMins}m` : `${hours}h`;
  }, []);

  const startTime = timerState.duration > 0
    ? new Date(Date.now() - timerState.elapsed)
    : null;
  const endTime = totalDuration
    ? new Date((startTime?.getTime() ?? Date.now()) + totalDuration)
    : null;

  const handleDragEnd = useCallback((finalProgress: number) => {
    if (finalProgress >= 0.95) {
      setShowCompleted(true);
      handleDragComplete();
    }
  }, [handleDragComplete]);

  const handleStop = useCallback(async () => {
    await stop();
    onClose();
  }, [stop, onClose]);

  const handleFinishAndClose = useCallback(async () => {
    await completeCurrent();
    onClose();
  }, [completeCurrent, onClose]);

  const handleSkipToNext = useCallback(() => {
    setShowCompleted(false);
    skipToNext();
  }, [skipToNext]);

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-violet-50 dark:bg-violet-900/20">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">포커스 타이머</span>
        </div>
        <button onClick={handleStop} className="btn btn-ghost btn-xs btn-circle">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 환경 토스트 */}
      <AnimatePresence>
        {shouldShowEnvToast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-700"
          >
            <div className="flex items-center justify-between text-xs text-violet-600 dark:text-violet-400">
              <span>집중 환경을 준비해주세요!</span>
              <button onClick={dismissEnvToast} className="btn btn-ghost btn-xs btn-circle">
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {isTimerCompleted ? (
          /* 완료 화면 */
          <div className="flex flex-col items-center py-4 gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
            >
              <CheckCircle2 className="w-12 h-12 text-success" />
            </motion.div>
            <h3 className="text-base font-bold">잘했어요!</h3>
            <p className="text-xs text-base-content/60 text-center line-clamp-2">
              &ldquo;{todo.title}&rdquo; 완료
            </p>

            {nextTodos.length > 0 && (
              <button
                onClick={handleSkipToNext}
                className="w-full flex items-center gap-2 p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors mt-2"
              >
                <SkipForward className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span className="text-sm truncate">{nextTodos[0].title}</span>
              </button>
            )}

            <button onClick={handleFinishAndClose} className="btn btn-ghost btn-sm mt-2">
              나가기
            </button>
          </div>
        ) : (
          /* 타이머 */
          <>
            {/* 할일 정보 */}
            <div className="text-center mb-3">
              <p className="text-xs text-violet-500 font-medium mb-0.5">지금 집중하기</p>
              <h3 className="text-base font-bold line-clamp-2 mb-0.5">{todo.title}</h3>
              {startTime && endTime && (
                <p className="text-xs text-base-content/50">
                  {format(startTime, 'HH:mm')} → {format(endTime, 'HH:mm')}
                </p>
              )}
            </div>

            {/* 타이머 */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <CircularProgressSlider
                  size={180}
                  progress={timerState.progress}
                  onDragProgress={() => {}}
                  onDragEnd={handleDragEnd}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                  onClick={toggleDisplayMode}
                >
                  <Zap className="w-4 h-4 text-violet-500 mb-0.5" />
                  {timerDisplayMode === 'elapsed' && (
                    <span className="text-xl font-mono font-bold">{formatTime(timerState.elapsed)}</span>
                  )}
                  {timerDisplayMode === 'remaining' && (
                    <span className="text-xl font-mono font-bold">{formatTime(timerState.remainingTime)}</span>
                  )}
                  {timerDisplayMode === 'both' && (
                    <>
                      <span className="text-xl font-mono font-bold">{formatTime(timerState.elapsed)}</span>
                      <span className="text-[10px] text-base-content/40">남은 {formatTime(timerState.remainingTime)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 컨트롤 */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => adjustTime(-60000)}
                className="btn btn-ghost btn-xs btn-circle"
                title="-1분"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={timerState.isPaused ? resume : pause}
                className="btn btn-primary btn-circle w-10 h-10"
              >
                {timerState.isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={() => adjustTime(60000)}
                className="btn btn-ghost btn-xs btn-circle"
                title="+1분"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleDragComplete}
                className="btn btn-success btn-sm flex-1 rounded-full gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                완료
              </button>
              {nextTodos.length > 0 && (
                <button
                  onClick={handleSkipToNext}
                  className="btn btn-ghost btn-sm flex-1 rounded-full gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  다음
                </button>
              )}
            </div>

            {/* 다음 일정 */}
            {nextTodos.length > 0 && (
              <div className="border-t border-base-300 pt-3 mb-3">
                <p className="text-xs text-base-content/50 mb-1.5">다음 일정</p>
                <div className="space-y-1">
                  {nextTodos.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-base-content/70">
                      <span className="w-1 h-1 bg-base-content/30 rounded-full flex-shrink-0" />
                      <span className="truncate flex-1">{t.title}</span>
                      {t.startTime && (
                        <span className="text-base-content/40">
                          {format(new Date(t.startTime), 'HH:mm')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 세션 통계 바 */}
      {sessionStats.sessions > 0 && (
        <div className="px-4 py-2.5 border-t border-base-300 bg-base-200/50">
          <div className="flex items-center justify-center gap-3 text-xs text-base-content/50">
            <span>{sessionStats.completed}완료</span>
            <span>·</span>
            <span>{formatDuration(sessionStats.totalFocusMs)}</span>
            <span>·</span>
            <span>{sessionStats.sessions}세션</span>
          </div>
        </div>
      )}
    </div>
  );
}
