'use client';

import { TodoTimelineView } from '../timeline/components/TodoTimelineView';

interface DailyPlannerScreenProps {
  userId: string;
}

/**
 * 하루 플래너 화면
 */
export function DailyPlannerScreen({ userId }: DailyPlannerScreenProps) {
  return <TodoTimelineView userId={userId} viewMode="daily" />;
}
