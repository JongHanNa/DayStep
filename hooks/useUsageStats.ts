/**
 * 용량 통계 Hook
 *
 * 용량 조회, 생성 가능 여부 체크, 경고/차단 상태 관리
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useUsageStore } from '@/state/stores/usageStore';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/app/context/AuthContext';
import { getOrInitializeUserUsageStats, type UserUsageStats } from '@/lib/supabase/usage';
import { FEATURE_FLAGS, FREE_TIER_LIMITS, ENTITY_LIMIT_MAP, ENTITY_DISPLAY_NAME, type UsageEntityType } from '@/lib/featureFlags';

/**
 * 생성 가능 여부 결과
 */
export interface CanCreateResult {
  /** 생성 허용 여부 */
  allowed: boolean;
  /** 현재 개수 */
  current: number;
  /** 제한 개수 */
  limit: number;
  /** 사용률 (%) */
  percentage: number;
  /** 경고 상태 (80% 이상) */
  warning: boolean;
  /** 차단 상태 (100% 이상) */
  blocked: boolean;
  /** 엔티티 한글명 */
  displayName: string;
}

/**
 * 사용량 요약 (배너 표시용)
 */
export interface UsageSummary {
  entity: UsageEntityType;
  displayName: string;
  current: number;
  limit: number;
  percentage: number;
  warning: boolean;
  blocked: boolean;
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
 * 용량 통계 Hook
 */
export function useUsageStats() {
  const { stats, isLoading, error, setStats, setLoading, setError, incrementCount, decrementCount } =
    useUsageStore();
  const { hasActiveSubscription } = useSubscription();
  const { user } = useAuth();

  /**
   * 용량 통계 조회
   */
  const fetchStats = useCallback(async () => {
    // 결제 비활성화 시 조회 불필요
    if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
      return;
    }

    if (!user?.id) {
      console.log('📊 용량 조회 스킵 - 로그인 필요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getOrInitializeUserUsageStats(user.id);
      setStats(data);
    } catch (err: any) {
      console.error('📊 용량 조회 실패:', err);
      setError(err.message || '용량 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [user?.id, setStats, setLoading, setError]);

  /**
   * 로그인 시 자동 조회
   */
  useEffect(() => {
    if (user?.id && !stats) {
      fetchStats();
    }
  }, [user?.id, stats, fetchStats]);

  /**
   * 생성 가능 여부 체크
   */
  const canCreate = useCallback(
    (entity: UsageEntityType): CanCreateResult => {
      const limit = ENTITY_LIMIT_MAP[entity];
      const displayName = ENTITY_DISPLAY_NAME[entity];

      // Pro 사용자는 무제한
      if (hasActiveSubscription) {
        return {
          allowed: true,
          current: 0,
          limit: Infinity,
          percentage: 0,
          warning: false,
          blocked: false,
          displayName,
        };
      }

      // 통계가 없으면 허용 (로딩 중이거나 에러)
      if (!stats) {
        return {
          allowed: true,
          current: 0,
          limit,
          percentage: 0,
          warning: false,
          blocked: false,
          displayName,
        };
      }

      const field = entityToStatsField[entity];
      const current = (stats[field] as number) || 0;
      const percentage = Math.round((current / limit) * 100);
      const warning = percentage >= FREE_TIER_LIMITS.WARNING_THRESHOLD;
      const blocked = current >= limit;

      return {
        allowed: !blocked,
        current,
        limit,
        percentage,
        warning,
        blocked,
        displayName,
      };
    },
    [stats, hasActiveSubscription]
  );

  /**
   * 전체 사용량 요약 (경고/차단 상태만)
   */
  const usageSummary = useMemo((): UsageSummary[] => {
    // Pro 사용자는 빈 배열
    if (hasActiveSubscription) {
      return [];
    }

    if (!stats) {
      return [];
    }

    const entities: UsageEntityType[] = [
      'todo',
      'habit',
      'project',
      'goal',
      'note',
      'area_resource',
      'contact',
    ];

    return entities
      .map((entity) => {
        const result = canCreate(entity);
        return {
          entity,
          displayName: result.displayName,
          current: result.current,
          limit: result.limit,
          percentage: result.percentage,
          warning: result.warning,
          blocked: result.blocked,
        };
      })
      .filter((item) => item.warning || item.blocked);
  }, [stats, hasActiveSubscription, canCreate]);

  /**
   * 경고/차단 상태의 엔티티가 있는지
   */
  const hasWarningOrBlocked = useMemo(() => {
    return usageSummary.length > 0;
  }, [usageSummary]);

  /**
   * 차단된 엔티티가 있는지
   */
  const hasBlocked = useMemo(() => {
    return usageSummary.some((item) => item.blocked);
  }, [usageSummary]);

  return {
    // 상태
    stats,
    isLoading,
    error,

    // Actions
    fetchStats,
    canCreate,
    incrementCount,
    decrementCount,

    // 요약
    usageSummary,
    hasWarningOrBlocked,
    hasBlocked,

    // 구독 상태
    hasActiveSubscription,
  };
}
