'use client';

import ExecutionContainer from '../execution/ExecutionContainer';

interface ExecutionViewProps {
  onExit: () => void;
}

/**
 * 실행 모드 뷰
 *
 * ADHDContainer에서 사용되는 실행 모드 래퍼입니다.
 */
export default function ExecutionView({ onExit }: ExecutionViewProps) {
  return <ExecutionContainer onExit={onExit} />;
}
