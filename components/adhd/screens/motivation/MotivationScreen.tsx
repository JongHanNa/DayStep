'use client';

import { MotivationView } from '@/components/adhd/fuel/MotivationView';

interface MotivationScreenProps {
  userId: string;
}

/**
 * 원동력 새기기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * 기존 MotivationView를 래핑하여 그룹에 독립적인 구조 제공
 */
export function MotivationScreen({ userId }: MotivationScreenProps) {
  return <MotivationView userId={userId} />;
}

export default MotivationScreen;
