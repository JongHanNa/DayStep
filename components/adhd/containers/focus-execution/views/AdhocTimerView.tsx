'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Check, Zap, PictureInPicture2 } from 'lucide-react';
import type { TimerDisplayMode } from '@/types/adhd';
import CircularProgressSlider from '@/components/adhd/common/CircularProgressSlider';

interface AdhocTimerViewProps {
  timerState: {
    status: 'idle' | 'running' | 'paused' | 'completed';
    remainingTime: number;
    elapsed: number;
    duration: number;
  };
  onStop: () => void;
  onComplete: () => void;
  onPause: () => void;
  onResume: () => void;
  onAdjustTime: (deltaMs: number) => void;
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
  inlineTodoInput: string;
  onInlineTodoInputChange: (value: string) => void;
  onCreateInlineTodo: () => void;
  onUpdateLinkedTodoTitle: (newTitle: string) => void;
  originalStartTime?: Date;
  originalDuration?: number;
  totalDuration: number | null;
  isPiPAvailable: boolean;
  isPiPActive: boolean;
  onStartPiP: (startTimeMs: number, durationMs: number, title?: string) => Promise<boolean>;
  onStopPiP: () => Promise<boolean>;
  timerDisplayMode: TimerDisplayMode;
  onToggleDisplayMode: () => void;
}

/**
 * 즉흥 포모도로 타이머 화면
 *
 * 원형 프로그레스 슬라이더와 타이머 컨트롤을 제공합니다.
 * 드래그로 타이머를 빠르게 완료할 수 있습니다.
 */
