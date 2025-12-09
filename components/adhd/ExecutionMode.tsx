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
  Loader2
} from 'lucide-react';
import { Todo } from '@/entities/todo/Todo';
import { useADHDModeStore, SkipReason } from '@/state/stores/adhdModeStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAuth } from '@/app/context/AuthContext';

interface ExecutionModeProps {
  onExit: () => void;
}

type ViewState = 'recommendation' | 'skip-reason' | 'completed-all';

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
  } = useADHDModeStore();

  const { todos, toggleTodo, deleteTodo } = useTodoStore();

  const [viewState, setViewState] = useState<ViewState>('recommendation');
  const [isAnimating, setIsAnimating] = useState(false);

  // 로딩 상태
  const isLoadingSkips = executionMode.isLoadingSkips;

  // 추천 가능한 명료화 유형: 일정(schedule_clear), 다음행동(next_action)
  const EXECUTABLE_CLARIFICATIONS = ['schedule_clear', 'next_action'];

  // 오늘 실행 가능한 할일만 필터링
  const getTodayTodos = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
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

  // 다음 추천 할일 가져오기
  const getNextRecommendation = useCallback(() => {
    const todayTodos = getTodayTodos();
    // Zustand getState()로 최신 상태 조회 (stale closure 방지)
    const { skippedTodoIds } = useADHDModeStore.getState().executionMode;

    // 건너뛴 할일 제외
    const candidates = todayTodos.filter(
      todo => !skippedTodoIds.includes(todo.id)
    );

    if (candidates.length === 0) {
      setViewState('completed-all');
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

    // ADHD Store 업데이트 및 학습 (DB 연동)
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
      // 기존 로직: 건너뛰기 + 학습 (DB 연동)
      await markSkipped(currentTodo.id, reason, userId);
      learnFromSkip(currentTodo, reason, userId);
    }

    // 다음 추천
    setTimeout(() => {
      setIsAnimating(false);
      getNextRecommendation();
    }, 300);
  };

  const { currentRecommendation, completedInSession } = executionMode;

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

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {/* 추천 화면 */}
          {viewState === 'recommendation' && currentRecommendation && (
            <RecommendationView
              key="recommendation"
              todo={currentRecommendation}
              awakeningSentence={awakeningSentence}
              isAnimating={isAnimating}
              onComplete={() => handleComplete('direct')}
              onAlternativeComplete={() => handleComplete('alternative')}
              onSkip={handleSkipClick}
              onDelete={() => handleSkipReason('not_needed')}
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
        </AnimatePresence>
      </main>
    </div>
  );
}

// ============================================
// 서브 컴포넌트들
// ============================================

interface RecommendationViewProps {
  todo: Todo;
  awakeningSentence: string | null;
  isAnimating: boolean;
  onComplete: () => void;
  onAlternativeComplete: () => void;
  onSkip: () => void;
  onDelete: () => void;
}

function RecommendationView({
  todo,
  awakeningSentence,
  isAnimating,
  onComplete,
  onAlternativeComplete,
  onSkip,
  onDelete,
}: RecommendationViewProps) {
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
