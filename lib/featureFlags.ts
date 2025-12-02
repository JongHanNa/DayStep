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
  PRO_MONTHLY_PRICE: process.env.NEXT_PUBLIC_PRO_MONTHLY_PRICE || '₩5,900',

  /**
   * Pro 연간 구독 가격 (표시용)
   */
  PRO_YEARLY_PRICE: process.env.NEXT_PUBLIC_PRO_YEARLY_PRICE || '₩49,000',

  /**
   * Pro 연간 구독 할인율 (%)
   */
  PRO_YEARLY_DISCOUNT_PERCENTAGE: parseInt(
    process.env.NEXT_PUBLIC_PRO_YEARLY_DISCOUNT_PERCENTAGE || '30',
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
  {
    id: 'goal_compass',
    name: '목표 나침반',
    description: '목표 진척도 시각화 및 프로젝트 관리',
    path: '/second-brain/goal-compass',
  },
  {
    id: 'unlimited_projects',
    name: '무제한 프로젝트',
    description: '프로젝트 개수 제한 없이 관리',
    path: null,
  },
  {
    id: 'unlimited_notes',
    name: '무제한 노트',
    description: 'Second Brain 노트 무제한 작성',
    path: '/second-brain/notes',
  },
  {
    id: 'statistics',
    name: '통계 & 인사이트',
    description: '생산성 통계 및 분석 대시보드',
    path: '/statistics',
  },
  {
    id: 'google_calendar_sync',
    name: 'Google Calendar 동기화',
    description: 'Google Calendar 양방향 동기화',
    path: '/settings/integrations',
  },
  {
    id: 'unlimited_contacts',
    name: '무제한 연락처 연결',
    description: '할일에 무제한 연락처 연결',
    path: null,
  },
  {
    id: 'custom_themes',
    name: '커스텀 테마 & 색상',
    description: '나만의 색상 테마 설정',
    path: '/settings/appearance',
  },
  {
    id: 'advanced_markdown',
    name: '고급 Markdown 기능',
    description: 'Mermaid 다이어그램, 코드 하이라이팅 등',
    path: null,
  },
] as const;

/**
 * Free Tier 제한사항
 */
export const FREE_TIER_LIMITS = {
  // 기존 제한 (조정됨)
  MAX_TODOS: 30, // 일반 할일 (recurrence_pattern = 'none')
  MAX_PROJECTS: 3,
  MAX_NOTES: 10,
  MAX_CONTACTS: 5,

  // 신규 제한
  MAX_HABITS: 5, // 반복 할일 (습관)
  MAX_GOALS: 3,
  MAX_AREAS_RESOURCES: 5,

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
  | 'goal'
  | 'note'
  | 'area_resource'
  | 'contact';

/**
 * 엔티티별 제한값 매핑
 */
export const ENTITY_LIMIT_MAP: Record<UsageEntityType, number> = {
  todo: FREE_TIER_LIMITS.MAX_TODOS,
  habit: FREE_TIER_LIMITS.MAX_HABITS,
  project: FREE_TIER_LIMITS.MAX_PROJECTS,
  goal: FREE_TIER_LIMITS.MAX_GOALS,
  note: FREE_TIER_LIMITS.MAX_NOTES,
  area_resource: FREE_TIER_LIMITS.MAX_AREAS_RESOURCES,
  contact: FREE_TIER_LIMITS.MAX_CONTACTS,
};

/**
 * 엔티티 한글명 매핑
 */
export const ENTITY_DISPLAY_NAME: Record<UsageEntityType, string> = {
  todo: '할일',
  habit: '습관',
  project: '프로젝트',
  goal: '목표',
  note: '노트',
  area_resource: '영역/자원',
  contact: '연락처',
};
