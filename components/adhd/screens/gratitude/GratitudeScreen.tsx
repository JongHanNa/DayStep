'use client';

import { GratitudeJournalView } from './components';

interface GratitudeScreenProps {
  userId: string;
}

/**
 * 감사 기록하기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * GratitudeJournalView를 직접 사용
 */
export function GratitudeScreen({ userId }: GratitudeScreenProps) {
  return <GratitudeJournalView userId={userId} />;
}

export default GratitudeScreen;
