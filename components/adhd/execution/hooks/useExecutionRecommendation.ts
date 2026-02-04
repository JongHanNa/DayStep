'use client';

import { useCallback } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import type { Todo } from '@/entities/todo/Todo';

/**
 * 실행 모드 추천 로직 훅
 *
 * 오늘 할일 필터링, 추천 점수 계산, 다음 추천 로직을 제공합니다.
 */
export function useExecutionRecommendation() {
  const { todos } = useTodoStore();
  const { calculateRecommendationScore, setCurrentRecommendation } = useADHDModeStore();

  // 오늘 실행 가능한 할일만 필터링
  const getTodayTodos = useCallback((useLatestState: boolean = false) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 최신 상태가 필요하면 getState()로 직접 조회
    const currentTodos = useLatestState ? useTodoStore.getState().todos : todos;

    return currentTodos.filter(todo => {
      if (todo.completed) return false;

      // 오늘 날짜 또는 anytime인 할일만 추천
      if (todo.startTime) {
        const todoDate = new Date(todo.startTime);
        return todoDate >= today && todoDate < tomorrow;
      }

      if (todo.scheduleType === 'anytime') return true;

      return false;
    });
  }, [todos]);

  // 오늘 완료한 할일 필터링
  const getTodayCompletedTodos = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return todos.filter(todo => {
      if (!todo.completed) return false;

      // 오늘 업데이트된 완료 할일만
      const updatedDate = new Date(todo.updatedAt);
      return updatedDate >= today && updatedDate < tomorrow;
    });
  }, [todos]);

  // 다음 추천 할일 가져오기
  const getNextRecommendation = useCallback((
    onEmptyWithCompleted: () => void,
    onEmptyNoCompleted: () => void,
  ): Todo | null => {
    // 이미 타이머 실행 중이면 추천 건너뛰기
    const { adhocMode, skippedTodoIds, completedInSession } = useADHDModeStore.getState().executionMode;
    if (adhocMode.isActive) {
      return null;
    }

    // 최신 todos 상태 조회
    const todayTodos = getTodayTodos(true);

    // 건너뛴 할일 제외
    const candidates = todayTodos.filter(
      todo => !skippedTodoIds.includes(todo.id)
    );

    if (candidates.length === 0) {
      if (completedInSession > 0) {
        onEmptyWithCompleted();
      } else {
        onEmptyNoCompleted();
      }
      setCurrentRecommendation(null);
      return null;
    }

    // 점수 계산 및 정렬
    const scored = candidates.map(todo => ({
      todo,
      score: calculateRecommendationScore(todo),
    }));

    scored.sort((a, b) => b.score - a.score);

    const recommended = scored[0].todo;
    setCurrentRecommendation(recommended);
    return recommended;
  }, [getTodayTodos, calculateRecommendationScore, setCurrentRecommendation]);

  return {
    getTodayTodos,
    getTodayCompletedTodos,
    getNextRecommendation,
  };
}

export default useExecutionRecommendation;
