'use client';

import ExecutionMode from '@/components/adhd/ExecutionMode';

interface ExecuteContentProps {
  onExit: () => void;
}

/**
 * 실행 콘텐츠
 * ExecutionMode를 래핑
 */
export function ExecuteContent({ onExit }: ExecuteContentProps) {
  return <ExecutionMode onExit={onExit} />;
}
