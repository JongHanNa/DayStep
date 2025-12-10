'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Ban,
  Package,
  Frown,
  PartyPopper,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ListTodo,
  Zap,
  Play,
  Square,
  Timer
} from 'lucide-react';
import { Todo } from '@/entities/todo/Todo';
import { useADHDModeStore, SkipReason } from '@/state/stores/adhdModeStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNextActionContextStore } from '@/state/stores/secondBrain/nextActionContextStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { usePomodoro } from '@/hooks/usePomodoro';
// CircularSlider 라이브러리 제거 - 커스텀 구현 사용
import { useAuth } from '@/app/context/AuthContext';
import { PomodoroSessionService } from '@/services/pomodoro-session.service';

// 헬퍼 함수: 일정 유형 라벨
const getScheduleTypeLabel = (scheduleType: string): string => {
  const labelMap: Record<string, string> = {
    'anytime': '언제든지',
    'timed': '시간지정',
    'all_day': '종일',
  };
  return labelMap[scheduleType] || scheduleType;
};

// 헬퍼 함수: 쿨다운 남은 시간 계산
const getRemainingCooldown = (todoId: string, skipCooldowns: Record<string, string>): string | null => {
  const cooldownUntil = skipCooldowns[todoId];
  if (!cooldownUntil) return null;

  const remaining = new Date(cooldownUntil).getTime() - Date.now();
  if (remaining <= 0) return null;

  const minutes = Math.ceil(remaining / 60000);
  return `${minutes}분`;
};

interface ExecutionModeProps {
  onExit: () => void;
}

type ViewState = 'recommendation' | 'skip-reason' | 'completed-all' | 'empty-state' | 'adhoc-timer' | 'adhoc-capture';

/**
 * ADHD 실행 모드 화면
 *
 * 할일 목록을 숨기고 단일 할일만 추천하여
 * ADHD 사용자가 "지금 할 수 있는 가장 작은 것 하나"에 집중하도록 돕습니다.
 */
