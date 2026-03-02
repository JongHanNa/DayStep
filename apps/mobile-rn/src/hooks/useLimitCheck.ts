/**
 * useLimitCheck — RN 생성 한도 체크 Hook
 *
 * 생성 전 구독 상태 + 사용량을 확인하여 차단 여부를 반환합니다.
 * Pro 구독자는 항상 허용, Free 구독자는 한도 초과 시 차단.
 */

import {useState, useCallback} from 'react';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {usePlanLimitsStore} from '@/stores/planLimitsStore';
import {useUsageStats} from '@/hooks/useUsageStats';
import {type UsageEntityType} from '@/lib/featureFlags';

interface UseLimitCheckResult {
  /** 생성 전 한도 체크. true이면 생성 허용, false이면 차단 (모달 표시) */
  checkLimit: (entity: UsageEntityType) => Promise<boolean>;
  /** 한도 초과 모달 표시 여부 */
  isLimitReached: boolean;
  /** 한도 초과된 엔티티 타입 */
  limitedEntity: UsageEntityType | null;
  /** 현재 카운트 */
  currentCount: number;
  /** 최대 허용 카운트 */
  maxCount: number;
  /** 모달 닫기 */
  closeLimitModal: () => void;
}

export function useLimitCheck(): UseLimitCheckResult {
  const {hasActiveSubscription} = useSubscriptionStore();
  const {getFreeMaxCount} = usePlanLimitsStore();
  const {stats, fetchStats} = useUsageStats();

  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitedEntity, setLimitedEntity] = useState<UsageEntityType | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);

  const getCountForEntity = useCallback(
    (entity: UsageEntityType): number => {
      switch (entity) {
        case 'todo':               return stats.todoCount;
        case 'habit':              return stats.habitCount;
        case 'project':            return stats.projectCount;
        case 'note':               return stats.noteCount;
        case 'contact':            return stats.contactCount;
        case 'cherished_people':   return stats.cherishedPeopleCount;
        case 'care_interaction':   return stats.careInteractionCount;
        default:                   return 0;
      }
    },
    [stats],
  );

  const checkLimit = useCallback(
    async (entity: UsageEntityType): Promise<boolean> => {
      // Pro 구독자는 항상 허용
      if (hasActiveSubscription) return true;

      // 최신 통계 조회
      await fetchStats();

      const limit = getFreeMaxCount(entity);
      const count = getCountForEntity(entity);

      if (limit !== -1 && count >= limit) {
        setCurrentCount(count);
        setMaxCount(limit);
        setLimitedEntity(entity);
        setIsLimitReached(true);
        return false;
      }

      return true;
    },
    [hasActiveSubscription, getFreeMaxCount, getCountForEntity, fetchStats],
  );

  const closeLimitModal = useCallback(() => {
    setIsLimitReached(false);
    setLimitedEntity(null);
    setCurrentCount(0);
    setMaxCount(0);
  }, []);

  return {
    checkLimit,
    isLimitReached,
    limitedEntity,
    currentCount,
    maxCount,
    closeLimitModal,
  };
}
