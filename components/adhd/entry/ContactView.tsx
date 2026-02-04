'use client';

import { StatsDashboardView } from '@/components/adhd/RelationshipInsights/StatsDashboardView';

interface ContactViewProps {
  userId: string;
}

/**
 * 대시보드 연락 통계 뷰 (Pro 전용)
 * StatsDashboardView를 래핑
 */
export function ContactView({ userId }: ContactViewProps) {
  return <StatsDashboardView userId={userId} />;
}
