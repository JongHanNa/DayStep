'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  RefreshCw,
  ArrowLeft,
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
  Square
} from 'lucide-react';
import { Todo } from '@/entities/todo/Todo';
import { useADHDModeStore, SkipReason } from '@/state/stores/adhdModeStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNextActionContextStore } from '@/state/stores/secondBrain/nextActionContextStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { useAuth } from '@/app/context/AuthContext';

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
  } = useADHDModeStore();

  // 포모도로 스토어
  const {
    timerState,
    startTimer: startPomodoroTimer,
    stopTimer: stopPomodoroTimer,
    reset: resetPomodoroTimer,
  } = usePomodoroStore();

  const { todos, toggleTodo, deleteTodo, createTodo } = useTodoStore();
  const { contexts, loadContexts } = useNextActionContextStore();

  const [viewState, setViewState] = useState<ViewState>('recommendation');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCompletedList, setShowCompletedList] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false); // 기본적으로 접힌 상태
  const [adhocCaptureTitle, setAdhocCaptureTitle] = useState(''); // 즉흥 모드 완료 후 입력할 제목

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

  // 초기 추천 로드 (skip 로딩 완료 후)
  useEffect(() => {
    if (!isLoadingSkips) {
      getNextRecommendation();
    }
  }, [isLoadingSkips]);

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

  // "지금 떠오른 거 할래" 클릭
  const handleStartAdhoc = () => {
    startAdhocMode();
    startPomodoroTimer(); // 포모도로 시작 (기본 25분)
    setViewState('adhoc-timer');
  };

  // 포모도로 중단
  const handleStopAdhoc = () => {
    stopPomodoroTimer();
    resetPomodoroTimer();
    endAdhocMode();
    getNextRecommendation();
  };

  // 포모도로 완료 후 → 기록 화면으로
  const handleAdhocTimerComplete = () => {
    setViewState('adhoc-capture');
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
    resetPomodoroTimer();
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
    resetPomodoroTimer();
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
              onAlternativeComplete={() => handleComplete('alternative')}
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
  onAlternativeComplete: () => void;
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
  onAlternativeComplete,
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

        {/* 다른 방법으로 했어 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAlternativeComplete}
          disabled={isAnimating}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <RefreshCw className="w-5 h-5" />
          다른 방법으로 했어
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
          지금 떠오른 거 할래
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
        {/* 정리하러 가기 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onGoToOrganize}
          className="btn btn-primary btn-lg w-full rounded-full"
        >
          <ListTodo className="w-5 h-5" />
          정리하러 가기
        </motion.button>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-base-300" />
          <span className="text-xs text-base-content/40">또는</span>
          <div className="flex-1 h-px bg-base-300" />
        </div>

        {/* 즉흥 포모도로 버튼 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStartAdhoc}
          className="btn btn-ghost btn-md w-full rounded-full border border-base-300"
        >
          <Zap className="w-5 h-5" />
          지금 떠오른 거 할래
        </motion.button>
      </div>
    </motion.div>
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
}

function AdhocTimerView({ timerState, onStop }: AdhocTimerViewProps) {
  // 시간 포맷팅 (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 진행률 계산
  const progress = timerState.duration > 0
    ? ((timerState.duration - timerState.remainingTime) / timerState.duration) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-sm text-center"
    >
      {/* 타이머 원형 디스플레이 */}
      <div className="relative w-48 h-48 mx-auto mb-8">
        {/* 배경 원 */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-base-300"
          />
          {/* 진행 원 */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-primary"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>

        {/* 시간 표시 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-base-content">
            {formatTime(timerState.remainingTime)}
          </span>
          <span className="text-sm text-base-content/50 mt-1">
            {timerState.status === 'running' ? '집중 중...' : '일시정지'}
          </span>
        </div>
      </div>

      {/* 안내 문구 */}
      <p className="text-sm text-base-content/50 mb-8">
        끝나면 뭐 했는지 물어볼게요
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
