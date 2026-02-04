'use client';

import { TodoStatsView } from '@/components/adhd/TaskOrganize/TodoStatsView';

interface ActivityContentProps {
  userId: string;
}

/**
 * 대시보드 활동 통계 콘텐츠 (Pro 전용)
 * TodoStatsView를 래핑
 */
export function ActivityContent({ userId }: ActivityContentProps) {
  return <TodoStatsView userId={userId} />;
}
