'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Minus, Plus, Pause, Play, X, CheckCircle2, SkipForward, Zap,
} from 'lucide-react';
import { CircularProgressSlider } from './CircularProgressSlider';
import type { UseFocusSessionReturn } from '../hooks/useFocusSession';
import type { Todo } from '@/entities/todo/Todo';

interface FocusOverlayProps {
  session: UseFocusSessionReturn;
  todo: Todo;
  onClose: () => void;
}

/**
 * 모바일 바텀시트 포커스 오버레이
 *
 * 할일 카드에서 ▶ 탭 시 아래에서 슬라이드 업.
 * 타이머, 컨트롤, 다음 할일 미리보기를 표시합니다.
 */
export function FocusOverlay({ session, todo, onClose }: FocusOverlayProps) {
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

  // 타이머 완료 시 축하 화면
  const isTimerCompleted = timerState.status === 'completed' || showCompleted;

  // 시간 포맷 (mm:ss)
  const formatTime = useCallback((ms: number) => {
    const mins = Math.floor(Math.abs(ms) / 60000);
    const secs = Math.floor((Math.abs(ms) % 60000) / 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 시작/종료 시간 표시
  const startTime = timerState.duration > 0
    ? new Date(Date.now() - timerState.elapsed)
    : null;
  const endTime = totalDuration
    ? new Date((startTime?.getTime() ?? Date.now()) + totalDuration)
    : null;
  const durationMins = totalDuration ? Math.round(totalDuration / 60000) : 0;

  // 드래그 완료 핸들러
  const handleDragEnd = useCallback((finalProgress: number) => {
    if (finalProgress >= 0.95) {
      setShowCompleted(true);
      handleDragComplete();
    }
  }, [handleDragComplete]);

  // 중단
  const handleStop = useCallback(async () => {
    await stop();
    onClose();
  }, [stop, onClose]);

  // 완료 후 나가기
  const handleFinishAndClose = useCallback(async () => {
    await completeCurrent();
    onClose();
  }, [completeCurrent, onClose]);

  // 다음 할일로
  const handleSkipToNext = useCallback(() => {
    setShowCompleted(false);
    skipToNext();
  }, [skipToNext]);

  return (
    <AnimatePresence>
      {/* 배경 오버레이 */}
      <motion.div
        key="focus-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
      />

      {/* 바텀시트 */}
      <motion.div
        key="focus-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 bg-base-100 rounded-t-3xl z-[91] max-h-[90vh] overflow-y-auto safe-area-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-base-300 rounded-full" />
        </div>

        {/* 환경 준비 토스트 */}
        <AnimatePresence>
          {shouldShowEnvToast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-4 mb-3 p-3 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
                  <Zap className="w-4 h-4" />
                  <span>집중 환경을 준비해주세요!</span>
                </div>
                <button onClick={dismissEnvToast} className="btn btn-ghost btn-xs btn-circle">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-6 pb-6">
          {isTimerCompleted ? (
            /* 완료 축하 화면 */
            <div className="flex flex-col items-center py-8 gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
              >
                <CheckCircle2 className="w-16 h-16 text-success" />
              </motion.div>
              <h2 className="text-xl font-bold">잘했어요!</h2>
              <p className="text-base-content/60 text-sm text-center">
                &ldquo;{todo.title}&rdquo;을 완료했어요
              </p>

              {/* 세션 통계 */}
              <div className="flex gap-4 text-sm text-base-content/60 mt-2">
                <span>{sessionStats.completed}완료</span>
                <span>·</span>
                <span>{formatTime(sessionStats.totalFocusMs)}</span>
                <span>·</span>
                <span>{sessionStats.sessions}세션</span>
              </div>

              {/* 다음 할일 */}
              {nextTodos.length > 0 && (
                <div className="w-full mt-4">
                  <p className="text-xs text-base-content/50 mb-2">다음 할일 시작할까요?</p>
                  <button
                    onClick={handleSkipToNext}
                    className="w-full flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  >
                    <SkipForward className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-medium truncate">{nextTodos[0].title}</span>
                  </button>
                </div>
              )}

              {/* 종료 버튼 */}
              <button
                onClick={handleFinishAndClose}
                className="btn btn-ghost btn-sm mt-4"
              >
                나가기
              </button>
            </div>
          ) : (
            /* 타이머 화면 */
            <>
              {/* 할일 정보 */}
              <div className="text-center mb-4">
                <p className="text-xs text-violet-500 font-medium mb-1">지금 집중하기</p>
                <h2 className="text-xl font-bold mb-1 line-clamp-2">{todo.title}</h2>
                {startTime && endTime && (
                  <p className="text-sm text-base-content/50">
                    {format(startTime, 'HH:mm')} → {format(endTime, 'HH:mm')} ({durationMins}분)
                  </p>
                )}
              </div>

              {/* 타이머 원형 프로그레스 */}
              <div className="flex justify-center my-4">
                <div className="relative">
                  <CircularProgressSlider
                    size={220}
                    progress={timerState.progress}
                    onDragProgress={() => {}}
                    onDragEnd={handleDragEnd}
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                  />
                  {/* 센터 시간 표시 */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    onClick={toggleDisplayMode}
                    style={{ pointerEvents: 'auto' }}
                  >
                    <Zap className="w-5 h-5 text-violet-500 mb-1" />
                    {timerDisplayMode === 'elapsed' && (
                      <span className="text-2xl font-mono font-bold">{formatTime(timerState.elapsed)}</span>
                    )}
                    {timerDisplayMode === 'remaining' && (
                      <span className="text-2xl font-mono font-bold">{formatTime(timerState.remainingTime)}</span>
                    )}
                    {timerDisplayMode === 'both' && (
                      <>
                        <span className="text-2xl font-mono font-bold">{formatTime(timerState.elapsed)}</span>
                        <span className="text-xs text-base-content/40 mt-0.5">남은 {formatTime(timerState.remainingTime)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 타이머 컨트롤 */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => adjustTime(-60000)}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="-1분"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  onClick={timerState.isPaused ? resume : pause}
                  className="btn btn-primary btn-circle w-14 h-14"
                >
                  {timerState.isPaused ? (
                    <Play className="w-6 h-6" />
                  ) : (
                    <Pause className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={() => adjustTime(60000)}
                  className="btn btn-ghost btn-sm btn-circle"
                  title="+1분"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* 다음 일정 미리보기 */}
              {nextTodos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-base-content/50 mb-2">다음 일정</p>
                  <div className="space-y-1.5">
                    {nextTodos.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-base-content/70">
                        <span className="w-1 h-1 bg-base-content/30 rounded-full" />
                        <span className="truncate flex-1">{t.title}</span>
                        {t.startTime && (
                          <span className="text-xs text-base-content/40">
                            {format(new Date(t.startTime), 'HH:mm')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 하단 액션 */}
              <div className="flex gap-3">
                <button
                  onClick={handleDragComplete}
                  className="btn btn-success flex-1 rounded-full gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  완료
                </button>
                <button
                  onClick={handleStop}
                  className="btn btn-ghost flex-1 rounded-full"
                >
                  나가기
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
