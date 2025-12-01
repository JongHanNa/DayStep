/**
 * GraphCanvas - 그래프 렌더링 캔버스
 * ForceGraph2D를 사용하여 노드와 링크를 시각화
 */

'use client';

import { useRef, useCallback, useEffect, useState, ComponentType } from 'react';
import ForceGraph2DComponent from './ForceGraph2DWrapper';
import type { GraphNode, GraphLink, GraphData } from '@/types/graph';
import { useGraphStore, useGraphSelectedNode, useGraphHoveredNode, useGraphFilter, useGraphActionMenu, useGraphPopover } from '@/state/stores/graphStore';
import { getNodeSize, getLinkColor, getLinkWidth, NODE_TYPE_LABELS } from '@/lib/graph-utils';
import type { GraphNodeType } from '@/types/graph';
import { useTheme } from '@/hooks/useTheme';

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
  const pendingZoomRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const selectedNodeId = useGraphSelectedNode();
  const hoveredNodeId = useGraphHoveredNode();
  const filter = useGraphFilter();
  const { isOpen: isActionMenuOpen, node: actionMenuNode } = useGraphActionMenu();
  const { activePopover } = useGraphPopover();
  const { setSelectedNode, setHoveredNode, openEditModal, openActionMenu, closeActionMenu, zoomLevel, setZoomLevel } = useGraphStore();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

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

  // D3 Force 설정 - 노드 배치 물리 시뮬레이션
  useEffect(() => {
    if (!graphRef.current) return;

    const fg = graphRef.current as any;

    // Link force - 연결된 노드 간 거리 120px 유지
    fg.d3Force('link')
      .distance(120)   // 목표 거리 (100-150px 범위의 중간값)
      .strength(0.5);  // 중간 강도

    // Charge force - 노드 간 척력으로 겹치지 않도록 밀어냄
    fg.d3Force('charge')
      .strength(-400)      // 척력 강도 (음수 = 밀어냄)
      .distanceMax(300);   // 최대 영향 거리 (성능 최적화)

    // Center force - 화면 중앙으로 부드럽게 끌어당김
    fg.d3Force('center')
      .x(dimensions.width / 2)
      .y(dimensions.height / 2)
      .strength(0.05);  // 매우 약한 중력 (중심 클러스터 패턴 유지)

  }, [dimensions, graphData]);

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (node: GraphNode | null, event?: MouseEvent) => {
      if (!node) return;
      setSelectedNode(node.id);

      // 노트 노드는 액션 메뉴 표시 (편집/삭제 선택)
      if (node.type === 'note' && event && containerRef.current) {
        // 같은 노드를 다시 클릭하면 메뉴 닫기 (토글)
        if (isActionMenuOpen && actionMenuNode?.id === node.id) {
          closeActionMenu();
        } else {
          const containerRect = containerRef.current.getBoundingClientRect();
          const position = {
            x: event.clientX - containerRect.left,
            y: event.clientY - containerRect.top,
          };
          openActionMenu(node as GraphNode, position);
        }
      } else {
        // 다른 타입은 액션 메뉴 닫고 편집 모달 열기
        closeActionMenu();
        openEditModal(node as GraphNode);
      }
      onNodeClick?.(node as GraphNode);
    },
    [setSelectedNode, openEditModal, openActionMenu, closeActionMenu, isActionMenuOpen, actionMenuNode, onNodeClick]
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
    // 팝오버가 열려있으면 액션 메뉴를 닫지 않음 (팝오버 내 클릭이 배경 클릭으로 인식되는 것 방지)
    if (!activePopover) {
      closeActionMenu();
    }
    onBackgroundClick?.();
  }, [setSelectedNode, setHoveredNode, closeActionMenu, activePopover, onBackgroundClick]);

  // 줌 변경 핸들러 - 렌더링 중 setState 방지를 위해 ref에 저장
  const handleZoom = useCallback(
    (zoom: { k: number }) => {
      pendingZoomRef.current = zoom.k;
      // pan/zoom 시 액션 메뉴 닫기 (노드에서 메뉴가 분리되는 것 방지)
      if (isActionMenuOpen) {
        closeActionMenu();
      }
    },
    [isActionMenuOpen, closeActionMenu]
  );

  // 렌더링 완료 후 대기 중인 zoom을 스토어에 동기화
  useEffect(() => {
    if (pendingZoomRef.current !== null) {
      const zoomValue = pendingZoomRef.current;
      pendingZoomRef.current = null;
      setZoomLevel(zoomValue);
    }
  });

  // 노드 타입별 아이콘 심볼 (Canvas에서 그릴 수 있는 간단한 형태)
  const drawNodeIcon = useCallback((
    ctx: CanvasRenderingContext2D,
    type: GraphNodeType,
    x: number,
    y: number,
    iconSize: number
  ) => {
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, iconSize * 0.15);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = iconSize; // 아이콘 크기

    switch (type) {
      case 'area': // Briefcase 아이콘
        ctx.beginPath();
        // 가방 본체
        ctx.roundRect(x - s * 0.5, y - s * 0.25, s, s * 0.6, s * 0.1);
        ctx.stroke();
        // 손잡이
        ctx.beginPath();
        ctx.moveTo(x - s * 0.2, y - s * 0.25);
        ctx.lineTo(x - s * 0.2, y - s * 0.4);
        ctx.lineTo(x + s * 0.2, y - s * 0.4);
        ctx.lineTo(x + s * 0.2, y - s * 0.25);
        ctx.stroke();
        break;

      case 'resource': // Archive 아이콘
        ctx.beginPath();
        // 상단 박스
        ctx.roundRect(x - s * 0.5, y - s * 0.4, s, s * 0.3, s * 0.05);
        ctx.stroke();
        // 하단 박스
        ctx.beginPath();
        ctx.roundRect(x - s * 0.45, y - s * 0.1, s * 0.9, s * 0.5, s * 0.05);
        ctx.stroke();
        // 중앙 라인
        ctx.beginPath();
        ctx.moveTo(x - s * 0.15, y + s * 0.1);
        ctx.lineTo(x + s * 0.15, y + s * 0.1);
        ctx.stroke();
        break;

      case 'goal': // Target 아이콘
        // 외원
        ctx.beginPath();
        ctx.arc(x, y, s * 0.45, 0, 2 * Math.PI);
        ctx.stroke();
        // 중원
        ctx.beginPath();
        ctx.arc(x, y, s * 0.25, 0, 2 * Math.PI);
        ctx.stroke();
        // 내원 (채움)
        ctx.beginPath();
        ctx.arc(x, y, s * 0.08, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case 'project': // Folder 아이콘
        ctx.beginPath();
        // 폴더 탭
        ctx.moveTo(x - s * 0.45, y - s * 0.2);
        ctx.lineTo(x - s * 0.45, y - s * 0.35);
        ctx.lineTo(x - s * 0.15, y - s * 0.35);
        ctx.lineTo(x, y - s * 0.2);
        // 폴더 본체
        ctx.lineTo(x + s * 0.45, y - s * 0.2);
        ctx.lineTo(x + s * 0.45, y + s * 0.35);
        ctx.lineTo(x - s * 0.45, y + s * 0.35);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'todo': // CheckSquare 아이콘
        ctx.beginPath();
        // 사각형
        ctx.roundRect(x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8, s * 0.1);
        ctx.stroke();
        // 체크마크
        ctx.beginPath();
        ctx.moveTo(x - s * 0.2, y);
        ctx.lineTo(x - s * 0.05, y + s * 0.15);
        ctx.lineTo(x + s * 0.25, y - s * 0.15);
        ctx.stroke();
        break;

      case 'note': // StickyNote 아이콘
        ctx.beginPath();
        // 노트 본체 (접힌 모서리 제외)
        ctx.moveTo(x + s * 0.15, y - s * 0.4);
        ctx.lineTo(x - s * 0.4, y - s * 0.4);
        ctx.lineTo(x - s * 0.4, y + s * 0.4);
        ctx.lineTo(x + s * 0.4, y + s * 0.4);
        ctx.lineTo(x + s * 0.4, y - s * 0.15);
        ctx.lineTo(x + s * 0.15, y - s * 0.4);
        ctx.stroke();
        // 접힌 부분
        ctx.beginPath();
        ctx.moveTo(x + s * 0.15, y - s * 0.4);
        ctx.lineTo(x + s * 0.15, y - s * 0.15);
        ctx.lineTo(x + s * 0.4, y - s * 0.15);
        ctx.stroke();
        break;
    }
  }, []);

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

      // 노드 타입별 아이콘 그리기
      const iconSize = size * 0.7;
      drawNodeIcon(ctx, node.type, x, y, iconSize);

      // 라벨은 onRenderFramePost에서 별도로 그림 (z-index 문제 해결)
    },
    [selectedNodeId, hoveredNodeId, drawNodeIcon]
  );

  // 모든 노드가 그려진 후 라벨을 별도로 그리기 (z-index 문제 해결)
  const onRenderFramePost = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      // 줌 레벨이 너무 낮으면 라벨 표시 안함
      if (globalScale <= 0.4) return;

      graphData.nodes.forEach((node) => {
        const nodeWithPos = node as GraphNode & { x?: number; y?: number };
        if (nodeWithPos.x === undefined || nodeWithPos.y === undefined) return;

        const x = nodeWithPos.x;
        const y = nodeWithPos.y;
        const baseSize = getNodeSize(node);
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const size = isSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize;

        const labelFontSize = Math.max(8, Math.min(11, 10 / globalScale));
        ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;

        // 제목 텍스트 (최대 길이 제한)
        const maxTitleLength = 15;
        const displayTitle = node.title.length > maxTitleLength
          ? node.title.substring(0, maxTitleLength) + '...'
          : node.title;

        const textWidth = ctx.measureText(displayTitle).width;
        const padding = 3;
        const labelY = y + size + 8;

        // 배경 박스 (호버/선택 시 더 진하게)
        const bgOpacity = isSelected ? 0.85 : isHovered ? 0.75 : 0.6;
        ctx.fillStyle = `rgba(0, 0, 0, ${bgOpacity})`;
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth / 2 - padding,
          labelY - labelFontSize / 2 - padding / 2,
          textWidth + padding * 2,
          labelFontSize + padding,
          3
        );
        ctx.fill();

        // 텍스트
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isSelected || isHovered ? '#fff' : 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(displayTitle, x, labelY);
      });
    },
    [graphData.nodes, selectedNodeId, hoveredNodeId]
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

  // 링크 색상 (테마에 따라 변경)
  const linkColor = useCallback((link: GraphLink) => {
    return getLinkColor(link, isDarkMode);
  }, [isDarkMode]);

  // 링크 너비 (필터 설정에 따라 변경)
  const linkWidthFn = useCallback((link: GraphLink) => {
    return getLinkWidth(link, filter.linkWidth);
  }, [filter.linkWidth]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-base-200 relative"
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
        onBackgroundClick={handleBackgroundClick}
        // 링크 설정
        linkColor={linkColor}
        linkWidth={linkWidthFn}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        // 물리 시뮬레이션 설정
        d3AlphaDecay={0.015}        // 조금 더 느린 냉각 (0.02 → 0.015)
        d3VelocityDecay={0.4}       // 더 빠른 안정화 (0.3 → 0.4)
        warmupTicks={100}           // 초기 안정화 강화 (50 → 100)
        cooldownTicks={150}         // 더 긴 애니메이션 (100 → 150, 약 2.5초)
        cooldownTime={3000}
        // 상호작용 설정
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        onZoom={handleZoom}
        // 라벨을 모든 노드 위에 그리기 위한 후처리
        onRenderFramePost={onRenderFramePost}
        // 배경
        backgroundColor="transparent"
      />
    </div>
  );
}

export default GraphCanvas;
