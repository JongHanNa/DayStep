'use client';

import { TodoTimelineView } from '../timeline/components/TodoTimelineView';

interface DailyPlannerScreenProps {
  userId: string;
}

/**
 * 하루 플래너 화면
 * Capacitor의 SCREEN_COMPONENTS 동적 렌더링용 래퍼
 */
export function DailyPlannerScreen({ userId }: DailyPlannerScreenProps) {
  return <TodoTimelineView userId={userId} viewMode="daily" />;
}

export default DailyPlannerScreen;
