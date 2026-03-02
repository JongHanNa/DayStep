/**
 * Paywall 비교 테이블 — 단일 소스 (웹·모바일 공유)
 *
 * entity: null → 불리언 항목 (Free X / Pro ✓)
 */

export interface PaywallComparisonFeature {
  name: string;
  entity: string | null; // null = 불리언 항목
  unit: string;
  proLabel: string;
  description: string;
}

export const PAYWALL_COMPARISON_FEATURES: PaywallComparisonFeature[] = [
  { name: '할일', entity: 'todo', unit: '개', proLabel: '무제한 할일', description: '할일을 무제한으로 관리' },
  { name: '습관', entity: 'habit', unit: '개', proLabel: '무제한 습관', description: '습관을 무제한으로 추적' },
  { name: '프로젝트', entity: 'project', unit: '개', proLabel: '무제한 프로젝트', description: '프로젝트 개수 제한 없이 관리' },
  { name: '원동력', entity: 'note', unit: '개', proLabel: '무제한 원동력', description: '원동력 무제한 작성' },
  { name: '소중한 사람', entity: 'cherished_people', unit: '명', proLabel: '무제한 소중한 사람', description: '소중한 사람을 무제한으로 등록하고 관리' },
  { name: '관심 기록', entity: 'care_interaction', unit: '개', proLabel: '무제한 관심 기록', description: '관심 표현 기록을 무제한으로 저장' },
  { name: '통계&인사이트', entity: null, unit: '', proLabel: '통계&인사이트', description: '생산성 통계 및 분석 대시보드' },
];
