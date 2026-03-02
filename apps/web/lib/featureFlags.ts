/**
 * Feature Flags 시스템
 *
 * 결제 기능 등 Feature Flag로 관리되는 기능들의 설정
 */

export const FEATURE_FLAGS = {
  /**
   * 결제 기능 활성화 여부
   * - false: 모든 기능 무료로 사용 가능 (기본값, 초기 배포)
   * - true: 7일 무료 체험 후 구독 필요
   */
  PAYMENTS_ENABLED: process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true',

  /**
   * 무료 체험 기간 (일)
   */
  TRIAL_DAYS: parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '7', 10),

  /**
   * Pro 월간 구독 가격 (표시용)
   */
  PRO_MONTHLY_PRICE: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE || '₩5,500',

  /**
   * Pro 연간 구독 가격 (표시용)
   */
  PRO_YEARLY_PRICE: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE || '₩44,000',

  /**
   * Pro 연간 구독 할인율 (%)
   */
  PRO_YEARLY_DISCOUNT_PERCENTAGE: parseInt(
    process.env.NEXT_PUBLIC_PRO_YEARLY_DISCOUNT_PERCENTAGE || '33',
    10
  ),

  /**
   * Revenue Cat iOS API Key
   */
  REVENUE_CAT_IOS_KEY: process.env.NEXT_PUBLIC_REVENUE_CAT_IOS_KEY || '',

  /**
   * Revenue Cat Android API Key
   */
  REVENUE_CAT_ANDROID_KEY: process.env.NEXT_PUBLIC_REVENUE_CAT_ANDROID_KEY || '',
} as const;

/**
 * Pro 기능 목록
 * Paywall에서 표시할 잠금 기능
 */
export const PRO_FEATURES = [
  // 관계 관리 기능 (핵심)
  {
    id: 'unlimited_cherished_people',
    name: '무제한 소중한 사람',
    description: '소중한 사람을 무제한으로 등록하고 관리',
    path: null,
  },
  {
    id: 'unlimited_care_interactions',
    name: '무제한 관심 기록',
    description: '관심 표현 기록을 무제한으로 저장',
    path: null,
  },
  {
    id: 'relationship_insights',
    name: '관계 인사이트 & 통계',
    description: '관계 패턴 분석 및 상세 통계 대시보드',
    path: null,
  },
  // 기존 기능들
  {
    id: 'unlimited_projects',
    name: '무제한 프로젝트',
    description: '프로젝트 개수 제한 없이 관리',
    path: null,
  },
  {
    id: 'unlimited_notes',
    name: '무제한 원동력',
    description: '원동력 무제한 작성',
    path: null,
  },
  {
    id: 'statistics',
    name: '통계 & 인사이트',
    description: '생산성 통계 및 분석 대시보드',
    path: '/statistics',
  },
  {
    id: 'unlimited_contacts',
    name: '무제한 연락처 연결',
    description: '할일에 무제한 연락처 연결',
    path: null,
  },
] as const;

/**
 * Free Tier 제한사항
 */
export const FREE_TIER_LIMITS = {
  // 기존 제한 (2배 증가)
  MAX_TODOS: 60, // 일반 할일 (recurrence_pattern = 'none')
  MAX_PROJECTS: 15,
  MAX_NOTES: 40,
  MAX_CONTACTS: 10,

  // 신규 제한 (2배 증가)
  MAX_HABITS: 5, // 반복 할일 (습관)

  // 관계 관리 기능 제한
  MAX_CHERISHED_PEOPLE: 10, // 소중한 사람
  MAX_CARE_INTERACTIONS: 30, // 관심 기록

  // 경고 임계값 (%)
  WARNING_THRESHOLD: 80,
} as const;

/**
 * 엔티티 타입 (용량 제한용)
 */
export type UsageEntityType =
  | 'todo'
  | 'habit'
  | 'project'
  | 'note'
  | 'contact'
  | 'cherished_people'
  | 'care_interaction';

/**
 * 엔티티별 제한값 매핑
 */
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
 * DB plan_limits store에서 엔티티 한도 조회 (store 값 우선, 없으면 ENTITY_LIMIT_MAP fallback)
 * store import는 런타임 순환 참조 방지를 위해 lazy하게 처리
 */
export function getEntityFreeLimit(entity: UsageEntityType): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePlanLimitsStore } = require('@/state/stores/planLimitsStore');
    return usePlanLimitsStore.getState().getFreeMaxCount(entity);
  } catch {
    return ENTITY_LIMIT_MAP[entity];
  }
}

/**
 * 엔티티 한글명 매핑
 */
export const ENTITY_DISPLAY_NAME: Record<UsageEntityType, string> = {
  todo: '할일',
  habit: '습관',
  project: '프로젝트',
  note: '원동력',
  contact: '연락처',
  cherished_people: '소중한 사람',
  care_interaction: '관심 기록',
};
