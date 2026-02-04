'use client';

import CareContainer from '../care/CareContainer';

interface CareViewProps {
  onExit: () => void;
}

/**
 * 마음 전해보기 모드 뷰
 *
 * ADHDContainer에서 사용되는 마음 전해보기 모드 래퍼입니다.
 */
export default function CareView({ onExit }: CareViewProps) {
  return <CareContainer onExit={onExit} />;
}
