'use client';

import RelationshipRecordContainer from '../containers/RelationshipRecordContainer';

interface RelationshipRecordViewProps {
  onExit: () => void;
}

/**
 * 관계 기록 모드 뷰
 *
 * ADHDContainer에서 사용되는 관계 기록 모드 래퍼입니다.
 */
export default function RelationshipRecordView({ onExit }: RelationshipRecordViewProps) {
  return <RelationshipRecordContainer onExit={onExit} />;
}
