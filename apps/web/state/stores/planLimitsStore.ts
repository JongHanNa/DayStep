/**
 * planLimitsStore — DB plan_limits 테이블 기반 플랜 한도 상태 관리
 * Realtime 구독으로 관리자 변경 즉시 반영
 */
import { create } from 'zustand';
import { fetchPlanLimits, subscribePlanLimits, type PlanLimitsMap, type PlanLimit } from '@/lib/planLimits';
import { FREE_TIER_LIMITS, ENTITY_LIMIT_MAP, type UsageEntityType } from '@/lib/featureFlags';

/** 코드 하드코딩 fallback (DB 로드 전 / 오류 시 사용) */
const FALLBACK_LIMITS: PlanLimitsMap = {
  todo:             { free: { maxCount: FREE_TIER_LIMITS.MAX_TODOS,             displayText: `${FREE_TIER_LIMITS.MAX_TODOS}개`,             displayLabel: '할일'          }, pro: { maxCount: 300000, displayText: '300,000개',  displayLabel: '300,000개 할일'       } },
  habit:            { free: { maxCount: FREE_TIER_LIMITS.MAX_HABITS,            displayText: `${FREE_TIER_LIMITS.MAX_HABITS}개`,            displayLabel: '습관'          }, pro: { maxCount: 300,    displayText: '300개',      displayLabel: '300개 습관'           } },
  project:          { free: { maxCount: FREE_TIER_LIMITS.MAX_PROJECTS,          displayText: `${FREE_TIER_LIMITS.MAX_PROJECTS}개`,          displayLabel: '프로젝트'     }, pro: { maxCount: 300,    displayText: '300개',      displayLabel: '300개 프로젝트'       } },
  note:             { free: { maxCount: FREE_TIER_LIMITS.MAX_NOTES,             displayText: `${FREE_TIER_LIMITS.MAX_NOTES}개`,             displayLabel: '원동력'       }, pro: { maxCount: 1000,   displayText: '1,000개',    displayLabel: '1,000개 원동력'       } },
  cherished_people: { free: { maxCount: FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE,  displayText: `${FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE}명`,  displayLabel: '소중한 사람'  }, pro: { maxCount: 1000,   displayText: '1,000명',    displayLabel: '1,000명 소중한 사람'  } },
  care_interaction: { free: { maxCount: FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS, displayText: `${FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS}개`, displayLabel: '관심 기록'    }, pro: { maxCount: 1000,   displayText: '1,000개',    displayLabel: '1,000개 관심 기록'    } },
};

interface PlanLimitsState {
  limits: PlanLimitsMap | null;  // null = 아직 로드 전
  loading: boolean;
  _unsubscribe: (() => void) | null;

  fetchLimits: () => Promise<void>;
  subscribeLimits: () => void;
  unsubscribeLimits: () => void;

  /** DB 값 우선, 없으면 fallback */
  getLimit: (entity: string, tier: 'free' | 'pro') => PlanLimit;
  /** free maxCount (엔티티 제한 체크용) */
  getFreeMaxCount: (entity: UsageEntityType) => number;
}

export const usePlanLimitsStore = create<PlanLimitsState>((set, get) => ({
  limits: null,
  loading: false,
  _unsubscribe: null,

  fetchLimits: async () => {
    set({ loading: true });
    try {
      const map = await fetchPlanLimits();
      set({ limits: Object.keys(map).length > 0 ? map : null });
    } catch (e) {
      console.error('[planLimitsStore] fetchLimits error:', e);
    } finally {
      set({ loading: false });
    }
  },

  subscribeLimits: () => {
    // 이미 구독 중이면 재구독하지 않음
    if (get()._unsubscribe) return;

    const unsubscribe = subscribePlanLimits((map) => {
      set({ limits: Object.keys(map).length > 0 ? map : null });
    });
    set({ _unsubscribe: unsubscribe });
  },

  unsubscribeLimits: () => {
    get()._unsubscribe?.();
    set({ _unsubscribe: null });
  },

  getLimit: (entity: string, tier: 'free' | 'pro'): PlanLimit => {
    const limits = get().limits;
    if (limits?.[entity]?.[tier]) return limits[entity][tier];
    return FALLBACK_LIMITS[entity]?.[tier] ?? { maxCount: -1, displayText: '무제한', displayLabel: entity };
  },

  getFreeMaxCount: (entity: UsageEntityType): number => {
    const limits = get().limits;
    if (limits?.[entity]?.free) return limits[entity].free.maxCount;
    return ENTITY_LIMIT_MAP[entity];
  },
}));
