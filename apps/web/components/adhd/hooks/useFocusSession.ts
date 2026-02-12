'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { usePomodoroLiveActivity } from '@/hooks/usePomodoroLiveActivity';
import { usePiPTimer } from '@/hooks/usePiPTimer';
import { useAuth } from '@/app/context/AuthContext';
import { PomodoroSessionService } from '@/services/pomodoro-session.service';
import { TodoCompletionsService } from '@/services/todo-completions.service';
import { updateWithJWT } from '@/lib/supabase/core';
import { removeAnytimeOverrideWithJWT } from '@/lib/supabase/todo-postpone';
import { deleteTodoExclusionWithJWT } from '@/lib/supabase/todo-exclusions';
import { useExecutionRecommendation } from './useExecutionRecommendation';
import type { Todo } from '@/entities/todo/Todo';
import type { TimerDisplayMode } from '@/types/adhd';

export interface SessionStats {
  completed: number;
  totalFocusMs: number;
  sessions: number;
}

export interface UseFocusSessionReturn {
  // 타이머 상태
  timerState: ReturnType<typeof usePomodoro>['timerState'];
  isWorkerReady: boolean;
  totalDuration: number | null;
  timerDisplayMode: TimerDisplayMode;
  toggleDisplayMode: () => void;

  // 타이머 제어
  startFocusTimer: (todo: Todo) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
  adjustTime: (deltaMs: number) => Promise<void>;

  // 드래그 완료 (CircularProgressSlider)
  handleDragComplete: () => Promise<void>;

  // 완료/다음
  completeCurrent: () => Promise<void>;
  skipToNext: () => void;

  // 다음 할일 미리보기
  nextTodos: Todo[];

  // 세션 통계
  sessionStats: SessionStats;

  // 환경 준비 토스트
  shouldShowEnvToast: boolean;
  dismissEnvToast: () => void;

  // PiP
  isPiPAvailable: boolean;
  isPiPActive: boolean;
  startPiP: ReturnType<typeof usePiPTimer>['startPiP'];
  stopPiP: ReturnType<typeof usePiPTimer>['stopPiP'];
}