export function AdhocTimerView({
  timerState,
  onStop,
  onComplete,
  onPause,
  onResume,
  onAdjustTime,
  linkedTodoId,
  linkedTodoTitle,
  inlineTodoInput,
  onInlineTodoInputChange,
  onCreateInlineTodo,
  onUpdateLinkedTodoTitle,
  originalStartTime,
  originalDuration,
  totalDuration,
  isPiPAvailable,
  isPiPActive,
  onStartPiP,
  onStopPiP,
  timerDisplayMode,
  onToggleDisplayMode,
}: AdhocTimerViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // 타이머 시작 시점 (세션 복원 시 원본 시간 사용, 아니면 현재 시간)
  const [startedAt] = useState(() => originalStartTime || new Date());

  // 원본 duration (세션 복원 시 DB의 duration, 아니면 timerState.duration)
  const effectiveDuration = originalDuration || timerState.duration;

  // 시간 포맷팅 (mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 시간 포맷팅 (HH:mm)
  const formatTimeHHMM = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 종료 예정 시간 계산
  const endTime = totalDuration !== null
    ? new Date(startedAt.getTime() + totalDuration)
    : new Date(Date.now() + timerState.remainingTime);

  // 시간 간격 계산 (분 단위)
  const durationMinutes = Math.round((totalDuration ?? effectiveDuration) / (60 * 1000));

  // 진행률 계산 (0.01-1)
  const progress = effectiveDuration > 0
    ? Math.max(0.01, Math.min(1, (effectiveDuration - timerState.remainingTime) / effectiveDuration))
    : 0.01;

  // 타이머 자연 완료 감지
  useEffect(() => {
    if (timerState.remainingTime <= 0 && timerState.status === 'running') {
      onComplete();
    }
  }, [timerState.remainingTime, timerState.status, onComplete]);

  // 드래그 중 진행률 업데이트
  const handleDragProgress = () => {
    // 드래그 중에는 UI 피드백만 제공
  };

  // 드래그 종료 처리
  const handleDragEnd = (finalProgress: number) => {
    if (finalProgress >= 0.95) {
      onComplete();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-sm text-center"
    >
      {/* 상단: 할일 제목 또는 "포커스" */}
      {(linkedTodoId || linkedTodoTitle) ? (
        isEditingTitle ? (
          <input
            autoFocus
            value={editingTitleValue}
            onChange={(e) => setEditingTitleValue(e.target.value)}
            onBlur={() => {
              if (editingTitleValue.trim() && editingTitleValue !== linkedTodoTitle) {
                onUpdateLinkedTodoTitle(editingTitleValue.trim());
              }
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (editingTitleValue.trim() && editingTitleValue !== linkedTodoTitle) {
                  onUpdateLinkedTodoTitle(editingTitleValue.trim());
                }
                setIsEditingTitle(false);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditingTitle(false);
              }
            }}
            className="text-2xl font-bold text-base-content text-center bg-transparent border-none outline-none w-full mb-1"
            placeholder="할일 제목"
          />
        ) : (
          <h2
            onClick={() => {
              setEditingTitleValue(linkedTodoTitle || '');
              setIsEditingTitle(true);
            }}
            className="text-2xl font-bold text-base-content mb-1 cursor-pointer hover:opacity-70 transition-opacity break-words px-4"
          >
            {linkedTodoTitle}
          </h2>
        )
      ) : (
        <h2 className="text-2xl font-bold text-base-content mb-1">포커스</h2>
      )}

      {/* 시작 → 종료 시간 */}
      <p className="text-base text-base-content/60 mb-6">
        {formatTimeHHMM(startedAt)} → {formatTimeHHMM(endTime)} ({durationMinutes}분)
      </p>

      {/* 타이머 원형 디스플레이 */}
      <div className="relative mx-auto mb-4" style={{ width: 280, height: 280 }}>
        <CircularProgressSlider
          size={280}
          progress={progress}
          onDragProgress={handleDragProgress}
          onDragEnd={handleDragEnd}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />

        {/* 중앙에 Zap 아이콘 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          animate={{
            scale: isDragging ? 0.95 : 1,
            opacity: isDragging ? 0.8 : 1
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <Zap className="w-16 h-16 text-violet-500" />
        </motion.div>
      </div>

      {/* 시간 표시 */}
      <div
        className="text-center mb-4 cursor-pointer"
        onClick={onToggleDisplayMode}
      >
        {timerDisplayMode === 'both' ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-bold bg-[#8b5cf6] text-white px-4 py-1 rounded-full">
              {formatTime(timerState.elapsed)}
            </span>
            <span className="text-xl text-base-content/40">/</span>
            <span className="text-2xl font-bold bg-[#e0e7ff] text-gray-700 px-4 py-1 rounded-full">
              {formatTime(timerState.remainingTime)}
            </span>
          </div>
        ) : (
          <span className={`text-3xl font-bold px-6 py-2 rounded-full ${
            timerDisplayMode === 'elapsed'
              ? 'bg-[#8b5cf6] text-white'
              : 'bg-[#e0e7ff] text-gray-700'
          }`}>
            {timerDisplayMode === 'elapsed'
              ? formatTime(timerState.elapsed)
              : formatTime(timerState.remainingTime)}
          </span>
        )}
      </div>

      {/* 타이머 컨트롤 버튼 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(-60000)}
          className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
        >
          -1분
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={timerState.status === 'paused' ? onResume : onPause}
          className="btn btn-neutral rounded-full px-6"
        >
          {timerState.status === 'paused' ? (
            <Play className="w-5 h-5" />
          ) : (
            <Pause className="w-5 h-5" />
          )}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onAdjustTime(60000)}
          className="text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
        >
          +1분
        </motion.button>

        {/* PiP 타이머 버튼 */}
        {isPiPAvailable && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isPiPActive) {
                onStopPiP();
              } else {
                onStartPiP(
                  startedAt.getTime(),
                  effectiveDuration,
                  linkedTodoTitle || '포커스'
                );
              }
            }}
            className={`btn btn-circle btn-ghost ${isPiPActive ? 'text-primary' : 'text-base-content/70'}`}
            title={isPiPActive ? 'PiP 종료' : 'PiP 타이머로 보기'}
          >
            <PictureInPicture2 className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* 미완료 할일 입력 */}
      {(!linkedTodoId && !linkedTodoTitle) && (
        <div className="mb-4 px-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={inlineTodoInput}
              onChange={(e) => onInlineTodoInputChange(e.target.value)}
              placeholder="지금 무엇을 하세요?"
              className="input input-bordered input-sm flex-1 rounded-full text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inlineTodoInput.trim()) {
                  onCreateInlineTodo();
                }
              }}
            />
            {inlineTodoInput.trim() && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onCreateInlineTodo}
                className="btn btn-primary btn-sm btn-circle"
              >
                <Check className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* 안내 문구 */}
      <p className="text-sm text-base-content/50 mb-4">
        {linkedTodoId ? (
          <>원을 드래그해서 바로 끝낼 수도 있어요</>
        ) : (
          <>지금 기록안해도 끝나면 뭐 했는지 물어볼게요<br />원을 드래그해서 바로 끝낼 수도 있어요</>
        )}
      </p>

      {/* 중단 버튼 */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onStop}
        className="btn btn-ghost btn-md rounded-full border border-base-300"
      >
        <Square className="w-4 h-4" />
        그만할래
      </motion.button>
    </motion.div>
  );
}

export default AdhocTimerView;
