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
  cachedUserId: string | null; // 캐시된 user_id 추적

  // Actions
  setStats: (stats: UserUsageStats | null, userId?: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // 사용자 변경 시 캐시 무효화
  invalidateIfUserChanged: (userId: string) => boolean;

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
  cachedUserId: null as string | null, // 캐시된 user_id 추적
};

/**
 * 용량 Store
 */
export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setStats: (stats, userId) =>
        set({
          stats,
          cachedUserId: userId || stats?.userId || null,
          lastFetchedAt: new Date().toISOString(),
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      /**
       * 사용자 변경 시 캐시 무효화
       * @returns true면 무효화됨 (다시 fetch 필요)
       */
      invalidateIfUserChanged: (userId) => {
        const { cachedUserId, stats } = get();

        // cachedUserId 또는 stats.userId로 캐시된 사용자 확인
        // (기존 캐시 데이터는 cachedUserId가 없을 수 있음)
        const cachedId = cachedUserId || stats?.userId;

        if (cachedId && cachedId !== userId) {
          console.log('📊 사용자 변경 감지 - 캐시 무효화:', { cached: cachedId, current: userId });
          set({
            stats: null,
            cachedUserId: null,
            lastFetchedAt: null,
            error: null,
          });
          return true;
        }
        return false;
      },

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
        cachedUserId: state.cachedUserId,
      }),
    }
  )
);
