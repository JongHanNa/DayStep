/**
 * 용량 통계 Zustand Store
 *
 * 사용자의 엔티티별 용량 통계를 관리합니다.
 * - 실시간 카운트 추적
 * - Optimistic Update 지원
 * - 로컬 캐싱
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserUsageStats } from '@/lib/supabase/usage';
import type { UsageEntityType } from '@/lib/featureFlags';

/**
 * 용량 Store 상태 인터페이스
 */
interface UsageState {
  // 상태
  stats: UserUsageStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: string | null;

  // Actions
  setStats: (stats: UserUsageStats | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Optimistic Update (생성/삭제 시 즉시 반영)
  incrementCount: (entity: UsageEntityType) => void;
  decrementCount: (entity: UsageEntityType) => void;

  // 리셋
  reset: () => void;
}

/**
 * 엔티티 타입을 stats 필드명으로 매핑
 */
const entityToStatsField: Record<UsageEntityType, keyof UserUsageStats> = {
  todo: 'todoCount',
  habit: 'habitCount',
  project: 'projectCount',
  goal: 'goalCount',
  note: 'noteCount',
  area_resource: 'areaResourceCount',
  contact: 'contactCount',
};

/**
 * 초기 상태
 */
const initialState = {
  stats: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

/**
 * 용량 Store
 */
export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStats: (stats) =>
        set({
          stats,
          lastFetchedAt: new Date().toISOString(),
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      incrementCount: (entity) => {
        const { stats } = get();
        if (!stats) return;

        const field = entityToStatsField[entity];
        const currentValue = stats[field] as number;

        set({
          stats: {
            ...stats,
            [field]: currentValue + 1,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      decrementCount: (entity) => {
        const { stats } = get();
        if (!stats) return;

        const field = entityToStatsField[entity];
        const currentValue = stats[field] as number;

        set({
          stats: {
            ...stats,
            [field]: Math.max(0, currentValue - 1),
            updatedAt: new Date().toISOString(),
          },
        });
      },

      reset: () => set(initialState),
    }),
    {
      name: 'usage-store',
      partialize: (state) => ({
        stats: state.stats,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);
