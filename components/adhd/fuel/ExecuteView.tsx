'use client';

import { ExecutionContainer } from '@/components/adhd/execution';

interface ExecuteViewProps {
  onExit: () => void;
}

/**
 * 실행 뷰
 * ExecutionMode를 래핑
 */
export function ExecuteView({ onExit }: ExecuteViewProps) {
  return <ExecutionContainer onExit={onExit} />;
}
