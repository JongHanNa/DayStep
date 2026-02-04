'use client';

import ExecutionMode from '@/components/adhd/ExecutionMode';

interface ExecuteViewProps {
  onExit: () => void;
}

/**
 * 실행 뷰
 * ExecutionMode를 래핑
 */
export function ExecuteView({ onExit }: ExecuteViewProps) {
  return <ExecutionMode onExit={onExit} />;
}
