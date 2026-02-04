'use client';

import FocusExecutionContainer from '../containers/FocusExecutionContainer';

interface FocusExecutionViewProps {
  onExit: () => void;
}

/**
 * 집중 실행 모드 뷰
 *
 * ADHDContainer에서 사용되는 집중 실행 모드 래퍼입니다.
 */
export default function FocusExecutionView({ onExit }: FocusExecutionViewProps) {
  return <FocusExecutionContainer onExit={onExit} />;
}
