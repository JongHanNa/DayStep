'use client';

import { ActivityView } from './components/ActivityView';

interface ActivityScreenProps {
  userId: string;
}

/**
 * 활동 살펴보기 화면 (Pro 전용)
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * ActivityView를 직접 사용
 */
export function ActivityScreen({ userId }: ActivityScreenProps) {
  return <ActivityView userId={userId} />;
}

export default ActivityScreen;
