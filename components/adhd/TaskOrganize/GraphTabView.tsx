'use client';

import dynamic from 'next/dynamic';

// GraphView는 클라이언트 전용 (물리 시뮬레이션, 2D 캔버스 사용)
const GraphView = dynamic(() => import('@/components/graph/GraphView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <span className="loading loading-spinner loading-md" />
    </div>
  ),
});

interface GraphTabViewProps {
  userId: string;
}

/**
 * 그래프 탭 - 전체 구조 시각화
 *
 * ADHD 관점:
 * - 전체 그림 파악: 책임→목표→프로젝트→할일 계층
 * - 시각적 관계: 어떤 목표를 위해 일하는지 한눈에
 * - 맥락 연결: 흩어진 할일들의 연결고리 확인
 */
export function GraphTabView({ userId }: GraphTabViewProps) {
  return (
    <div className="h-[calc(100vh-140px)] w-full">
      <GraphView />
    </div>
  );
}
