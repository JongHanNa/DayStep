/**
 * GraphCanvas - 그래프 렌더링 캔버스
 * ForceGraph2D를 사용하여 노드와 링크를 시각화
 */

'use client';

import { useRef, useCallback, useEffect, useState, ComponentType } from 'react';
import ForceGraph2DComponent from './ForceGraph2DWrapper';
import type { GraphNode, GraphLink, GraphData } from '@/types/graph';
import { useGraphStore, useGraphSelectedNode, useGraphHoveredNode } from '@/state/stores/graphStore';
import { getNodeSize, getLinkColor, getLinkWidth } from '@/lib/graph-utils';

// react-force-graph-2d의 제네릭 타입이 복잡하여 타입 캐스팅 사용
const ForceGraph2D = ForceGraph2DComponent as ComponentType<Record<string, unknown>>;

interface GraphCanvasProps {
  graphData: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
}

export function GraphCanvas({ graphData, onNodeClick, onBackgroundClick }: GraphCanvasProps) {
  const graphRef = useRef<unknown>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const selectedNodeId = useGraphSelectedNode();
  const hoveredNodeId = useGraphHoveredNode();
  const { setSelectedNode, setHoveredNode, openEditModal, zoomLevel, setZoomLevel } = useGraphStore();

  // 컨테이너 크기 추적
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (node: GraphNode | null) => {
      if (!node) return;
      setSelectedNode(node.id);
      openEditModal(node as GraphNode);
      onNodeClick?.(node as GraphNode);
    },
    [setSelectedNode, openEditModal, onNodeClick]
  );

  // 노드 호버 핸들러
  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      setHoveredNode(node?.id || null);
    },
    [setHoveredNode]
  );

  // 배경 클릭 핸들러
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    onBackgroundClick?.();
  }, [setSelectedNode, setHoveredNode, onBackgroundClick]);

  // 줌 변경 핸들러
  const handleZoom = useCallback(
    (zoom: { k: number }) => {
      setZoomLevel(zoom.k);
    },
    [setZoomLevel]
  );

  // 커스텀 노드 렌더링
  const nodeCanvasObject = useCallback(
    (node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const baseSize = getNodeSize(node);
      const size = isSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize;

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      // 선택/호버 시 글로우 효과
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected
          ? `${node.color}40`
          : `${node.color}20`;
        ctx.fill();
      }

      // 노드 원형 배경
      ctx.beginPath();
      ctx.arc(x, y, size, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      // 선택된 노드 테두리
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 노드 아이콘 또는 첫 글자
      const fontSize = Math.max(8, size * 0.8);
      ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';

      // 첫 글자 표시 (아이콘 대신)
      const firstChar = node.title.charAt(0).toUpperCase();
      ctx.fillText(firstChar, x, y);

      // 호버 시 제목 표시
      if ((isHovered || isSelected) && globalScale > 0.8) {
        const labelFontSize = Math.max(10, 12 / globalScale);
        ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';

        // 배경 박스
        const textWidth = ctx.measureText(node.title).width;
        const padding = 4;
        const labelY = y + size + 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth / 2 - padding,
          labelY - labelFontSize / 2 - padding / 2,
          textWidth + padding * 2,
          labelFontSize + padding,
          4
        );
        ctx.fill();

        // 텍스트
        ctx.fillStyle = '#fff';
        ctx.fillText(node.title, x, labelY);
      }
    },
    [selectedNodeId, hoveredNodeId]
  );

  // 노드 포인터 영역 크기
  const nodePointerAreaPaint = useCallback(
    (node: GraphNode & { x?: number; y?: number }, color: string, ctx: CanvasRenderingContext2D) => {
      const size = getNodeSize(node) * 1.5;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  // 링크 색상
  const linkColor = useCallback((link: GraphLink) => {
    return getLinkColor(link);
  }, []);

  // 링크 너비
  const linkWidth = useCallback((link: GraphLink) => {
    return getLinkWidth(link);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-base-300 relative"
      onClick={(e) => {
        // 빈 공간 클릭 시만 처리
        if (e.target === containerRef.current) {
          handleBackgroundClick();
        }
      }}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        // 노드 설정
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        // 링크 설정
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        // 물리 시뮬레이션 설정
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        warmupTicks={50}
        cooldownTicks={100}
        cooldownTime={3000}
        // 상호작용 설정
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        onZoom={handleZoom}
        // 배경
        backgroundColor="transparent"
      />
    </div>
  );
}

export default GraphCanvas;
