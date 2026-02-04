'use client';

import RelationshipContainer from '../RelationshipInsights/RelationshipContainer';

interface RelationshipInsightsViewProps {
  onExit: () => void;
}

/**
 * 관계 인사이트 뷰
 *
 * ADHDContainer에서 사용되는 관계 인사이트 모드 래퍼입니다.
 */
export default function RelationshipInsightsView({ onExit }: RelationshipInsightsViewProps) {
  return <RelationshipContainer onExit={onExit} />;
}
