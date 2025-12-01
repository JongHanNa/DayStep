/**
 * ForceGraph2DWrapper - SSR 우회 래퍼
 * Canvas 기반 라이브러리는 서버 사이드에서 렌더링할 수 없으므로
 * Next.js dynamic import를 사용하여 클라이언트에서만 로드
 */

'use client';

import dynamic from 'next/dynamic';
import type { ForceGraphMethods, ForceGraphProps } from 'react-force-graph-2d';
import type { GraphNode, GraphLink } from '@/types/graph';

// SSR 비활성화된 ForceGraph2D 컴포넌트
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    )
  }
);

// 타입 재정의 (GraphNode, GraphLink 사용)
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type { ForceGraphMethods };

// Props 타입 확장
export interface ForceGraph2DWrapperProps extends Omit<ForceGraphProps<GraphNode, GraphLink>, 'graphData'> {
  graphData: GraphData;
}

export default ForceGraph2D;