export default function ExecutionMode({ onExit }: ExecutionModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    executionMode,
    awakeningSentence,
    calculateRecommendationScore,
    setCurrentRecommendation,
    markCompleted,
    markSkipped,
    learnFromCompletion,
    learnFromSkip,
    startAdhocMode,
    endAdhocMode,
    enterOrganizeMode,
    setSessionId,
    setLinkedTodo,
  } = useADHDModeStore();

  // 포모도로 훅 (Web Worker 기반 실제 타이머)
  const {
    timerState,
    startTimer: startPomodoroTimer,
    stopTimer: stopPomodoroTimer,
    isWorkerReady,
  } = usePomodoro();

  // 포모도로 설정은 스토어에서
  const { settings: pomodoroSettings } = usePomodoroStore();

  const { todos, toggleTodo, deleteTodo, createTodo, updateTodo, fetchTodoById } = useTodoStore();
  const { contexts, loadContexts } = useNextActionContextStore();

  const [viewState, setViewState] = useState<ViewState>('recommendation');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false); // 기본적으로 접힌 상태
  const [adhocCaptureTitle, setAdhocCaptureTitle] = useState(''); // 즉흥 모드 완료 후 입력할 제목
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false); // 그만할래 확인 모달
  const [inlineTodoInput, setInlineTodoInput] = useState(''); // 타이머 진행 중 할일 입력
  const [restoredStartTime, setRestoredStartTime] = useState<Date | null>(null); // 세션 복원 시 원본 시작 시간
  const [restoredDuration, setRestoredDuration] = useState<number | null>(null); // 세션 복원 시 원본 duration
  const [isRestoringSession, setIsRestoringSession] = useState(true); // 세션 복원 확인 전까지 추천 로드 지연

  // 로딩 상태
  const isLoadingSkips = executionMode.isLoadingSkips;

  // 추천 가능한 명료화 유형: 일정(schedule_clear), 다음행동(next_action)
  const EXECUTABLE_CLARIFICATIONS = ['schedule_clear', 'next_action'];

  // 오늘 실행 가능한 할일만 필터링
  // useLatestState: true면 getState()로 최신 상태 조회, false면 렌더링 상태 사용
  const getTodayTodos = useCallback((useLatestState: boolean = false) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 최신 상태가 필요하면 getState()로 직접 조회 (stale closure 방지)
    const currentTodos = useLatestState ? useTodoStore.getState().todos : todos;

    return currentTodos.filter(todo => {
      if (todo.completed) return false;

      // 명료화 유형 필터: schedule_clear, next_action만 추천
      if (!EXECUTABLE_CLARIFICATIONS.includes(todo.clarification)) return false;

      // next_action은 날짜 무관하게 항상 추천
      if (todo.clarification === 'next_action') return true;

      // schedule_clear: 오늘 날짜 또는 anytime
      if (todo.startTime) {
        const todoDate = new Date(todo.startTime);
        return todoDate >= today && todoDate < tomorrow;
      }

      if (todo.scheduleType === 'anytime') return true;

      return false;
    });
  }, [todos]);

  // 오늘 완료한 할일 필터링 (updatedAt 기준 - 완료 시 갱신됨)
  const getTodayCompletedTodos = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (!todo.completed) return false;

      // 오늘 업데이트된 완료 할일만 (완료 시 updatedAt이 갱신됨)
      const updatedDate = new Date(todo.updatedAt);
      return updatedDate >= today && updatedDate < tomorrow;
    });
  }, [todos]);

  // 다음 추천 할일 가져오기
  const getNextRecommendation = useCallback(() => {
    // 이미 타이머 실행 중이면 추천 건너뛰기 (세션 복원 후 덮어쓰기 방지)
    const { adhocMode } = useADHDModeStore.getState().executionMode;
    if (adhocMode.isActive) {
      console.log('⏭️ 타이머 실행 중 - 추천 로드 건너뛰기');
      return;
    }

    // getState()로 최신 todos 상태 조회 (stale closure 방지)
    const todayTodos = getTodayTodos(true);
    // Zustand getState()로 최신 상태 조회 (stale closure 방지)
    const { skippedTodoIds } = useADHDModeStore.getState().executionMode;

    // 건너뛴 할일 제외
    const candidates = todayTodos.filter(
      todo => !skippedTodoIds.includes(todo.id)
    );

    if (candidates.length === 0) {
      // 세션 중 완료한 할일이 있으면 축하 화면, 없으면 빈 상태 안내
      const { completedInSession } = useADHDModeStore.getState().executionMode;
      setViewState(completedInSession > 0 ? 'completed-all' : 'empty-state');
      setCurrentRecommendation(null);
      return;
    }

    // 점수 계산 및 정렬
    const scored = candidates.map(todo => ({
      todo,
      score: calculateRecommendationScore(todo),
    }));

    scored.sort((a, b) => b.score - a.score);

    setCurrentRecommendation(scored[0].todo);
    setViewState('recommendation');
  }, [getTodayTodos, calculateRecommendationScore, setCurrentRecommendation]);

  // 다음행동 상황 데이터 로드
  useEffect(() => {
    if (userId && contexts.length === 0) {
      loadContexts(userId);
    }
  }, [userId, contexts.length, loadContexts]);

  // 초기 추천 로드 (skip 로딩 완료 + 세션 복원 확인 완료 후)
  useEffect(() => {
    // 세션 복원 확인이 끝난 후에만 추천 로드
    if (!isLoadingSkips && !isRestoringSession) {
      getNextRecommendation();
    }
  }, [isLoadingSkips, isRestoringSession]);

  // 활성 세션 복원 (뒤로가기 후 다시 진입 시)
  // Worker 준비 완료 후에만 실행 (Worker 미준비 시 startPomodoroTimer 무시됨)
  useEffect(() => {
    const restoreActiveSession = async () => {
      // userId 없으면 복원 불가 → 바로 완료 처리
      if (!userId) {
        setIsRestoringSession(false);
        return;
      }

      // Worker 미준비 시 대기 (isWorkerReady가 true 되면 재실행)
      if (!isWorkerReady) {
        return;
      }

      try {
        const activeSession = await PomodoroSessionService.getActiveSession(userId);
        if (activeSession && !activeSession.is_completed) {
          const originalStartTime = new Date(activeSession.start_time);
          const startTime = originalStartTime.getTime();
          const remaining = activeSession.duration - (Date.now() - startTime);

          if (remaining > 0) {
            console.log('🔄 활성 세션 복원:', { sessionId: activeSession.id, remaining });
            // 원본 시작 시간 및 duration 저장 (AdhocTimerView에서 사용)
            setRestoredStartTime(originalStartTime);
            setRestoredDuration(activeSession.duration);
            // 세션 상태 복원
            setSessionId(activeSession.id);
            startAdhocMode();
            startPomodoroTimer(remaining, 'POMODORO');
            setViewState('adhoc-timer');

            // 연결된 할일 복원
            if (activeSession.linked_todo_id) {
              const linkedTodo = await fetchTodoById(activeSession.linked_todo_id);
              if (linkedTodo) {
                setLinkedTodo(linkedTodo.id, linkedTodo.title);
              }
            }
          } else {
            // 시간 초과된 세션은 자동 완료 처리 (getActiveSession에서 처리됨)
            console.log('⏰ 만료된 세션 발견, 이미 처리됨');
          }
        }
      } catch (error) {
        console.error('❌ 세션 복원 실패:', error);
      } finally {
        // 복원 시도 완료 (성공/실패/세션 없음 무관)
        setIsRestoringSession(false);
      }
    };

    restoreActiveSession();
  }, [userId, isWorkerReady]);

  // "했어" 클릭
  const handleComplete = async (method: 'direct' | 'alternative') => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating || !userId) return;

    setIsAnimating(true);

    // 할일 완료 처리
    await toggleTodo(currentTodo.id);

    // ADHD Store 업데이트 및 학습 (DB 연동, fire and forget)
    markCompleted(currentTodo.id, method);
    learnFromCompletion(currentTodo, method, userId);

    // 애니메이션 후 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 500);
  };

  // "다른 거 추천해줘" 클릭
  const handleSkipClick = () => {
    setViewState('skip-reason');
  };

  // 사유 선택
  const handleSkipReason = async (reason: SkipReason) => {
    const currentTodo = executionMode.currentRecommendation;
    if (!currentTodo || isAnimating || !userId) return;

    setIsAnimating(true);

    // "필요 없는 할일"이면 삭제
    if (reason === 'not_needed') {
      // skippedTodoIds에 추가하여 즉시 추천 목록에서 제외
      await markSkipped(currentTodo.id, reason, userId);
      await deleteTodo(currentTodo.id);
    } else {
      // 기존 로직: 건너뛰기 + 학습 (DB 연동, fire and forget)
      await markSkipped(currentTodo.id, reason, userId);
      learnFromSkip(currentTodo, reason, userId);
    }

    // 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 완료 취소 핸들러
  const handleUncomplete = async (todoId: string) => {
    if (isAnimating) return;

    setIsAnimating(true);

    // 할일 완료 취소 처리 (toggleTodo는 완료 상태를 토글)
    await toggleTodo(todoId);

    // 다시 추천 목록에 포함되도록 다음 추천 갱신
    setTimeout(() => {
      setIsAnimating(false);
      // 완료된 목록이 비었으면 목록 닫기
      const remaining = getTodayCompletedTodos().filter(t => t.id !== todoId);
      if (remaining.length === 0) {
        setShowCompletedList(false);
      }
      getNextRecommendation();
    }, 300);
  };

  // === 즉흥 모드 핸들러 ===

  // "지금 떠오른거 타이머 켜고 할래" 클릭
  const handleStartAdhoc = async () => {
    if (!userId) return;

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000; // 25분 → ms

    // DB에 세션 생성
    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);
    } catch (error) {
      console.error('❌ 세션 생성 실패:', error);
      // 실패해도 타이머는 시작 (UX 우선)
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  };

  // "타이머 켜고 할래" 클릭 - 현재 추천된 할일과 연결된 포모도로 시작
  const handleStartPomodoroWithTodo = async () => {
    const currentTodo = executionMode.currentRecommendation;
    if (!userId || !currentTodo) return;

    startAdhocMode();
    const duration = pomodoroSettings.pomodoroDuration * 60 * 1000; // 25분 → ms

    // DB에 세션 생성
    try {
      const sessionId = await PomodoroSessionService.createSession(userId, duration);
      setSessionId(sessionId);

      // 현재 할일과 연결
      if (sessionId) {
        await PomodoroSessionService.linkTodo(sessionId, currentTodo.id);
        setLinkedTodo(currentTodo.id, currentTodo.title);
      }
    } catch (error) {
      console.error('❌ 세션 생성/연결 실패:', error);
      // 실패해도 타이머는 시작 (UX 우선)
    }

    startPomodoroTimer(duration, 'POMODORO');
    setViewState('adhoc-timer');
  };

  // 포모도로 중단 버튼 클릭
  const handleStopAdhoc = () => {
    const { linkedTodoId } = executionMode.adhocMode;

    if (linkedTodoId) {
      // 미완료 할일이 있으면 확인 모달 표시
      setShowStopConfirmModal(true);
    } else {
      // 없으면 바로 중단
      handleConfirmStop('delete');
    }
  };

  // 중단 확인 모달에서 선택
  const handleConfirmStop = async (action: 'delete' | 'keep') => {
    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    if (action === 'delete' && linkedTodoId) {
      // 미완료 할일 삭제
      try {
        await deleteTodo(linkedTodoId);
        console.log('🗑️ 미완료 할일 삭제됨:', linkedTodoId);
      } catch (error) {
        console.error('❌ 할일 삭제 실패:', error);
      }
    }
    // action === 'keep'이면 할일은 그대로 미완료 유지

    // DB 세션 삭제
    if (sessionId) {
      try {
        await PomodoroSessionService.deleteSession(sessionId);
      } catch (error) {
        console.error('❌ 세션 삭제 실패:', error);
      }
    }

    // 상태 초기화
    stopPomodoroTimer();
    endAdhocMode();
    setSessionId(null);
    setLinkedTodo(null, null);
    setShowStopConfirmModal(false);
    setInlineTodoInput('');

    getNextRecommendation();
  };

  // 포모도로 완료 후 → 기록 화면으로 (또는 바로 완료)
  const handleAdhocTimerComplete = async () => {
    const { sessionId, linkedTodoId } = executionMode.adhocMode;

    // DB 세션 완료 처리
    if (sessionId) {
      try {
        await PomodoroSessionService.completeSession(sessionId);
      } catch (error) {
        console.error('❌ 세션 완료 처리 실패:', error);
      }
    }

    // 연결된 할일이 있으면 완료 처리하고 바로 종료
    if (linkedTodoId) {
      try {
        await updateTodo(linkedTodoId, { completed: true });
        console.log('✅ 연결된 할일 완료 처리:', linkedTodoId);

        // 정리 및 다음으로
        stopPomodoroTimer();
        endAdhocMode();
        setSessionId(null);
        setLinkedTodo(null, null);
        markCompleted('adhoc', 'direct');
        getNextRecommendation();
        return;
      } catch (error) {
        console.error('❌ 할일 완료 처리 실패:', error);
      }
    }

    // 연결된 할일이 없으면 기록 화면으로
    setViewState('adhoc-capture');
  };

  // 타이머 진행 중 미완료 할일 생성
  const handleCreateInlineTodo = async () => {
    if (!inlineTodoInput.trim() || !userId) return;

    const { sessionId } = executionMode.adhocMode;

    try {
      // 미완료 할일 생성
      const newTodo = await createTodo({
        title: inlineTodoInput.trim(),
        completed: false,
        clarification: 'next_action',
        schedule_type: 'anytime',
        user_id: userId,
      });

      // 세션에 연결
      if (sessionId && newTodo?.id) {
        await PomodoroSessionService.linkTodo(sessionId, newTodo.id);
        setLinkedTodo(newTodo.id, inlineTodoInput.trim());
      }

      setInlineTodoInput('');
      console.log('✅ 미완료 할일 생성:', newTodo?.id);
    } catch (error) {
      console.error('❌ 미완료 할일 생성 실패:', error);
    }
  };

  // 연결된 할일 연결 해제
  const handleClearLinkedTodo = async () => {
    const { sessionId } = executionMode.adhocMode;

    if (sessionId) {
      try {
        await PomodoroSessionService.unlinkTodo(sessionId);
      } catch (error) {
        console.error('❌ 할일 연결 해제 실패:', error);
      }
    }

    setLinkedTodo(null, null);
  };

  // 할일 기록하기
  const handleCaptureAdhocTodo = async () => {
    if (!adhocCaptureTitle.trim() || !userId) return;

    setIsAnimating(true);

    // 완료된 할일로 저장
    await createTodo({
      title: adhocCaptureTitle.trim(),
      completed: true,
      clarification: 'next_action',
      schedule_type: 'anytime',
      user_id: userId,
    });

    // 정리
    setAdhocCaptureTitle('');
    stopPomodoroTimer(); // 타이머 정지 및 리셋
    endAdhocMode();
    markCompleted('adhoc', 'direct'); // 세션 완료 수 증가

    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  // 기록 스킵
  const handleSkipAdhocCapture = () => {
    setAdhocCaptureTitle('');
    stopPomodoroTimer(); // 타이머 정지 및 리셋
    endAdhocMode();
    getNextRecommendation();
  };

  // 정리하기 모드로 이동
  const handleGoToOrganize = () => {
    enterOrganizeMode();
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
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* 헤더 */}
      <header className="p-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

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

        <div className="w-10" /> {/* 균형을 위한 빈 공간 */}
      </header>

      {/* 개발환경 디버그 패널 (아코디언) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mb-4 bg-base-200 rounded-lg text-xs overflow-hidden">
          {/* 아코디언 헤더 */}
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full p-3 flex items-center justify-between hover:bg-base-300/50 transition-colors"
          >
            <span className="font-semibold">📋 추천 후보 목록 ({getTodayTodos().length}개)</span>
            {showDebugPanel ? (
              <ChevronUp className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            )}
          </button>

          {/* 아코디언 내용 */}
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
                  {getTodayTodos().map(todo => {
                    // 다음행동 상황 이름 가져오기
                    const contextNames = todo.nextActionContextIds
                      ?.map(id => contexts.find(c => c.id === id)?.title)
                      .filter(Boolean)
                      .join(', ') || '';

                    // 쿨다운 남은 시간
                    const cooldown = getRemainingCooldown(todo.id, executionMode.skipCooldowns);

                    return (
                      <li key={todo.id} className="truncate">
                        • {todo.title}
                        {todo.clarification === 'next_action' && contextNames && (
                          <span className="text-info text-base-content/50"> @{contextNames}</span>
                        )}
                        {todo.clarification === 'schedule_clear' && todo.scheduleType && (
                          <span className="text-base-content/50"> {getScheduleTypeLabel(todo.scheduleType)}</span>
                        )}
                        {cooldown && (
                          <span className="text-warning ml-1">⏳{cooldown}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* 추천 화면 */}
          {viewState === 'recommendation' && currentRecommendation && (
            <RecommendationView
              key="recommendation"
              todo={currentRecommendation}
              contexts={contexts}
              awakeningSentence={awakeningSentence}
              isAnimating={isAnimating}
              onComplete={() => handleComplete('direct')}
              onStartPomodoroWithTodo={handleStartPomodoroWithTodo}
              onSkip={handleSkipClick}
              onDelete={() => handleSkipReason('not_needed')}
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {/* 사유 선택 화면 */}
          {viewState === 'skip-reason' && (
            <SkipReasonView
              key="skip-reason"
              onSelect={handleSkipReason}
              onCancel={() => setViewState('recommendation')}
            />
          )}

          {/* 모두 완료 화면 */}
          {viewState === 'completed-all' && (
            <CompletedAllView
              key="completed-all"
              completedCount={completedInSession}
              onExit={onExit}
            />
          )}

          {/* 빈 상태 화면 (할일 없음) */}
          {viewState === 'empty-state' && (
            <EmptyStateView
              key="empty-state"
              onGoToOrganize={handleGoToOrganize}
              onStartAdhoc={handleStartAdhoc}
            />
          )}

          {/* 즉흥 포모도로 타이머 화면 */}
          {viewState === 'adhoc-timer' && (
            <AdhocTimerView
              key="adhoc-timer"
              timerState={timerState}
              onStop={handleStopAdhoc}
              onComplete={handleAdhocTimerComplete}
              linkedTodoId={executionMode.adhocMode.linkedTodoId}
              linkedTodoTitle={executionMode.adhocMode.linkedTodoTitle}
              inlineTodoInput={inlineTodoInput}
              onInlineTodoInputChange={setInlineTodoInput}
              onCreateInlineTodo={handleCreateInlineTodo}
              onClearLinkedTodo={handleClearLinkedTodo}
              originalStartTime={restoredStartTime || undefined}
              originalDuration={restoredDuration || undefined}
            />
          )}

          {/* 즉흥 완료 후 기록 화면 */}
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
        </AnimatePresence>
      </main>

      {/* 오늘 완료한 할일 목록 (하단 고정) */}
      {todayCompletedTodos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 shadow-lg">
          {/* 토글 버튼 */}
          <button
            onClick={() => setShowCompletedList(!showCompletedList)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-base-content/70">
              <Check className="w-4 h-4 text-success" />
              오늘 완료한 할일 ({todayCompletedTodos.length}개)
            </span>
            {showCompletedList ? (
              <ChevronDown className="w-4 h-4 text-base-content/50" />
            ) : (
              <ChevronUp className="w-4 h-4 text-base-content/50" />
            )}
          </button>

          {/* 완료 목록 */}
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
                    <li
                      key={todo.id}
                      className="flex items-center justify-between bg-base-200 rounded-lg px-3 py-2"
                    >
                      <span className="text-sm text-base-content/70 line-through truncate flex-1">
                        {todo.title}
                      </span>
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

      {/* 그만할래 확인 모달 (미완료 할일 있을 때) */}
      {showStopConfirmModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-2">미완료 할일이 있어요</h3>
            <p className="text-base-content/70 mb-4 text-center py-2 px-4 bg-base-200 rounded-lg">
              &ldquo;{executionMode.adhocMode.linkedTodoTitle}&rdquo;
            </p>
            <p className="text-sm text-base-content/60 mb-6">
              어떻게 할까요?
            </p>
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
    </div>
  );
}

// ============================================
// 서브 컴포넌트들
// ============================================

interface NextActionContextItem {
  id: string;
  title: string;
}

interface RecommendationViewProps {
  todo: Todo;
  contexts: NextActionContextItem[];
  awakeningSentence: string | null;
  isAnimating: boolean;
  onComplete: () => void;
  onStartPomodoroWithTodo: () => void;
  onSkip: () => void;
  onDelete: () => void;
  onStartAdhoc: () => void;
}

function RecommendationView({
  todo,
  contexts,
  awakeningSentence,
  isAnimating,
  onComplete,
  onStartPomodoroWithTodo,
  onSkip,
  onDelete,
  onStartAdhoc,
}: RecommendationViewProps) {
  // 다음행동 상황 이름 가져오기
  const getContextNames = (contextIds: string[] | null): string => {
    if (!contextIds || contextIds.length === 0) return '';
    return contextIds
      .map(id => contexts.find(c => c.id === id)?.title)
      .filter(Boolean)
      .join(', ');
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      {/* 안내 문구 */}
      <p className="text-base-content/60 mb-4">
        지금 할 수 있는 가장 작은 것 하나:
      </p>

      {/* 할일 제목 */}
      <motion.div
        key={todo.id}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-base-200 rounded-2xl p-6 mb-8"
      >
        <h2 className="text-2xl font-bold text-base-content leading-relaxed">
          {todo.title}
        </h2>

        {/* 속성 정보: 다음행동 상황 또는 일정 유형 */}
        {(todo.clarification === 'next_action' && todo.nextActionContextIds) ||
         (todo.clarification === 'schedule_clear' && todo.scheduleType) ? (
          <div className="text-sm text-base-content/60 mt-3 flex items-center justify-center gap-2">
            {todo.clarification === 'next_action' && todo.nextActionContextIds && (
              <span>@{getContextNames(todo.nextActionContextIds)}</span>
            )}
            {todo.clarification === 'schedule_clear' && todo.scheduleType && (
              <span>{getScheduleTypeLabel(todo.scheduleType)}</span>
            )}
          </div>
        ) : null}
      </motion.div>

      {/* 버튼들 */}
      <div className="flex flex-col gap-3">
        {/* 했어 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onComplete}
          disabled={isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Check className="w-6 h-6" />
          했어
        </motion.button>

        {/* 타이머 켜고 할래 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartPomodoroWithTodo}
          disabled={isAnimating}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <Timer className="w-5 h-5" />
          타이머 켜고 할래
        </motion.button>

        {/* 다른 거 추천해줘 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/60"
        >
          다른 거 추천해줘
        </motion.button>

        {/* 필요 없는 할일 삭제 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDelete}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-error/60"
        >
          <Trash2 className="w-4 h-4" />
          필요 없는 할일이야
        </motion.button>

        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-primary/70 mt-4"
        >
          <Zap className="w-4 h-4" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>
      </div>

      {/* 각성 문장 */}
      {awakeningSentence && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-sm text-base-content/40 italic"
        >
          &ldquo;{awakeningSentence}&rdquo;
        </motion.p>
      )}
    </motion.div>
  );
}

interface SkipReasonViewProps {
  onSelect: (reason: SkipReason) => void;
  onCancel: () => void;
}

function SkipReasonView({ onSelect, onCancel }: SkipReasonViewProps) {
  const reasons: { reason: SkipReason; icon: React.ReactNode; label: string }[] = [
    { reason: 'not_now', icon: <Ban className="w-5 h-5" />, label: '지금 상황에 안 맞아' },
    { reason: 'too_big', icon: <Package className="w-5 h-5" />, label: '너무 큰 일이야' },
    { reason: 'not_feeling', icon: <Frown className="w-5 h-5" />, label: '기분이 안 나' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-sm"
    >
      <h3 className="text-lg font-semibold text-center mb-6">
        왜 다른 거 할래?
      </h3>

      <div className="flex flex-col gap-3">
        {reasons.map(({ reason, icon, label }) => (
          <motion.button
            key={reason}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(reason)}
            className="btn btn-ghost btn-lg w-full rounded-2xl justify-start gap-3 border border-base-300"
          >
            {icon}
            {label}
          </motion.button>
        ))}

        <button
          onClick={onCancel}
          className="btn btn-ghost btn-sm mt-4 text-base-content/50"
        >
          취소
        </button>
      </div>
    </motion.div>
  );
}

interface CompletedAllViewProps {
  completedCount: number;
  onExit: () => void;
}

function CompletedAllView({ completedCount, onExit }: CompletedAllViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        animate={{
          rotate: [0, -10, 10, -10, 10, 0],
        }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <PartyPopper className="w-20 h-20 mx-auto text-primary mb-6" />
      </motion.div>

      <h2 className="text-2xl font-bold text-base-content mb-2">
        대단해요!
      </h2>

      <p className="text-base-content/60 mb-8">
        {completedCount > 0
          ? `오늘 ${completedCount}개를 실행했어요.`
          : '오늘 할 일을 모두 처리했어요!'}
      </p>

      <button
        onClick={onExit}
        className="btn btn-primary btn-lg rounded-full px-8"
      >
        나가기
      </button>
    </motion.div>
  );
}

// ============================================
// 빈 상태 화면 (할일 없음)
// ============================================

interface EmptyStateViewProps {
  onGoToOrganize: () => void;
  onStartAdhoc: () => void;
}

function EmptyStateView({ onGoToOrganize, onStartAdhoc }: EmptyStateViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <ListTodo className="w-16 h-16 mx-auto text-base-content/30 mb-6" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        할일이 없네요
      </h2>

      <p className="text-base-content/60 mb-8">
        정리하기로 할일을 먼저 만들어볼까요?
      </p>

      <div className="flex flex-col gap-3">
        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <Zap className="w-5 h-5" />
          지금 떠오른거 타이머 켜고 할래
        </motion.button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-base-300" />
          <span className="text-xs text-base-content/40">또는</span>
          <div className="flex-1 h-px bg-base-300" />
        </div>

        {/* 정리하러 가기 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoToOrganize}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <ListTodo className="w-5 h-5" />
          정리하러 가기
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================
// 커스텀 원형 프로그레스 슬라이더
// ============================================

interface CircularProgressSliderProps {
  size: number;
  progress: number; // 0-1
  onDragProgress: (progress: number) => void;
  onDragEnd: (finalProgress: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

function CircularProgressSlider({
  size,
  progress,
  onDragProgress,
  onDragEnd,
  isDragging,
  setIsDragging,
}: CircularProgressSliderProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // SVG 설정 (280px 기준 1.4배 확대)
  const strokeWidth = 34;
  const radius = (size - strokeWidth) / 2 - 4;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // 애니메이션 값 - 각도 (0-360)
  const baseAngle = progress * 360;
  const angle = useMotionValue(baseAngle);
  const springAngle = useSpring(angle, {
    stiffness: 200,  // 부드러운 탄성
    damping: 25,
    mass: 0.5
  });

  // 타이머 진행에 따라 각도 업데이트 (드래그 중이 아닐 때만)
  // isDraggingRef.current로 동기적 체크 (React state는 비동기라 타이밍 이슈 방지)
  useEffect(() => {
    if (!isDraggingRef.current) {
      angle.set(progress * 360);
    }
  }, [progress, angle]);

  // strokeDashoffset 계산
  const strokeDashoffset = useTransform(
    springAngle,
    [0, 360],
    [circumference, 0]
  );

  // 노브 위치 계산 (12시 방향에서 시작, 시계방향)
  // 캡슐 모양: 트랙 위에 놓여있음 (중심선 유지)
  const knobWidth = 56;
  const knobHeight = 28;
  const knobX = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.cos(rad) - knobWidth / 2;
  });
  const knobY = useTransform(springAngle, (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return center + radius * Math.sin(rad) - knobHeight / 2;
  });
  // 노브 회전 (트랙 접선 방향)
  const knobRotation = useTransform(springAngle, (a) => a);

  // 마지막 유효한 각도 저장 (반시계방향 차단용)
  const lastValidAngle = React.useRef(baseAngle);

  // 드래그 상태 동기적 관리 (React state는 비동기이므로 ref로 즉시 체크)
  const isDraggingRef = React.useRef(false);

  // 포인터 위치에서 각도 계산
  const getAngleFromPoint = (clientX: number, clientY: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;
    return deg;
  };

  // 포인터 이동 핸들러
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) {
      return;
    }

    const newAngle = getAngleFromPoint(e.clientX, e.clientY);
    const currentAngle = lastValidAngle.current;

    // 360° 래핑 감지: 95% 이상(342°)에서 0° 근처(30° 미만)로 이동하면 완료
    if (currentAngle > 342 && newAngle < 30) {
      isDraggingRef.current = false;
      setIsDragging(false);
      onDragEnd(1.0);
      return;
    }

    // 역방향 래핑 감지: 0° 근처에서 360° 근처로 이동하면 반시계방향으로 차단
    if (currentAngle < 30 && newAngle > 330) {
      return;
    }

    // 반시계방향 드래그 차단
    const angleDiff = newAngle - currentAngle;
    const normalizedDiff = angleDiff > 180 ? angleDiff - 360 :
      angleDiff < -180 ? angleDiff + 360 : angleDiff;

    // 반시계방향으로 30도 이상 이동하면 차단
    if (normalizedDiff < -30) {
      return;
    }

    // 유효한 이동만 허용
    if (normalizedDiff >= 0 || Math.abs(normalizedDiff) < 30) {
      lastValidAngle.current = newAngle;
      angle.set(newAngle);
      onDragProgress(newAngle / 360);
    }
  };

  // 포인터 다운 핸들러 (드래그 시작)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    setIsDragging(true);
    lastValidAngle.current = angle.get();
  };

  // 포인터 업 핸들러 (드래그 종료)
  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);

    const finalAngle = angle.get();
    const finalProgress = finalAngle / 360;

    isDraggingRef.current = false;
    setIsDragging(false);
    onDragEnd(finalProgress);

    // 95% 미만이면 원래 위치로 스프링 애니메이션
    if (finalProgress < 0.95) {
      angle.set(progress * 360);
      lastValidAngle.current = progress * 360;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 배경 트랙 - 연보라색 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e0e7ff"
          strokeWidth={strokeWidth}
        />

        {/* 프로그레스 아크 - 보라색 */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset }}
        />
      </svg>

      {/* 노브 - 투명 + 화살표 */}
      <motion.div
        className="absolute rounded-full bg-transparent pointer-events-none flex items-center justify-center"
        style={{
          width: knobWidth,
          height: knobHeight,
          left: 0,
          top: 0,
          x: knobX,
          y: knobY,
          rotate: knobRotation,
        }}
      >
        <ArrowRight className="w-6 h-6 text-violet-600" />
      </motion.div>

      {/* 투명 드래그 핸들 - 전체 원 영역 (Pointer Events 사용) */}
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing rounded-full"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}

// ============================================
// 즉흥 포모도로 타이머 화면
// ============================================

interface AdhocTimerViewProps {
  timerState: {
    status: 'idle' | 'running' | 'paused' | 'completed';
    remainingTime: number;
    duration: number;
  };
  onStop: () => void;
  onComplete: () => void;
  // 미완료 할일 관련 props
  linkedTodoId: string | null;
  linkedTodoTitle: string | null;
  inlineTodoInput: string;
  onInlineTodoInputChange: (value: string) => void;
  onCreateInlineTodo: () => void;
  onClearLinkedTodo: () => void;
  // 세션 복원 시 원본 시작 시간 (없으면 현재 시간 사용)
  originalStartTime?: Date;
  // 세션 복원 시 원본 duration (없으면 timerState.duration 사용)
  originalDuration?: number;
}

function AdhocTimerView({
  timerState,
  onStop,
  onComplete,
  linkedTodoId,
  linkedTodoTitle,
  inlineTodoInput,
  onInlineTodoInputChange,
  onCreateInlineTodo,
  onClearLinkedTodo,
  originalStartTime,
  originalDuration,
}: AdhocTimerViewProps) {
  const [isDragging, setIsDragging] = useState(false);

  // 타이머 시작 시점 (세션 복원 시 원본 시간 사용, 아니면 현재 시간)
  const [startedAt] = useState(() => originalStartTime || new Date());

  // 원본 duration (세션 복원 시 DB의 duration, 아니면 timerState.duration)
  const effectiveDuration = originalDuration || timerState.duration;

  // 시간 포맷팅 (mm:ss) - 밀리초를 초로 변환
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 시간 포맷팅 (HH:mm) - 시작/종료 시간용
  const formatTimeHHMM = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // 종료 예정 시간 계산 (원본 duration 사용)
  const endTime = new Date(startedAt.getTime() + effectiveDuration);

  // 진행률 계산 (0-1) - 원본 duration 기준으로 계산
  const progress = effectiveDuration > 0
    ? (effectiveDuration - timerState.remainingTime) / effectiveDuration
    : 0;

  // 타이머 자연 완료 감지
  useEffect(() => {
    if (timerState.remainingTime <= 0 && timerState.status === 'running') {
      onComplete();
    }
  }, [timerState.remainingTime, timerState.status, onComplete]);

  // 드래그 중 진행률 업데이트
  const handleDragProgress = () => {
    // 드래그 중에는 UI 피드백만 제공 (실제 타이머는 변경하지 않음)
  };

  // 드래그 종료 처리
  const handleDragEnd = (finalProgress: number) => {
    // 95% 이상이면 완료 처리
    if (finalProgress >= 0.95) {
      onComplete();
    }
    // 95% 미만이면 CircularProgressSlider가 자동으로 스냅백 처리
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-sm text-center"
    >
      {/* 포커스 제목 */}
      <h2 className="text-2xl font-bold text-base-content mb-1">포커스</h2>

      {/* 시작 → 종료 시간 */}
      <p className="text-base text-base-content/60 mb-6">
        {formatTimeHHMM(startedAt)} → {formatTimeHHMM(endTime)}
      </p>

      {/* 타이머 원형 디스플레이 (280px, 1.4배 확대) */}
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

      {/* 시간 표시 - 원 아래 */}
      <div className="text-center mb-4">
        <span className="text-4xl font-bold text-base-content">
          {formatTime(timerState.remainingTime)}
        </span>
      </div>

      {/* 미완료 할일 입력 또는 표시 */}
      <div className="mb-4 px-4">
        {!linkedTodoId ? (
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-base-200 rounded-xl gap-2"
          >
            <span className="text-sm font-medium text-base-content flex-1 text-center px-2 break-words">
              {linkedTodoTitle}
            </span>
            <button
              onClick={onClearLinkedTodo}
              className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
            >
              ✕
            </button>
          </motion.div>
        )}
      </div>

      {/* 안내 문구 */}
      <p className="text-sm text-base-content/50 mb-8">
        {linkedTodoId ? (
          <>드래그해서 완료할 수 있어요</>
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

// ============================================
// 즉흥 완료 후 기록 화면
// ============================================

interface AdhocCaptureViewProps {
  title: string;
  onTitleChange: (title: string) => void;
  onCapture: () => void;
  onSkip: () => void;
  isAnimating: boolean;
}

function AdhocCaptureView({
  title,
  onTitleChange,
  onCapture,
  onSkip,
  isAnimating,
}: AdhocCaptureViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm text-center"
    >
      <Check className="w-16 h-16 mx-auto text-success mb-4" />

      <h2 className="text-xl font-bold text-base-content mb-2">
        뭐 했어요?
      </h2>

      <p className="text-base-content/60 mb-6">
        방금 한 일을 기록해두면 나중에 도움이 돼요
      </p>

      {/* 입력 필드 */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="방금 한 일을 한 줄로"
        className="input input-bordered w-full rounded-xl mb-6 text-center"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onCapture();
          }
        }}
      />

      <div className="flex flex-col gap-3">
        {/* 기록할게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCapture}
          disabled={!title.trim() || isAnimating}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          기록할게
        </motion.button>

        {/* 그냥 넘어갈게 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSkip}
          disabled={isAnimating}
          className="btn btn-ghost btn-sm w-full rounded-full text-base-content/50"
        >
          그냥 넘어갈게
        </motion.button>
      </div>
    </motion.div>
  );
}
