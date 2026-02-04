'use client';

import { TodoTimelineView } from '@/components/adhd/TaskOrganize/TodoTimelineView';

interface TimelineViewProps {
  userId: string;
}

/**
 * 타임라인 뷰
 * TodoTimelineView를 래핑
 */
export function TimelineView({ userId }: TimelineViewProps) {
  return <TodoTimelineView userId={userId} />;
}
