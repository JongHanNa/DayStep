'use client';

import { ExecutionContainer } from '@/components/adhd/execution';

interface ExecuteScreenProps {
  userId?: string;
  onExit?: () => void;
}

/**
 * 집중 실행하기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * ExecutionContainer를 직접 사용
 */
export function ExecuteScreen({ onExit = () => {} }: ExecuteScreenProps) {
  return <ExecutionContainer onExit={onExit} />;
}

export default ExecuteScreen;