/** 반복 인스턴스의 occurrence date 추출 (occurrenceDate 필드 → 가상 ID 파싱 → 로컬 날짜 fallback) */
function getOccurrenceDate(todo: Todo): string {
  if (todo.occurrenceDate) return todo.occurrenceDate;
  if (todo.id.includes('-recurrence-')) {
    return todo.id.split('-recurrence-')[1].substring(0, 10);
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** 반복 인스턴스의 부모 UUID를 추출 (parentRecurringTodoId → 가상 ID 파싱 → fallback) */
function getParentTodoId(todo: Todo): string {
  if (todo.parentRecurringTodoId) return todo.parentRecurringTodoId;
  if (todo.id.includes('-recurrence-')) return todo.id.split('-recurrence-')[0];
  return todo.id;
}

export function useFocusSession(todayTodosOverride?: Todo[]): UseFocusSessionReturn {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    focusMode,
    focusEnvironmentPrefs,
    endFocus,
    startFocus,
  } = useADHDStore();

  const { updateTodo, toggleTodo, fetchAllTodos } = useTodoStore();
  const { settings: pomodoroSettings } = usePomodoroStore();
  const { getTodayTodos } = useExecutionRecommendation();

  // 포모도로 타이머
  const {
    timerState,
    startTimer: startPomodoroTimer,
    stopTimer: stopPomodoroTimer,
    pauseTimer,
    resumeTimer,
    adjustTime: adjustPomodoroTime,
    isWorkerReady,
  } = usePomodoro();

  // Live Activity / PiP (웹에서는 스텁)
  usePomodoroLiveActivity({
    timerState,
    todoName: focusMode.focusTodo?.title,
    enabled: focusMode.isFocusActive,
  });

  const { startPiP, stopPiP, isActive: isPiPActive, isAvailable: isPiPAvailable } = usePiPTimer({
    timerState,
    onTimerComplete: () => {},
    onPiPStopped: () => {},
  });

  // 로컬 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [timerDisplayMode, setTimerDisplayMode] = useState<TimerDisplayMode>('both');
  const [shouldShowEnvToast, setShouldShowEnvToast] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    completed: 0,
    totalFocusMs: 0,
    sessions: 0,
  });

  // 완료 처리 중 중복 방지
  const isCompletingRef = useRef(false);

  // 타이머 완료 감지
  useEffect(() => {
    if (focusMode.isFocusActive && timerState.status === 'completed' && !isCompletingRef.current) {
      handleDragComplete();
    }
  }, [timerState.status, focusMode.isFocusActive]);

  // 포커스 시작 시 환경 토스트 표시
  const showEnvToastOnStart = useCallback(() => {
    if (focusEnvironmentPrefs.showToastReminder && focusEnvironmentPrefs.selectedCheckItems.length > 0) {
      setShouldShowEnvToast(true);
      setTimeout(() => setShouldShowEnvToast(false), 3000);
    }
  }, [focusEnvironmentPrefs]);

  // 포커스 타이머 시작
  const startFocusTimer = useCallback(async (todo: Todo) => {
    if (!userId) return;

    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000;
    setTotalDuration(duration);

    try {
      const newSessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(newSessionId);

      if (newSessionId) {
        await PomodoroSessionService.linkTodo(newSessionId, getParentTodoId(todo));
      }
    } catch (error) {
      console.error('포커스 세션 생성 실패:', error);
    }

    startPomodoroTimer(duration, 'POMODORO');
    showEnvToastOnStart();

    setSessionStats(prev => ({
      ...prev,
      sessions: prev.sessions + 1,
    }));
  }, [userId, pomodoroSettings.pomodoroDuration, startPomodoroTimer, showEnvToastOnStart]);

  // 일시정지
  const pause = useCallback(() => {
    setPausedAt(Date.now());
    pauseTimer();
  }, [pauseTimer]);

  // 재개
  const resume = useCallback(async () => {
    if (pausedAt) {
      const pausedDuration = Date.now() - pausedAt;
      setTotalDuration(d => (d ?? 0) + pausedDuration);

      if (sessionId) {
        const session = await PomodoroSessionService.getSession(sessionId);
        if (session) {
          const newDuration = session.duration + pausedDuration;
          await PomodoroSessionService.updateDuration(sessionId, newDuration);
        }
      }
      setPausedAt(null);
    }
    resumeTimer();
  }, [resumeTimer, pausedAt, sessionId]);

  // 중단
  const stop = useCallback(async () => {
    if (sessionId) {
      await PomodoroSessionService.deleteSession(sessionId);
    }
    stopPomodoroTimer();
    setSessionId(null);
    setPausedAt(null);
    setTotalDuration(null);
    endFocus();
  }, [sessionId, stopPomodoroTimer, endFocus]);

  // 시간 조정
  const handleAdjustTime = useCallback(async (deltaMs: number) => {
    adjustPomodoroTime(deltaMs);
    setTotalDuration(d => (d ?? 0) + deltaMs);

    if (sessionId) {
      const session = await PomodoroSessionService.getSession(sessionId);
      if (session) {
        const newDuration = session.duration + deltaMs;
        await PomodoroSessionService.updateDuration(sessionId, newDuration);

        const todo = focusMode.focusTodo;
        if (todo && getParentTodoId(todo) === todo.id) {
          const newEndTime = new Date(new Date(session.start_time).getTime() + newDuration).toISOString();
          await updateWithJWT('todos',
            { column: 'id', operator: 'eq', value: todo.id },
            { end_time: newEndTime }
          );
        }
      }
    }
  }, [adjustPomodoroTime, sessionId, focusMode.focusTodo]);

  // 드래그 완료 / 타이머 완료 처리
  const handleDragComplete = useCallback(async () => {
    if (isCompletingRef.current || !focusMode.focusTodo) return;
    isCompletingRef.current = true;

    const todo = focusMode.focusTodo;
    const sessionEndTime = new Date();

    try {
      // 할일 완료 처리
      const parentId = getParentTodoId(todo);
      if (parentId !== todo.id && userId) {
        // 반복 할일
        const occurrenceDate = getOccurrenceDate(todo);

        await TodoCompletionsService.markRecurrenceAsCompleted(
          parentId,
          userId,
          occurrenceDate,
          {
            actualStartTime: new Date(Date.now() - timerState.elapsed).toISOString(),
            actualEndTime: sessionEndTime.toISOString(),
          }
        );

        // 미루기 exclusion 정리 (있으면 삭제, 없으면 무시)
        await deleteTodoExclusionWithJWT(parentId, occurrenceDate, userId).catch(() => {});

        // 타임라인 데이터 새로고침
        await fetchAllTodos();
      } else {
        await updateTodo(todo.id, {
          completed: true,
          schedule_type: 'timed',
          start_time: new Date(Date.now() - timerState.elapsed).toISOString(),
          end_time: sessionEndTime.toISOString(),
        });
      }

      // 세션 삭제
      if (sessionId) {
        await PomodoroSessionService.deleteSession(sessionId);
      }

      // 통계 업데이트
      setSessionStats(prev => ({
        completed: prev.completed + 1,
        totalFocusMs: prev.totalFocusMs + timerState.elapsed,
        sessions: prev.sessions,
      }));
    } catch (error) {
      console.error('포커스 완료 처리 실패:', error);
    } finally {
      stopPomodoroTimer();
      setSessionId(null);
      setPausedAt(null);
      setTotalDuration(null);
      isCompletingRef.current = false;
    }

    // 포커스 모드는 유지 — UI에서 "다음" or "나가기" 결정
    // endFocus는 completeCurrent 또는 skipToNext에서 호출
  }, [focusMode.focusTodo, sessionId, timerState.elapsed, userId, updateTodo, fetchAllTodos, stopPomodoroTimer]);

  // 완료 후 종료
  const completeCurrent = useCallback(async () => {
    // 이미 타이머가 실행 중이면 먼저 완료 처리
    if (timerState.status === 'running' || timerState.status === 'paused') {
      await handleDragComplete();
    }
    endFocus();
  }, [timerState.status, handleDragComplete, endFocus]);

  // 다음 할일로 이동
  const skipToNext = useCallback(() => {
    const resolvedTodayTodos = todayTodosOverride ?? getTodayTodos(true);
    const currentId = focusMode.focusTodo?.id;
    const nextTodo = resolvedTodayTodos
      .filter(t => !t.completed && t.id !== currentId)
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return aTime - bTime;
      })[0];

    if (nextTodo) {
      startFocus(nextTodo, 'inline');
      // 자동으로 타이머 시작
      startFocusTimer(nextTodo);
    } else {
      endFocus();
    }
  }, [todayTodosOverride, getTodayTodos, focusMode.focusTodo, startFocus, startFocusTimer, endFocus]);

  // 다음 할일 미리보기 (2-3개)
  const nextTodos = (() => {
    const resolvedTodayTodos = todayTodosOverride ?? getTodayTodos(true);
    const currentId = focusMode.focusTodo?.id;
    const currentStartTime = focusMode.focusTodo?.startTime
      ? new Date(focusMode.focusTodo.startTime).getTime()
      : 0;

    return resolvedTodayTodos
      .filter(t => !t.completed && t.id !== currentId)
      .sort((a, b) => {
        const aTime = a.startTime ? new Date(a.startTime).getTime() : Infinity;
        const bTime = b.startTime ? new Date(b.startTime).getTime() : Infinity;
        return aTime - bTime;
      })
      .filter(t => {
        if (!t.startTime) return true;
        return new Date(t.startTime).getTime() >= currentStartTime;
      })
      .slice(0, 3);
  })();

  const dismissEnvToast = useCallback(() => {
    setShouldShowEnvToast(false);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setTimerDisplayMode(prev =>
      prev === 'elapsed' ? 'remaining' : prev === 'remaining' ? 'both' : 'elapsed'
    );
  }, []);

  return {
    timerState,
    isWorkerReady,
    totalDuration,
    timerDisplayMode,
    toggleDisplayMode,
    startFocusTimer,
    pause,
    resume,
    stop,
    adjustTime: handleAdjustTime,
    handleDragComplete,
    completeCurrent,
    skipToNext,
    nextTodos,
    sessionStats,
    shouldShowEnvToast,
    dismissEnvToast,
    isPiPAvailable,
    isPiPActive,
    startPiP,
    stopPiP,
  };
}
