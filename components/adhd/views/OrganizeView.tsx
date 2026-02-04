'use client';

import OrganizeWrapper from '../OrganizeWrapper';

interface OrganizeViewProps {
  onExit: () => void;
}

/**
 * 정리 모드 뷰
 *
 * ADHDContainer에서 사용되는 정리 모드 래퍼입니다.
 */
export default function OrganizeView({ onExit }: OrganizeViewProps) {
  return <OrganizeWrapper onExit={onExit} />;
}
