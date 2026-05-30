/**
 * Feature Flags — Free Tier 제한값 및 엔티티 매핑
 * (웹 apps/web/lib/featureFlags.ts 에서 포팅)
 */

export const FEATURE_FLAGS = {
  /**
   * 결제/구독 기능 활성화 여부.
   * false: 모든 사용자에게 Pro 기능 무료 개방, 구독/페이월 UI 비표시.
   * true: 정상 구독 게이트 적용.
   * 출시 초기 / Apple IAP 미준비 상태에서는 false.
   */
  PAYMENTS_ENABLED: false,
} as const;

export const FREE_TIER_LIMITS = {
  MAX_TODOS: 60,
  MAX_PROJECTS: 15,
  MAX_NOTES: 40,
  MAX_CONTACTS: 10,
  MAX_HABITS: 5,
  MAX_CHERISHED_PEOPLE: 10,
  MAX_CARE_INTERACTIONS: 30,
  WARNING_THRESHOLD: 80,
} as const;

export type UsageEntityType =
  | 'todo'
  | 'habit'
  | 'project'
  | 'note'
  | 'contact'
  | 'cherished_people'
  | 'care_interaction';

export const ENTITY_LIMIT_MAP: Record<UsageEntityType, number> = {
  todo: FREE_TIER_LIMITS.MAX_TODOS,
  habit: FREE_TIER_LIMITS.MAX_HABITS,
  project: FREE_TIER_LIMITS.MAX_PROJECTS,
  note: FREE_TIER_LIMITS.MAX_NOTES,
  contact: FREE_TIER_LIMITS.MAX_CONTACTS,
  cherished_people: FREE_TIER_LIMITS.MAX_CHERISHED_PEOPLE,
  care_interaction: FREE_TIER_LIMITS.MAX_CARE_INTERACTIONS,
};

/**
 * DB plan_limits store에서 Free 한도 조회 (store 값 우선, 없으면 ENTITY_LIMIT_MAP fallback)
 */
export function getEntityFreeLimit(entity: UsageEntityType): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {usePlanLimitsStore} = require('@/stores/planLimitsStore');
    return usePlanLimitsStore.getState().getFreeMaxCount(entity);
  } catch {
    return ENTITY_LIMIT_MAP[entity];
  }
}

export const ENTITY_DISPLAY_NAME: Record<UsageEntityType, string> = {
  todo: '할일',
  habit: '습관',
  project: '프로젝트',
  note: '원동력',
  contact: '연락처',
  cherished_people: '소중한 사람',
  care_interaction: '관심 기록',
};
