'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  PartyPopper,
  Trash2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { addTodoNote } from '@/lib/supabase/todo-notes';
import { removeAnytimeOverrideWithJWT } from '@/lib/supabase/todo-postpone';
import { usePomodoro } from '@/hooks/usePomodoro';
import { usePomodoroLiveActivity } from '@/hooks/usePomodoroLiveActivity';
import { usePiPTimer } from '@/hooks/usePiPTimer';
import { useAuth } from '@/app/context/AuthContext';
import { PomodoroSessionService } from '@/services/pomodoro-session.service';
import { TodoCompletionsService } from '@/services/todo-completions.service';
import { updateWithJWT } from '@/lib/supabase/core';
import { DistractionPlanView } from '@/components/adhd/distraction';
import type { EnvironmentSetup } from '@/types/distraction';
import type { ExecutionViewState, TimerDisplayMode } from '@/types/adhd';
import { getScheduleTypeLabel } from '@/types/adhd';

// 분리된 뷰 컴포넌트 import
import {
  RecommendationView,
  CompletedAllView,
  EmptyStateView,
  AdhocTimerView,
  AdhocCaptureView,
  AdhocNoteConnectionView,
} from '../screens/execute/components';
import { useExecutionRecommendation } from '../hooks/useExecutionRecommendation';
import { useUsageLimitCheck } from '@/hooks/useUsageLimitCheck';
import { UsageLimitModal } from '@/components/subscription/UsageLimitModal';

interface ExecutionContainerProps {
  onExit: () => void;
  hideNavigation?: boolean;
}

/**
 * ADHD 실행 모드 화면
 *
 * 할일 목록을 숨기고 단일 할일만 추천하여
 * ADHD 사용자가 "지금 할 수 있는 가장 작은 것 하나"에 집중하도록 돕습니다.
 */
