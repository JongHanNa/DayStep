/**
 * planLimitsStore (RN) — DB plan_limits 테이블 기반 플랜 한도 상태 관리
 * MMKV persist → 오프라인 fallback
 * Realtime 구독으로 관리자 변경 즉시 반영
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {
  FREE_TIER_LIMITS,
  ENTITY_LIMIT_MAP,
  type UsageEntityType,
} from '@/lib/featureFlags';

export interface PlanLimit {
  maxCount: number;   // -1 = unlimited
  displayText: string;
  displayLabel: string;
}

export type PlanLimitsMap = Record<string, {free: PlanLimit; pro: PlanLimit}>;

interface RawPlanLimit {
  entity_type: string;
  tier: string;
  max_count: number;
  display_text: string;
  display_label: string;
}

/** 코드 하드코딩 fallback */
const FALLBACK_LIMITS: PlanLimitsMap = {
  todo:             {free: {maxCount: FREE_TIER_LIMITS.MAX_TODOS,             displayText: `${FREE_TIER_LIMITS.MAX_TODOS}개`,             displayLabel: '할일'},         pro: {maxCount: 300000, displayText: '300,000개', displayLabel: '300,000개 할일'}},
  habit:            {free: {maxCount: FREE_TIER_LIMITS.MAX_HABITS,            displayText: `${FREE_TIER_LIMITS.MAX_HABITS}개`,            displayLabel: '습관'},         pro: {maxCount: 300,    displayText: '300개',     displayLabel: '300개 습관'}},
  project:          {free: {maxCount: FREE_TIER_LIMITS.MAX_PROJECTS,          displayText: `${FREE_TIER_LIMITS.MAX_PROJECTS}개`,          displayLabel: '프로젝트'},     pro: {maxCount: 300,    displayText: '300개',     displayLabel: '300개 프로젝트'}},
  note:             {free: {maxCount: FREE_TIER_LIMITS.MAX_NOTES,             displayText: `${FREE_TIER_LIMITS.MAX_NOTES}개`,             displayLabel: '원동력'},       pro: {maxCount: 1000,   displayText: '1,000개',   displayLabel: '1,000개 원동력'}},
  cherished_people: {free: {maxCount: FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE,  displayText: `${FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE}명`,  displayLabel: '소중한 사람'},  pro: {maxCount: 1000,   displayText: '1,000명',   displayLabel: '1,000명 소중한 사람'}},
  care_interaction: {free: {maxCount: FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS, displayText: `${FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS}개`, displayLabel: '관심 기록'},    pro: {maxCount: 1000,   displayText: '1,000개',   displayLabel: '1,000개 관심 기록'}},
};

function rowsToMap(rows: RawPlanLimit[]): PlanLimitsMap {
  const map: PlanLimitsMap = {};
  for (const row of rows) {
    if (!map[row.entity_type]) {
      map[row.entity_type] = {
        free: {maxCount: -1, displayText: '', displayLabel: ''},
        pro:  {maxCount: -1, displayText: '', displayLabel: ''},
      };
    }
    const tier = row.tier as 'free' | 'pro';
    map[row.entity_type][tier] = {
      maxCount:     row.max_count,
      displayText:  row.display_text,
      displayLabel: row.display_label,
    };
  }
  return map;
}

interface PlanLimitsState {
  limits: PlanLimitsMap | null;
  loading: boolean;
  _channel: any | null;  // Supabase RealtimeChannel

  fetchLimits: () => Promise<void>;
  subscribeLimits: () => void;
  unsubscribeLimits: () => void;

  getLimit: (entity: string, tier: 'free' | 'pro') => PlanLimit;
  getFreeMaxCount: (entity: UsageEntityType) => number;
}

export const usePlanLimitsStore = create<PlanLimitsState>()(
  persist(
    (set, get) => ({
      limits: null,
      loading: false,
      _channel: null,

      fetchLimits: async () => {
        set({loading: true});
        try {
          const {data, error} = await supabase
            .from('plan_limits')
            .select('entity_type, tier, max_count, display_text, display_label');

          if (error) {
            console.error('[planLimitsStore] fetch error:', error.message);
          } else {
            const map = rowsToMap((data ?? []) as RawPlanLimit[]);
            set({limits: Object.keys(map).length > 0 ? map : null});
          }
        } catch (e) {
          console.error('[planLimitsStore] fetch exception:', e);
        } finally {
          set({loading: false});
        }
      },

      subscribeLimits: () => {
        if (get()._channel) return; // 이미 구독 중

        const channel = supabase
          .channel('rn_plan_limits_changes')
          .on(
            'postgres_changes',
            {event: '*', schema: 'public', table: 'plan_limits'},
            async () => {
              // 변경 발생 시 전체 재조회
              await get().fetchLimits();
            },
          )
          .subscribe();

        set({_channel: channel});
      },

      unsubscribeLimits: () => {
        const ch = get()._channel;
        if (ch) {
          supabase.removeChannel(ch);
          set({_channel: null});
        }
      },

      getLimit: (entity: string, tier: 'free' | 'pro'): PlanLimit => {
        const limits = get().limits;
        if (limits?.[entity]?.[tier]) return limits[entity][tier];
        return FALLBACK_LIMITS[entity]?.[tier] ?? {maxCount: -1, displayText: '무제한', displayLabel: entity};
      },

      getFreeMaxCount: (entity: UsageEntityType): number => {
        const limits = get().limits;
        if (limits?.[entity]?.free) return limits[entity].free.maxCount;
        return ENTITY_LIMIT_MAP[entity];
      },
    }),
    {
      name: 'plan-limits-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      // _channel은 직렬화 불가 → persist 제외
      partialize: (state) => ({limits: state.limits}),
    },
  ),
);
