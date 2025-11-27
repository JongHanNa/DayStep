/**
 * useFilteredGraphData Hook - 그래프 뷰 필터링
 * graphStore의 필터 상태를 적용하여 필터링된 그래프 데이터 반환
 */

'use client';

import { useMemo } from 'react';
import { useGraphFilter } from '@/state/stores/graphStore';
import type { GraphData, GraphNode, GraphLink } from '@/types/graph';
import {
  searchNodes,
  filterNodesByType,
  filterNodesByStatus,
  filterLinksForNodes,
} from '@/lib/graph-utils';

interface UseFilteredGraphDataReturn {
  filteredData: GraphData;
  nodeCount: number;
  linkCount: number;
  isFiltered: boolean;
}

export function useFilteredGraphData(graphData: GraphData): UseFilteredGraphDataReturn {
  const filter = useGraphFilter();

  const filteredData: GraphData = useMemo(() => {
    let filteredNodes = [...graphData.nodes];
    let filteredLinks = [...graphData.links];

    // 1. 노드 타입 필터링
    if (filter.nodeTypes.length < 6) {
      filteredNodes = filterNodesByType(filteredNodes, filter.nodeTypes);
    }

    // 2. 상태 필터링 (완료/보관 항목)
    filteredNodes = filterNodesByStatus(filteredNodes, filter.showCompleted, filter.showArchived);

    // 3. 검색어 필터링
    if (filter.searchQuery.trim()) {
      filteredNodes = searchNodes(filteredNodes, filter.searchQuery);
    }

    // 4. 링크 필터링 (존재하는 노드만)
    const nodeIdSet = new Set(filteredNodes.map((n) => n.id));
    filteredLinks = filterLinksForNodes(filteredLinks, nodeIdSet);

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, filter]);

  // 필터 적용 여부 확인
  const isFiltered = useMemo(() => {
    return (
      filter.nodeTypes.length < 6 ||
      !filter.showCompleted ||
      filter.showArchived ||
      filter.searchQuery.trim() !== ''
    );
  }, [filter]);

  return {
    filteredData,
    nodeCount: filteredData.nodes.length,
    linkCount: filteredData.links.length,
    isFiltered,
  };
}
