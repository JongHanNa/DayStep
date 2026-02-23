'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Pause, Play, Square, Check } from 'lucide-react';
import { CircularProgress } from '@/components/pomodoro/CircularProgress';
import { useTodoStore } from '@/state/stores/todoStore';

// ============================================
// Constants
// ============================================

const MINT = '#14B8A6';
const VIOLET = '#8B5CF6';

type TimerStatus = 'running' | 'paused' | 'completed';

interface FocusTimerParams {
  mode: 'todo' | 'quick';
  todoId?: string;
  todoTitle?: string;
  durationSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// Main Component
// ============================================

interface FocusTimerOverlayProps {
  params: FocusTimerParams;
  onClose: () => void;
}

export function FocusTimerOverlay({ params, onClose }: FocusTimerOverlayProps) {
  const { mode, todoId, todoTitle, durationSeconds } = params;
  const isTodo = mode === 'todo';
  const activeColor = isTodo ? MINT : VIOLET;

  const [status, setStatus] = useState<TimerStatus>('running');
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [noteText, setNoteText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toggleTodo } = useTodoStore();

  const progress = durationSeconds > 0 ? elapsed / durationSeconds : 0;

  // 타이머 인터벌
  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  const handleTimerComplete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('completed');

    if (isTodo && todoId) {
      toggleTodo(todoId);
      setShowCelebration(true);
    } else {
      setShowCelebration(true);
    }
  }, [isTodo, todoId, toggleTodo]);

  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');

  const handleStop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onClose();
  };

  const handleMarkComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isTodo && todoId) {
      toggleTodo(todoId);
    }
    setStatus('completed');
    setShowCelebration(true);
  };

  const handleCelebrationDismiss = () => {
    setShowCelebration(false);
    if (!isTodo) {
      setShowNotePrompt(true);
    } else {
      onClose();
    }
  };

  const handleNoteSave = () => {
    // TODO: 노트 저장 로직
    onClose();
  };

  const handleNoteSkip = () => {
    onClose();
  };

  const bgGradient = isTodo
    ? 'from-teal-50 via-emerald-50/50 to-white'
    : 'from-violet-50 via-purple-50/50 to-white';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] flex flex-col bg-gradient-to-b ${bgGradient}`}
    >
      {/* 닫기 버튼 */}
      <div className="flex justify-start p-4 safe-area-top">
        <button
          onClick={handleStop}
          className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 할일 이름 */}
      <div className="text-center px-10 pt-2">
        <h2 className="text-xl font-semibold text-gray-800 line-clamp-2">
          {isTodo && todoTitle ? todoTitle : '집중 중...'}
        </h2>
      </div>

      {/* 타이머 링 */}
      <div className="flex-1 flex items-center justify-center">
        <CircularProgress
          progress={progress}
          size={260}
          strokeWidth={10}
          progressColor={activeColor}
          showGradient={false}
        >
          <div className="flex flex-col items-center">
            <span className="text-5xl font-extralight text-gray-800 tabular-nums">
              {formatTime(remainingTime)}
            </span>
            {status === 'running' && (
              <span className="text-sm text-gray-400 mt-1">
                {formatTime(elapsed)} 경과
              </span>
            )}
            {status === 'paused' && (
              <span className="text-sm text-amber-500 mt-1 font-medium">
                일시정지
              </span>
            )}
          </div>
        </CircularProgress>
      </div>

      {/* 컨트롤 */}
      {status !== 'completed' && !showNotePrompt && (
        <div className="flex items-center justify-center gap-8 pb-12">
          {/* 종료 */}
          <button
            onClick={handleStop}
            className="flex flex-col items-center gap-1"
          >
            <Square className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-400">종료</span>
          </button>

          {/* 재생/일시정지 */}
          {status === 'running' ? (
            <button
              onClick={handlePause}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: activeColor }}
            >
              <Pause className="w-7 h-7 text-white" />
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: activeColor }}
            >
              <Play className="w-7 h-7 text-white ml-1" />
            </button>
          )}

          {/* 완료 */}
          <button
            onClick={handleMarkComplete}
            className="flex flex-col items-center gap-1"
          >
            <Check className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-400">완료</span>
          </button>
        </div>
      )}

      {/* 빠른 집중 노트 프롬프트 */}
      {showNotePrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-8 pb-12 flex flex-col items-center"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            방금 무슨 일을 했나요?
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            간단히 기록해두면 나중에 도움이 돼요
          </p>
          <input
            type="text"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="예: 이메일 정리, 아이디어 정리..."
            className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-300 mb-4"
            onKeyDown={e => {
              if (e.key === 'Enter' && noteText.trim()) handleNoteSave();
            }}
          />
          <div className="flex gap-3 w-full">
            <button
              onClick={handleNoteSkip}
              className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm"
            >
              건너뛰기
            </button>
            <button
              onClick={handleNoteSave}
              disabled={!noteText.trim()}
              className="flex-1 py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-40"
              style={{ backgroundColor: VIOLET }}
            >
              저장
            </button>
          </div>
        </motion.div>
      )}

      {/* 축하 오버레이 */}
      {showCelebration && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 bg-white/95 z-10 flex flex-col items-center justify-center"
        >
          <span className="text-7xl mb-4">🎉</span>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">집중 완료!</h2>
          <p className="text-gray-500 mb-8">정말 잘했어요</p>
          <button
            onClick={handleCelebrationDismiss}
            className="px-12 py-3.5 rounded-2xl bg-gray-800 text-white font-bold"
          >
            확인
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
