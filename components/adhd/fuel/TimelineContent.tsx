'use client';

import { TodoTimelineView } from '@/components/adhd/TaskOrganize/TodoTimelineView';

interface TimelineContentProps {
  userId: string;
}

/**
 * 타임라인 콘텐츠
 * TodoTimelineView를 래핑
 */
export function TimelineContent({ userId }: TimelineContentProps) {
  return <TodoTimelineView userId={userId} />;
}
