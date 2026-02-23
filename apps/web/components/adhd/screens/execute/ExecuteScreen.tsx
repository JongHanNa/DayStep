'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTodoStore } from '@/state/stores/todoStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { useAuth } from '@/app/context/AuthContext';
import { FocusTimerOverlay } from './FocusTimerOverlay';
import { CircularProgress } from '@/components/pomodoro/CircularProgress';
import type { Todo } from '@/entities/todo/Todo';

// ============================================
// Constants
// ============================================

const MINT = '#14B8A6';
const MINT_LIGHT = '#CCFBF1';
const VIOLET = '#8B5CF6';
const VIOLET_LIGHT = '#EDE9FE';
const QUICK_FOCUS_SECONDS = 20 * 60;
const DEFAULT_FOCUS_SECONDS = 25 * 60;

type FocusMode = 'todo' | 'quick';

// ============================================
// Duration Helpers
// ============================================

function calcTodoDuration(todo: Todo): number {
  if (todo.startTime && todo.endTime) {
    const diff = todo.endTime.getTime() - todo.startTime.getTime();
    return Math.max(Math.round(diff / 1000), 60);
  }
  if (todo.anytimeDuration) {
    return todo.anytimeDuration * 60;
  }
  return DEFAULT_FOCUS_SECONDS;
}

function formatDurationLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m > 0 ? `${m}분` : ''}`;
  return `${m}분`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// Main Screen
// ============================================

interface ExecuteScreenProps {
  userId?: string;
  onExit?: () => void;
}

export function ExecuteScreen({ onExit = () => {} }: ExecuteScreenProps) {
  const { user } = useAuth();
  const { todos } = useTodoStore();
  const { stats } = usePomodoroStore();

  const [mode, setMode] = useState<FocusMode>('todo');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [timerParams, setTimerParams] = useState<{
    mode: 'todo' | 'quick';
    todoId?: string;
    todoTitle?: string;
    durationSeconds: number;
  } | null>(null);

  // 미완료 할일만
  const incompleteTodos = useMemo(
    () => todos.filter(t => !t.completed),
    [todos],
  );

  // 선택된 할일
  const selectedTodo = useMemo(
    () => incompleteTodos.find(t => t.id === selectedTodoId) ?? null,
    [incompleteTodos, selectedTodoId],
  );

  // 첫 번째 할일 자동 선택
  useEffect(() => {
    if (incompleteTodos.length > 0 && !selectedTodo) {
      setSelectedTodoId(incompleteTodos[0].id);
    }
  }, [incompleteTodos, selectedTodo]);

  // 표시 시간
  const displayDuration = useMemo(() => {
    if (mode === 'quick') return QUICK_FOCUS_SECONDS;
    if (selectedTodo) return calcTodoDuration(selectedTodo);
    return DEFAULT_FOCUS_SECONDS;
  }, [mode, selectedTodo]);

  const activeColor = mode === 'todo' ? MINT : VIOLET;

  const handleStartFocus = useCallback(() => {
    if (mode === 'todo' && selectedTodo) {
      setTimerParams({
        mode: 'todo',
        todoId: selectedTodo.id,
        todoTitle: selectedTodo.title,
        durationSeconds: calcTodoDuration(selectedTodo),
      });
    } else if (mode === 'quick') {
      setTimerParams({
        mode: 'quick',
        durationSeconds: QUICK_FOCUS_SECONDS,
      });
    }
    setShowTimer(true);
  }, [mode, selectedTodo]);

  const handleTimerClose = useCallback(() => {
    setShowTimer(false);
    setTimerParams(null);
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-gradient-to-b from-orange-50/50 via-amber-50/30 to-white">
      {/* 풀스크린 타이머 오버레이 */}
      <AnimatePresence>
        {showTimer && timerParams && (
          <FocusTimerOverlay
            key="focus-timer"
            params={timerParams}
            onClose={handleTimerClose}
          />
        )}
      </AnimatePresence>

      {/* 헤더 */}
      <header className="text-center pt-6 pb-2">
        <h1 className="text-lg font-bold text-gray-800">⏱ 실행</h1>
      </header>

      {/* 타이머 링 (idle) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center py-6"
      >
        <CircularProgress
          progress={0}
          size={160}
          strokeWidth={8}
          progressColor={activeColor}
          showGradient={false}
        >
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extralight text-gray-800 tabular-nums">
              {formatTime(displayDuration)}
            </span>
            <span className="text-xs font-semibold mt-0.5" style={{ color: activeColor }}>
              {mode === 'todo' ? '준비' : '자유 모드'}
            </span>
          </div>
        </CircularProgress>
      </motion.div>

      {/* 세그먼트 컨트롤 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-6 mb-4"
      >
        <div className="flex bg-gray-100 rounded-xl p-1 relative">
          <motion.div
            className="absolute top-1 h-[calc(100%-8px)] rounded-lg"
            style={{ width: '50%' }}
            animate={{
              left: mode === 'todo' ? '4px' : 'calc(50% - 0px)',
              backgroundColor: mode === 'todo' ? `${MINT}20` : `${VIOLET}20`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => setMode('todo')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg z-10 transition-colors ${
              mode === 'todo' ? 'text-gray-800' : 'text-gray-400'
            }`}
          >
            📋 할일 집중
          </button>
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg z-10 transition-colors ${
              mode === 'quick' ? 'text-gray-800' : 'text-gray-400'
            }`}
          >
            ⚡ 빠른 집중
          </button>
        </div>
      </motion.div>

      {/* 모드별 콘텐츠 */}
      <div className="flex-1 px-6 flex flex-col">
        <AnimatePresence mode="wait">
          {mode === 'todo' ? (
            <motion.div
              key="todo-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col"
            >
              {incompleteTodos.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400 text-center text-sm leading-relaxed">
                    오늘 할일이 없어요.<br />플래너에서 할일을 추가해보세요!
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 mb-3 max-h-[280px]">
                  {incompleteTodos.map(todo => (
                    <button
                      key={todo.id}
                      onClick={() => setSelectedTodoId(todo.id)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-[1.5px] transition-all text-left ${
                        selectedTodoId === todo.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedTodoId === todo.id
                            ? 'border-teal-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedTodoId === todo.id && (
                          <div className="w-3 h-3 rounded-full bg-teal-500" />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span className="text-sm font-medium text-gray-800 truncate">
                          {todo.icon ? `${todo.icon} ` : ''}{todo.title}
                        </span>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          {formatDurationLabel(calcTodoDuration(todo))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={handleStartFocus}
                disabled={!selectedTodo || incompleteTodos.length === 0}
                className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg transition-all disabled:opacity-40"
                style={{ backgroundColor: MINT }}
              >
                집중 시작
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="quick-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col items-center justify-center pb-6"
            >
              <p className="text-gray-500 text-center text-sm leading-relaxed mb-8">
                할일을 정하지 않고 바로 시작해요.<br />
                끝나면 무엇을 했는지 기록할 수 있어요.
              </p>

              <button
                onClick={handleStartFocus}
                className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg"
                style={{ backgroundColor: VIOLET }}
              >
                바로 시작
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 통계 바 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-6 py-5 border-t border-gray-100"
      >
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800">{stats.todaySessions}</div>
          <div className="text-[11px] text-gray-400">오늘 집중</div>
        </div>
        <div className="w-px h-7 bg-gray-200" />
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800">{stats.totalFocusTime}분</div>
          <div className="text-[11px] text-gray-400">총 시간</div>
        </div>
        <div className="w-px h-7 bg-gray-200" />
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800">{stats.currentStreak}</div>
          <div className="text-[11px] text-gray-400">연속</div>
        </div>
      </motion.div>
    </div>
  );
}
