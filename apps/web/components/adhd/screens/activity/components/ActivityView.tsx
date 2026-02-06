'use client';

import { TodoStatsView } from './TodoStatsView';

interface ActivityViewProps {
  userId: string;
}

/**
 * 대시보드 활동 통계 뷰 (Pro 전용)
 * TodoStatsView를 래핑
 */
export function ActivityView({ userId }: ActivityViewProps) {
  return <TodoStatsView userId={userId} />;
}
