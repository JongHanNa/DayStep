/**
 * planLimits — DB 기반 플랜별 한도 fetch / Realtime 구독 유틸
 * DB plan_limits 테이블이 단일 소스 (코드 하드코딩은 fallback 역할)
 */

import { supabase } from '@/lib/supabase';

export interface PlanLimit {
  maxCount: number;   // -1 = unlimited
  displayText: string;
  displayLabel: string;
}

/** entity_type → { free, pro } */
export type PlanLimitsMap = Record<string, { free: PlanLimit; pro: PlanLimit }>;

interface RawPlanLimit {
  entity_type: string;
  tier: string;
  max_count: number;
  display_text: string;
  display_label: string;
}

function rowsToMap(rows: RawPlanLimit[]): PlanLimitsMap {
  const map: PlanLimitsMap = {};
  for (const row of rows) {
    if (!map[row.entity_type]) {
      map[row.entity_type] = {
        free: { maxCount: -1, displayText: '', displayLabel: '' },
        pro:  { maxCount: -1, displayText: '', displayLabel: '' },
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

/** DB에서 전체 plan_limits 조회 → PlanLimitsMap 반환 */
export async function fetchPlanLimits(): Promise<PlanLimitsMap> {
  // plan_limits는 신규 테이블이므로 생성된 타입에 없을 수 있어 as any 캐스트 사용
  const { data, error } = await (supabase as any)
    .from('plan_limits')
    .select('entity_type, tier, max_count, display_text, display_label');

  if (error) {
    console.error('[planLimits] fetch error:', error.message);
    return {};
  }
  return rowsToMap((data ?? []) as RawPlanLimit[]);
}

/** Supabase Realtime — plan_limits 변경 시 콜백 호출 */
export function subscribePlanLimits(
  onUpdate: (map: PlanLimitsMap) => void,
): () => void {
  const channel = (supabase as any)
    .channel('plan_limits_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plan_limits' },
      async () => {
        // 변경 발생 시 전체 재조회 (단순화)
        const map = await fetchPlanLimits();
        onUpdate(map);
      },
    )
    .subscribe();

  return () => {
    (supabase as any).removeChannel(channel);
  };
}
