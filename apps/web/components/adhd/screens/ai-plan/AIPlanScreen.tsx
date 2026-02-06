'use client';

import { AIPlanView } from './components';

interface AIPlanScreenProps {
  userId: string;
  onExit?: () => void;
}

/**
 * AI로 계획하기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * 프로젝트 목록 관리 UI를 표시
 * AIPlanView를 직접 사용
 */
export function AIPlanScreen({ userId }: AIPlanScreenProps) {
  return <AIPlanView userId={userId} />;
}

export default AIPlanScreen;
