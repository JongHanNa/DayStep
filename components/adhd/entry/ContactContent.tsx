'use client';

import { StatsDashboardView } from '@/components/adhd/RelationshipInsights/StatsDashboardView';

interface ContactContentProps {
  userId: string;
}

/**
 * 대시보드 연락 통계 콘텐츠 (Pro 전용)
 * StatsDashboardView를 래핑
 */
export function ContactContent({ userId }: ContactContentProps) {
  return <StatsDashboardView userId={userId} />;
}
