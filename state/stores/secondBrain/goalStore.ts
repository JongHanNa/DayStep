/**
 * Goal Store - 목표 관리
 * 여러 프로젝트를 묶는 큰 그림
 */

import { createStore } from '@/state/utils/storeUtils';
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/types/second-brain';
import {
  fetchGoalsWithJWT,
  createGoalWithJWT,
  updateGoalWithJWT,
  deleteGoalWithJWT,
} from '@/lib/supabase/goals';
import { queryRLSTableWithJWT } from '@/lib/supabase/core';

interface GoalStoreState {
  goals: Goal[];
  loading: boolean;
  error: string | null;

  // Actions - userId 파라미터 추가 (areaStore 패턴)
  fetchGoals: (userId: string) => Promise<void>;
  fetchArchivedGoals: (userId: string) => Promise<Goal[]>;
  createGoal: (userId: string, data: CreateGoalInput) => Promise<Goal>;
  updateGoal: (userId: string, id: string, data: UpdateGoalInput) => Promise<Goal>;
  deleteGoal: (userId: string, id: string) => Promise<boolean>;
  clearGoals: () => void;
}

export const useGoalStore = createStore<GoalStoreState>(
  (set, get) => ({
    goals: [],
    loading: false,
    error: null,

    fetchGoals: async (userId: string) => {
      try {
        set({ loading: true, error: null });

        const goals = await fetchGoalsWithJWT(userId);

        // goal_todo_stats에서 할일 통계 조회
        const stats = await queryRLSTableWithJWT('goal_todo_stats', [
          { column: 'user_id', operator: 'eq', value: userId }
        ]);

        // 통계 타입 정의
        interface GoalTodoStat {
          goal_id: string;
          total_todos: number;
          completed_todos: number;
          completion_rate: string;
        }

        // 통계를 Map으로 변환 (goal_id → stats)
        const statsMap = new Map<string, GoalTodoStat>(
          (stats || []).map((s: GoalTodoStat) => [s.goal_id, s])
        );

        // 목표에 실제 통계 병합
        const goalsWithProgress = goals.map((g) => {
          const stat = statsMap.get(g.id);
          return {
            ...g,
            total_todos: stat?.total_todos || 0,
            completed_todos: stat?.completed_todos || 0,
            progress: stat?.completion_rate ? parseFloat(stat.completion_rate) : 0,
          };
        });

        set({ goals: goalsWithProgress, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '목표를 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    fetchArchivedGoals: async (userId: string) => {
      try {
        const allGoals = await fetchGoalsWithJWT(userId);

        // goal_todo_stats에서 할일 통계 조회
        const stats = await queryRLSTableWithJWT('goal_todo_stats', [
          { column: 'user_id', operator: 'eq', value: userId }
        ]);

        // 통계 타입 정의
        interface GoalTodoStat {
          goal_id: string;
          total_todos: number;
          completed_todos: number;
          completion_rate: string;
        }

        // 통계를 Map으로 변환
        const statsMap = new Map<string, GoalTodoStat>(
          (stats || []).map((s: GoalTodoStat) => [s.goal_id, s])
        );

        // status가 'paused' 또는 'completed'인 목표만 필터링
        const archivedGoals = allGoals
          .filter((goal: Goal) => goal.status === 'paused' || goal.status === 'completed')
          .map((g) => {
            const stat = statsMap.get(g.id);
            return {
              ...g,
              total_todos: stat?.total_todos || 0,
              completed_todos: stat?.completed_todos || 0,
              progress: stat?.completion_rate ? parseFloat(stat.completion_rate) : 0,
            };
          });
        return archivedGoals;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '아카이브된 목표를 불러오는데 실패했습니다.',
        });
        return [];
      }
    },

    createGoal: async (userId: string, data: CreateGoalInput) => {
      try {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticGoal: Goal = {
          id: tempId,
          user_id: userId,
          ...data,
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ goals: [...get().goals, optimisticGoal] });

        // 실제 API 호출
        const newGoal = await createGoalWithJWT({
          ...data,
          user_id: userId,
        });

        // 실제 데이터로 교체
        set({
          goals: get().goals.map((goal: Goal) =>
            goal.id === tempId ? newGoal : goal
          ),
        });

        return newGoal;
      } catch (error) {
        // Rollback optimistic update
        set({ goals: get().goals.filter((goal: Goal) => !goal.id.startsWith('temp-')) });
        set({
          error: error instanceof Error ? error.message : '목표 생성에 실패했습니다.',
        });
        throw error;
      }
    },

    updateGoal: async (userId: string, id: string, data: UpdateGoalInput) => {
      try {
        // Optimistic update
        const previousGoals = get().goals;
        const updatedGoals = get().goals.map((goal: Goal) =>
          goal.id === id
            ? {
                ...goal,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : goal
        );

        set({ goals: updatedGoals });

        // 실제 API 호출
        const updatedGoal = await updateGoalWithJWT(id, userId, data);
        if (!updatedGoal) throw new Error('목표 업데이트에 실패했습니다.');

        // 실제 데이터로 교체
        set({
          goals: get().goals.map((goal: Goal) =>
            goal.id === id ? updatedGoal : goal
          ),
        });

        return updatedGoal;
      } catch (error) {
        // Rollback
        set({ goals: get().goals });
        set({
          error: error instanceof Error ? error.message : '목표 수정에 실패했습니다.',
        });
        throw error;
      }
    },

    deleteGoal: async (userId: string, id: string) => {
      try {
        // Optimistic update
        const previousGoals = get().goals;
        set({ goals: get().goals.filter((goal: Goal) => goal.id !== id) });

        // 실제 API 호출
        const success = await deleteGoalWithJWT(id, userId);
        if (!success) {
          throw new Error('목표 삭제에 실패했습니다.');
        }

        return true;
      } catch (error) {
        // Rollback
        set({ goals: get().goals });
        set({
          error: error instanceof Error ? error.message : '목표 삭제에 실패했습니다.',
        });
        throw error;
      }
    },

    // 로그아웃 시 스토어 초기화
    clearGoals: () => set({ goals: [], loading: false, error: null }),
  }),
  {
    name: 'goal-store',
    persist: {
      name: 'daystep-goals',
      version: 2, // 버전 업 (Mock → DB)
    },
  }
);