export default function ExecutionContainer({ onExit, hideNavigation = false }: ExecutionContainerProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    executionMode,
    awakeningSentence,
    setCurrentRecommendation,
    markCompleted,
    markSkipped,
    startAdhocMode,
    endAdhocMode,
    setSessionId,
    setLinkedTodo,
  } = useADHDStore();

  // 노트 스토어
  const { getInboxNotes, createInboxNote, notes: allNotes } = useNoteStore();

  // 포모도로 훅
  const {
    timerState,
    startTimer: startPomodoroTimer,
    stopTimer: stopPomodoroTimer,
    pauseTimer,
    resumeTimer,
    adjustTime,
    isWorkerReady,
  } = usePomodoro();

  const { settings: pomodoroSettings } = usePomodoroStore();

  // iOS Live Activity 연동
  usePomodoroLiveActivity({
    timerState,
    todoName: executionMode.adhocMode.linkedTodoTitle || executionMode.currentRecommendation?.title,
    enabled: true,
  });

  // iOS PiP 타이머 연동
  const { startPiP, stopPiP, isActive: isPiPActive, isAvailable: isPiPAvailable } = usePiPTimer({
    timerState,
    onTimerComplete: () => console.log('[PiP] Timer completed'),
    onPiPStopped: () => console.log('[PiP] Stopped'),
  });

  const { todos, toggleTodo, deleteTodo, createTodo, updateTodo, fetchTodoById } = useTodoStore();
  const { getTodayTodos, getTodayCompletedTodos } = useExecutionRecommendation();
  const { checkAndProceed, limitResult, isModalOpen: isLimitModalOpen, closeModal: closeLimitModal, onCreateSuccess } = useUsageLimitCheck();

  // 상태
  const [viewState, setViewState] = useState<ExecutionViewState>('distraction-plan');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [adhocCaptureTitle, setAdhocCaptureTitle] = useState('');
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  const [inlineTodoInput, setInlineTodoInput] = useState('');
  const [restoredStartTime, setRestoredStartTime] = useState<Date | null>(null);
  const [restoredDuration, setRestoredDuration] = useState<number | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [editingCompletedTodoId, setEditingCompletedTodoId] = useState<string | null>(null);
  const [editingCompletedTodoTitle, setEditingCompletedTodoTitle] = useState('');
  const [isCreatingTodo, setIsCreatingTodo] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [timerDisplayMode, setTimerDisplayMode] = useState<TimerDisplayMode>('both');

  // 영감 노트 연결 상태
  const [completedTodoIdForNote, setCompletedTodoIdForNote] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteConnectionMode, setNoteConnectionMode] = useState<'select' | 'create'>('select');

  // 환경 세팅 상태
  const [environmentSetup, setEnvironmentSetup] = useState<EnvironmentSetup | null>(null);
  const [pendingLinkedTodo, setPendingLinkedTodo] = useState<{ id: string; title: string } | null>(null);

  // 외부에서 adhocMode 진입 시 viewState 자동 설정
  useEffect(() => {
    const { adhocMode } = executionMode;
    if (adhocMode.isActive && timerState.status === 'idle' && viewState === 'recommendation') {
      setViewState('distraction-plan');
    }
  }, [executionMode.adhocMode.isActive, timerState.status, viewState]);

  // 다음 추천 할일 가져오기
  const getNextRecommendation = useCallback(() => {
    const { adhocMode, skippedTodoIds, completedInSession } = useADHDStore.getState().executionMode;
    if (adhocMode.isActive) return;

    const todayTodos = getTodayTodos(true);
    const candidates = todayTodos.filter(todo => !skippedTodoIds.includes(todo.id));

    if (candidates.length === 0) {
      if (completedInSession > 0) {
        if (userId) getInboxNotes(userId);
        setViewState('completed-all');
      } else {
        setRestoredStartTime(null);
        setRestoredDuration(null);
        setViewState('distraction-plan');
      }
      setCurrentRecommendation(null);
      return;
    }

    const { calculateRecommendationScore } = useADHDStore.getState();
    const scored = candidates.map(todo => ({
      todo,
      score: calculateRecommendationScore(todo),
    }));
    scored.sort((a, b) => b.score - a.score);
    setCurrentRecommendation(scored[0].todo);
    setViewState('recommendation');
  }, [getTodayTodos, setCurrentRecommendation, userId, getInboxNotes]);

  // 초기 추천 로드
  useEffect(() => {
    if (!isRestoringSession) {
      getNextRecommendation();
    }
  }, [isRestoringSession, getNextRecommendation]);

  // 활성 세션 복원
  useEffect(() => {
    const restoreActiveSession = async () => {
      if (!userId) {
        setIsRestoringSession(false);
        return;
      }
      if (!isWorkerReady) return;

      try {
        const activeSession = await PomodoroSessionService.getActiveSession(userId);
        if (activeSession && !activeSession.is_completed) {
          const originalStartTime = new Date(activeSession.start_time);
          const remaining = activeSession.duration - (Date.now() - originalStartTime.getTime());

          if (remaining > 0) {
            setRestoredStartTime(originalStartTime);
            setRestoredDuration(activeSession.duration);
            setTotalDuration(activeSession.duration);
            setSessionId(activeSession.id);
            startAdhocMode();
            startPomodoroTimer(activeSession.duration, 'POMODORO', undefined, originalStartTime.getTime());
            setViewState('adhoc-timer');

            if (activeSession.linked_todo_id) {
              const linkedTodo = await fetchTodoById(activeSession.linked_todo_id);
              if (linkedTodo) setLinkedTodo(linkedTodo.id, linkedTodo.title);
            }
          }
        }
      } catch (error) {
        console.error('세션 복원 실패:', error);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreActiveSession();
  }, [userId, isWorkerReady, setSessionId, startAdhocMode, startPomodoroTimer, setLinkedTodo, fetchTodoById]);

  // 실제 타이머 시작
  const actuallyStartTimer = useCallback(async () => {
    if (!userId) return;

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000;
    setTotalDuration(duration);

    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);

      if (pendingLinkedTodo && sessionId) {
        await PomodoroSessionService.linkTodo(sessionId, pendingLinkedTodo.id);
        setLinkedTodo(pendingLinkedTodo.id, pendingLinkedTodo.title);
        setPendingLinkedTodo(null);
      }
    } catch (error) {
      console.error('세션 생성 실패:', error);
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  }, [userId, pomodoroSettings.pomodoroDuration, startAdhocMode, setSessionId, startPomodoroTimer, pendingLinkedTodo, setLinkedTodo]);

  // 환경 세팅 핸들러
  const handleEnvironmentSetupComplete = useCallback((setup: EnvironmentSetup) => {
    setEnvironmentSetup(setup);
    actuallyStartTimer();
  }, [actuallyStartTimer]);

  const handleEnvironmentSetupSkip = useCallback(() => {
    setEnvironmentSetup(null);
    actuallyStartTimer();
  }, [actuallyStartTimer]);

  // 완료 핸들러
  const handleComplete = async (method: 'direct' | 'alternative') => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating || !userId) return;

    setIsAnimating(true);
    await toggleTodo(currentTodo.id);
    markCompleted(currentTodo.id, method);

    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 500);
  };

  // 스킵 핸들러
  const handleSkipClick = () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating) return;

    setIsAnimating(true);
    markSkipped(currentTodo.id);

    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 삭제 핸들러
  const handleDelete = async () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating) return;

    setIsAnimating(true);
    markSkipped(currentTodo.id);
    await deleteTodo(currentTodo.id);

    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 즉흥 모드 핸들러
  const handleStartAdhoc = () => {
    if (!userId) return;
    setRestoredStartTime(null);
    setRestoredDuration(null);
    setPendingLinkedTodo(null);
    setViewState('distraction-plan');
  };

  const handleStartPomodoroWithTodo = () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!userId || !currentTodo) return;

    setRestoredStartTime(null);
    setRestoredDuration(null);
    setPendingLinkedTodo({ id: currentTodo.id, title: currentTodo.title });
    setViewState('distraction-plan');
  };

  // 타이머 중단
  const handleStopAdhoc = () => {
    const { linkedTodoId } = executionMode.adhocMode;
    if (linkedTodoId) {
      setShowStopConfirmModal(true);
    } else {
      handleConfirmStop('delete');
    }
  };

  const handleConfirmStop = async (action: 'delete' | 'keep') => {
    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    if (action === 'delete' && linkedTodoId) {
      await deleteTodo(linkedTodoId);
    }

    if (sessionId) {
      await PomodoroSessionService.deleteSession(sessionId);
    }

    stopPomodoroTimer();
    endAdhocMode();
    setSessionId(null);
    setLinkedTodo(null, null);
    setShowStopConfirmModal(false);
    setInlineTodoInput('');
    setRestoredStartTime(null);
    setRestoredDuration(null);
    onExit();
  };

  // 타이머 완료
  const handleAdhocTimerComplete = async () => {
    if (isCreatingTodo) {
      setTimeout(() => handleAdhocTimerComplete(), 100);
      return;
    }

    const { sessionId, linkedTodoId, linkedParentTodoId, linkedOccurrenceDate } = executionMode.adhocMode;
    const sessionStartTime = restoredStartTime || new Date(Date.now() - timerState.duration + timerState.remainingTime);
    const sessionEndTime = new Date();

    // 반복 할일 처리
    if (linkedParentTodoId && linkedOccurrenceDate && userId) {
      await TodoCompletionsService.markRecurrenceAsCompleted(
        linkedParentTodoId,
        userId,
        linkedOccurrenceDate,
        {
          actualStartTime: sessionStartTime.toISOString(),
          actualEndTime: sessionEndTime.toISOString(),
        }
      );

      if (linkedTodoId) {
        await removeAnytimeOverrideWithJWT({
          todoId: linkedTodoId,
          parentTodoId: linkedParentTodoId,
          occurrenceDate: linkedOccurrenceDate,
          userId,
        }).catch(() => {});
      }
    } else if (linkedTodoId) {
      await updateTodo(linkedTodoId, {
        completed: true,
        schedule_type: 'timed',
        start_time: sessionStartTime.toISOString(),
        end_time: sessionEndTime.toISOString(),
      });
    }

    if (sessionId) {
      await PomodoroSessionService.deleteSession(sessionId);
    }

    if (linkedTodoId || (linkedParentTodoId && linkedOccurrenceDate)) {
      stopPomodoroTimer();
      endAdhocMode();
      setSessionId(null);
      setLinkedTodo(null, null);
      setRestoredStartTime(null);
      setRestoredDuration(null);
      markCompleted('adhoc', 'direct');
      getNextRecommendation();
      return;
    }

    setInlineTodoInput('');
    setViewState('adhoc-capture');
  };

  // 인라인 할일 생성
  const handleCreateInlineTodo = async () => {
    if (!inlineTodoInput.trim() || !userId || isCreatingTodo) return;

    const { sessionId } = executionMode.adhocMode;
    const titleToSave = inlineTodoInput.trim();
    setInlineTodoInput('');

    await checkAndProceed('todo', async () => {
      setIsCreatingTodo(true);
      try {
        let startTime = new Date().toISOString();
        let endTime = startTime;

        if (sessionId) {
          const session = await PomodoroSessionService.getSession(sessionId);
          if (session) {
            startTime = session.start_time;
            endTime = new Date(new Date(session.start_time).getTime() + session.duration).toISOString();
          }
        }

        const newTodo = await createTodo({
          title: titleToSave,
          completed: false,
          schedule_type: 'timed',
          start_time: startTime,
          end_time: endTime,
          user_id: userId,
        });

        onCreateSuccess('todo');

        if (sessionId && newTodo?.id) {
          await PomodoroSessionService.linkTodo(sessionId, newTodo.id);
          setLinkedTodo(newTodo.id, titleToSave);
        }
      } catch (error) {
        console.error('할일 생성 실패:', error);
      } finally {
        setIsCreatingTodo(false);
      }
    });
  };

  // 연결된 할일 제목 수정
  const handleUpdateLinkedTodoTitle = async (newTitle: string) => {
    const { linkedTodoId } = executionMode.adhocMode;
    if (!linkedTodoId || !newTitle.trim()) return;

    await updateTodo(linkedTodoId, { title: newTitle.trim() });
    setLinkedTodo(linkedTodoId, newTitle.trim());
  };

  // 시간 조정
  const handleAdjustTime = useCallback(async (deltaMs: number) => {
    adjustTime(deltaMs);
    setTotalDuration(d => (d ?? 0) + deltaMs);

    const { sessionId, linkedTodoId } = executionMode.adhocMode;
    if (sessionId) {
      const session = await PomodoroSessionService.getSession(sessionId);
      if (!session) return;

      const newDuration = session.duration + deltaMs;
      await PomodoroSessionService.updateDuration(sessionId, newDuration);

      if (linkedTodoId) {
        const newEndTime = new Date(new Date(session.start_time).getTime() + newDuration).toISOString();
        await updateWithJWT('todos',
          { column: 'id', operator: 'eq', value: linkedTodoId },
          { end_time: newEndTime }
        );
      }
    }
  }, [adjustTime, executionMode.adhocMode]);

  // 일시정지/재개
  const handlePause = useCallback(() => {
    setPausedAt(Date.now());
    pauseTimer();
  }, [pauseTimer]);

  const handleResume = useCallback(async () => {
    if (pausedAt) {
      const pausedDuration = Date.now() - pausedAt;
      setTotalDuration(d => (d ?? 0) + pausedDuration);

      const { sessionId, linkedTodoId } = executionMode.adhocMode;
      if (sessionId) {
        const session = await PomodoroSessionService.getSession(sessionId);
        if (session) {
          const newDuration = session.duration + pausedDuration;
          await PomodoroSessionService.updateDuration(sessionId, newDuration);

          if (linkedTodoId) {
            const newEndTime = new Date(new Date(session.start_time).getTime() + newDuration).toISOString();
            await updateWithJWT('todos',
              { column: 'id', operator: 'eq', value: linkedTodoId },
              { end_time: newEndTime }
            );
          }
        }
      }
      setPausedAt(null);
    }
    resumeTimer();
  }, [resumeTimer, pausedAt, executionMode.adhocMode]);

  // 기록 저장
  const handleCaptureAdhocTodo = async () => {
    if (!adhocCaptureTitle.trim() || !userId) return;

    setIsAnimating(true);
    const sessionStartTime = restoredStartTime || new Date(Date.now() - timerState.duration + timerState.remainingTime);
    const sessionEndTime = new Date();

    const { linkedTodoId, sessionId } = executionMode.adhocMode;
    let todoIdForNote: string | null = null;

    if (linkedTodoId) {
      await updateTodo(linkedTodoId, {
        completed: true,
        schedule_type: 'timed',
        start_time: sessionStartTime.toISOString(),
        end_time: sessionEndTime.toISOString(),
      });
      todoIdForNote = linkedTodoId;
    } else {
      let wasBlocked = true;
      await checkAndProceed('todo', async () => {
        wasBlocked = false;
        const newTodo = await createTodo({
          title: adhocCaptureTitle.trim(),
          completed: true,
          schedule_type: 'timed',
          start_time: sessionStartTime.toISOString(),
          end_time: sessionEndTime.toISOString(),
          user_id: userId,
        });
        if (newTodo) {
          todoIdForNote = newTodo.id;
          onCreateSuccess('todo');
        }
      });
      // 한도 초과로 차단된 경우 이후 로직 중단
      if (wasBlocked) { setIsAnimating(false); return; }
    }

    if (sessionId) {
      await PomodoroSessionService.deleteSession(sessionId);
    }

    setAdhocCaptureTitle('');
    stopPomodoroTimer();
    endAdhocMode();
    setLinkedTodo(null, null);
    markCompleted('adhoc', 'direct');

    setTimeout(() => {
      setIsAnimating(false);
      if (todoIdForNote) {
        setCompletedTodoIdForNote(todoIdForNote);
        setSelectedNoteId(null);
        setNewNoteContent('');
        setNoteConnectionMode('select');
        getInboxNotes(userId);
        setViewState('adhoc-note-connection');
      } else {
        getNextRecommendation();
      }
    }, 300);
  };

  const handleSkipAdhocCapture = () => {
    setAdhocCaptureTitle('');
    stopPomodoroTimer();
    endAdhocMode();
    getNextRecommendation();
  };

  // 노트 연결
  const handleConnectNote = async () => {
    if (!completedTodoIdForNote || !userId) return;

    if (noteConnectionMode === 'select' && selectedNoteId) {
      await addTodoNote(completedTodoIdForNote, selectedNoteId, userId);
    } else if (noteConnectionMode === 'create' && newNoteContent.trim()) {
      const newNote = await createInboxNote({
        content: newNoteContent.trim(),
        linked_date: null,
        is_pinned: false,
      });
      if (newNote) await addTodoNote(completedTodoIdForNote, newNote.id, userId);
    }

    setCompletedTodoIdForNote(null);
    setSelectedNoteId(null);
    setNewNoteContent('');
    setRestoredStartTime(null);
    setRestoredDuration(null);
    getNextRecommendation();
  };

  const handleSkipNoteConnection = () => {
    setCompletedTodoIdForNote(null);
    setSelectedNoteId(null);
    setNewNoteContent('');
    setRestoredStartTime(null);
    setRestoredDuration(null);
    getNextRecommendation();
  };

  // 완료 화면에서 원동력 연결
  const handleConnectNoteFromCompleted = async (
    todoId: string,
    noteId: string | null,
    newContent?: string
  ) => {
    if (!userId) return;

    if (noteId) {
      await addTodoNote(todoId, noteId, userId);
    } else if (newContent?.trim()) {
      const newNote = await createInboxNote({
        content: newContent.trim(),
        linked_date: null,
        is_pinned: false,
      });
      if (newNote) await addTodoNote(todoId, newNote.id, userId);
    }
  };

  // 완료된 할일 제목 수정
  const handleUpdateCompletedTodoTitle = useCallback(async (todoId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    await updateTodo(todoId, { title: newTitle.trim() });
    setEditingCompletedTodoId(null);
  }, [updateTodo]);

  // 완료 취소
  const handleUncomplete = async (todoId: string) => {
    if (isAnimating) return;
    setIsAnimating(true);
    await toggleTodo(todoId);

    setTimeout(() => {
      setIsAnimating(false);
      const remaining = getTodayCompletedTodos().filter(t => t.id !== todoId);
      if (remaining.length === 0) setShowCompletedList(false);
      getNextRecommendation();
    }, 300);
  };

  // 포모도로 완료 감지
  useEffect(() => {
    const { adhocMode } = executionMode;
    if (adhocMode.isActive && timerState.status === 'completed') {
      handleAdhocTimerComplete();
    }
  }, [timerState.status, executionMode.adhocMode.isActive]);

  const { currentRecommendation, completedInSession } = executionMode;
  const todayCompletedTodos = getTodayCompletedTodos();

  return (
    <div className={`flex flex-col bg-base-100 ${hideNavigation ? 'min-h-full' : 'min-h-screen safe-area-top'}`}>
      {/* 헤더 */}
      <header className="p-4 flex items-center justify-between">
        {completedInSession > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="badge badge-primary badge-lg gap-1"
          >
            <PartyPopper className="w-4 h-4" />
            오늘 {completedInSession}개 완료!
          </motion.div>
        )}
      </header>

      {/* 개발환경 디버그 패널 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mb-4 bg-base-200 rounded-lg text-xs overflow-hidden">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full p-3 flex items-center justify-between hover:bg-base-300/50 transition-colors"
          >
            <span className="font-semibold">📋 추천 후보 목록 ({getTodayTodos().length}개)</span>
            {showDebugPanel ? <ChevronUp className="w-4 h-4 text-base-content/50" /> : <ChevronDown className="w-4 h-4 text-base-content/50" />}
          </button>

          <AnimatePresence>
            {showDebugPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <ul className="px-3 pb-3 space-y-1 max-h-40 overflow-y-auto">
                  {getTodayTodos().map(todo => (
                    <li key={todo.id} className="truncate">
                      • {todo.title}
                      {todo.scheduleType && <span className="text-base-content/50"> {getScheduleTypeLabel(todo.scheduleType)}</span>}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {viewState === 'recommendation' && currentRecommendation && (
            <RecommendationView
              key="recommendation"
              todo={currentRecommendation}
              awakeningSentence={awakeningSentence}
              isAnimating={isAnimating}
              onComplete={() => handleComplete('direct')}
              onStartPomodoroWithTodo={handleStartPomodoroWithTodo}
              onSkip={handleSkipClick}
              onDelete={handleDelete}
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {viewState === 'completed-all' && userId && (
            <CompletedAllView
              key="completed-all"
              completedCount={completedInSession}
              onExit={onExit}
              completedTodos={todayCompletedTodos.map(t => ({
                id: t.id,
                title: t.title,
                isRelationshipTask: t.isRelationshipTask
              }))}
              notes={allNotes.filter(n => n.note_category === 'motivation')}
              onConnectNote={handleConnectNoteFromCompleted}
              lastCompletedTodoId={
                todayCompletedTodos.length > 0
                  ? [...todayCompletedTodos].sort((a, b) =>
                      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )[0]?.id
                  : undefined
              }
            />
          )}

          {viewState === 'empty-state' && (
            <EmptyStateView
              key="empty-state"
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {viewState === 'distraction-plan' && (
            <DistractionPlanView
              key="distraction-plan"
              isLoading={false}
              userId={userId}
              onNext={handleEnvironmentSetupComplete}
              onSkip={handleEnvironmentSetupSkip}
            />
          )}

          {viewState === 'adhoc-timer' && (
            <AdhocTimerView
              key="adhoc-timer"
              timerState={timerState}
              onStop={handleStopAdhoc}
              onComplete={handleAdhocTimerComplete}
              onPause={handlePause}
              onResume={handleResume}
              onAdjustTime={handleAdjustTime}
              linkedTodoId={executionMode.adhocMode.linkedTodoId}
              linkedTodoTitle={executionMode.adhocMode.linkedTodoTitle}
              inlineTodoInput={inlineTodoInput}
              onInlineTodoInputChange={setInlineTodoInput}
              onCreateInlineTodo={handleCreateInlineTodo}
              onUpdateLinkedTodoTitle={handleUpdateLinkedTodoTitle}
              originalStartTime={restoredStartTime || undefined}
              originalDuration={restoredDuration || undefined}
              totalDuration={totalDuration}
              isPiPAvailable={isPiPAvailable}
              isPiPActive={isPiPActive}
              onStartPiP={startPiP}
              onStopPiP={stopPiP}
              timerDisplayMode={timerDisplayMode}
              onToggleDisplayMode={() => {
                setTimerDisplayMode(prev =>
                  prev === 'elapsed' ? 'remaining' : prev === 'remaining' ? 'both' : 'elapsed'
                );
              }}
            />
          )}

          {viewState === 'adhoc-capture' && (
            <AdhocCaptureView
              key="adhoc-capture"
              title={adhocCaptureTitle}
              onTitleChange={setAdhocCaptureTitle}
              onCapture={handleCaptureAdhocTodo}
              onSkip={handleSkipAdhocCapture}
              isAnimating={isAnimating}
            />
          )}

          {viewState === 'adhoc-note-connection' && (
            <AdhocNoteConnectionView
              key="adhoc-note-connection"
              notes={allNotes.filter(n => n.note_category === 'motivation')}
              selectedNoteId={selectedNoteId}
              onSelectNote={setSelectedNoteId}
              newNoteContent={newNoteContent}
              onNewNoteContentChange={setNewNoteContent}
              mode={noteConnectionMode}
              onModeChange={setNoteConnectionMode}
              onConnect={handleConnectNote}
              onSkip={handleSkipNoteConnection}
              isAnimating={isAnimating}
            />
          )}
        </AnimatePresence>
      </main>

      {/* 오늘 완료한 할일 목록 */}
      {todayCompletedTodos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 shadow-lg">
          <button
            onClick={() => setShowCompletedList(!showCompletedList)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-base-content/70">
              <Check className="w-4 h-4 text-success" />
              오늘 완료한 할일 ({todayCompletedTodos.length}개)
            </span>
            {showCompletedList ? <ChevronDown className="w-4 h-4 text-base-content/50" /> : <ChevronUp className="w-4 h-4 text-base-content/50" />}
          </button>

          <AnimatePresence>
            {showCompletedList && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <ul className="px-4 pb-4 max-h-48 overflow-y-auto space-y-2">
                  {todayCompletedTodos.map(todo => (
                    <li key={todo.id} className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2">
                      {editingCompletedTodoId === todo.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingCompletedTodoTitle}
                          onChange={(e) => setEditingCompletedTodoTitle(e.target.value)}
                          onBlur={() => {
                            if (editingCompletedTodoTitle.trim() && editingCompletedTodoTitle !== todo.title) {
                              handleUpdateCompletedTodoTitle(todo.id, editingCompletedTodoTitle);
                            }
                            setEditingCompletedTodoId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (editingCompletedTodoTitle.trim() && editingCompletedTodoTitle !== todo.title) {
                                handleUpdateCompletedTodoTitle(todo.id, editingCompletedTodoTitle);
                              }
                              setEditingCompletedTodoId(null);
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingCompletedTodoId(null);
                            }
                          }}
                          className="text-sm text-base-content/70 line-through bg-transparent border-none outline-none flex-1"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingCompletedTodoId(todo.id);
                            setEditingCompletedTodoTitle(todo.title);
                          }}
                          className="text-sm text-base-content/70 line-through truncate flex-1 cursor-pointer hover:opacity-70"
                        >
                          {todo.title}
                        </span>
                      )}
                      <button
                        onClick={() => handleUncomplete(todo.id)}
                        disabled={isAnimating}
                        className="btn btn-ghost btn-xs btn-circle ml-2 text-base-content/50 hover:text-warning"
                        title="완료 취소"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 그만할래 확인 모달 */}
      {showStopConfirmModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">미완료 할일이 있어요</h3>
            <p className="text-base-content/70 mb-4 text-center py-2 px-4 bg-base-200 rounded-lg">
              &ldquo;{executionMode.adhocMode.linkedTodoTitle}&rdquo;
            </p>
            <p className="text-sm text-base-content/60 mb-6">어떻게 할까요?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmStop('delete')}
                className="btn btn-ghost flex-1 rounded-full"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
              <button
                onClick={() => handleConfirmStop('keep')}
                className="btn btn-primary flex-1 rounded-full"
              >
                미완료 유지
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop bg-black/50">
            <button onClick={() => setShowStopConfirmModal(false)}>close</button>
          </form>
        </dialog>
      )}

      {/* 용량 제한 모달 */}
      {limitResult && (
        <UsageLimitModal
          isOpen={isLimitModalOpen}
          onClose={closeLimitModal}
          result={limitResult}
        />
      )}
    </div>
  );
}
