'use client';

import { TodoTimelineView } from './components/TodoTimelineView';

interface TimelineScreenProps {
  userId: string;
}

/**
 * 하루 돌아보기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * TodoTimelineView를 직접 사용
 */
export function TimelineScreen({ userId }: TimelineScreenProps) {
  return <TodoTimelineView userId={userId} />;
}

export default TimelineScreen;
