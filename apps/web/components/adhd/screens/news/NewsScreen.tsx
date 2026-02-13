'use client';

import { NewsMemosView } from './components';

interface NewsScreenProps {
  userId: string;
}

/**
 * 소식 챙기기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * NewsMemosView를 직접 사용
 */
export function NewsScreen({ userId }: NewsScreenProps) {
  return <NewsMemosView userId={userId} />;
}
