/**
 * GraphCanvas - 그래프 렌더링 캔버스
 * ForceGraph2D를 사용하여 노드와 링크를 시각화
 */

'use client';

import { useRef, useCallback, useEffect, useState, ComponentType } from 'react';
import ForceGraph2DComponent from './ForceGraph2DWrapper';
import type { GraphNode, GraphLink, GraphData, GraphAnimationMode } from '@/types/graph';
import { useGraphStore, useGraphSelectedNode, useGraphHoveredNode, useGraphFilter, useGraphActionMenu, useGraphPopover, useGraphFocus, useGraphMultiSelection } from '@/state/stores/graphStore';
import { getNodeSize, getLinkColor, getLinkWidth, NODE_TYPE_LABELS } from '@/lib/graph-utils';
import type { GraphNodeType } from '@/types/graph';
import { useTheme } from '@/hooks/useTheme';

// 사각형 선택 영역 타입
interface MarqueeRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// react-force-graph-2d의 제네릭 타입이 복잡하여 타입 캐스팅 사용
const ForceGraph2D = ForceGraph2DComponent as ComponentType<Record<string, unknown>>;

interface GraphCanvasProps {
  graphData: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
  onMultiSelect?: (nodeIds: string[]) => void;
  shouldZoomToFit?: boolean;           // 새로고침 시 zoomToFit 트리거
  onZoomToFitComplete?: () => void;    // zoomToFit 완료 콜백
}

export function GraphCanvas({ graphData, onNodeClick, onBackgroundClick, onMultiSelect, shouldZoomToFit, onZoomToFitComplete }: GraphCanvasProps) {
  const graphRef = useRef<unknown>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 초기 로드 및 zoomToFit 상태
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const shouldZoomToFitRef = useRef(false);

  // 애니메이션 상태 관리
  type AnimationPhase = 'simulating' | 'ready' | 'animating' | 'done';
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('simulating');
  const [nodeVisibility, setNodeVisibility] = useState<Map<string, { opacity: number; scale: number }>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  // 마퀴 선택 상태
  const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const marqueeStartRef = useRef<{ x: number; y: number; graphX: number; graphY: number } | null>(null);

  const selectedNodeId = useGraphSelectedNode();
  const hoveredNodeId = useGraphHoveredNode();
  const filter = useGraphFilter();
  const { isOpen: isActionMenuOpen, node: actionMenuNode } = useGraphActionMenu();
  const { activePopover } = useGraphPopover();
  const { focusNodeId, clearFocusNode } = useGraphFocus();
  const { selectedNodeIds, setSelectedNodeIds, clearMultiSelection, setMarqueeSelecting } = useGraphMultiSelection();
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

  // 새 노드 생성 시 포커스 (줌 + 중앙 이동)
  useEffect(() => {
    if (!focusNodeId || !graphRef.current) return;

    const fg = graphRef.current as any;
    const node = graphData.nodes.find((n) => n.id === focusNodeId) as GraphNode & { x?: number; y?: number };

    if (node && node.x !== undefined && node.y !== undefined) {
      // 해당 노드로 부드럽게 이동 + 줌
      fg.centerAt(node.x, node.y, 500);
      fg.zoom(1.5, 500);
      // 노드 선택 상태로 설정
      setSelectedNode(focusNodeId);
      // 포커스 상태 초기화
      clearFocusNode();
    }
  }, [focusNodeId, graphData.nodes, setSelectedNode, clearFocusNode]);

  // 노드 클릭 핸들러
  const handleNodeClick = useCallback(
    (node: GraphNode | null, event?: MouseEvent) => {
      if (!node) return;

      // 다중 선택 초기화 (노드를 직접 클릭하면 다중 선택 해제)
      if (selectedNodeIds.length > 0) {
        clearMultiSelection();
      }

      setSelectedNode(node.id);

      // 모든 노드에 액션 메뉴 표시 (편집/삭제 선택)
      if (event && containerRef.current) {
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
      }
      onNodeClick?.(node as GraphNode);
    },
    [setSelectedNode, openEditModal, openActionMenu, closeActionMenu, isActionMenuOpen, actionMenuNode, onNodeClick, selectedNodeIds.length, clearMultiSelection]
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
    // 다중 선택 해제
    clearMultiSelection();
    onBackgroundClick?.();
  }, [setSelectedNode, setHoveredNode, closeActionMenu, activePopover, clearMultiSelection, onBackgroundClick]);

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

  // 안전한 zoomToFit - 줌인 방지 (줌아웃만 허용)
  const safeZoomToFit = useCallback((duration: number = 500, padding: number = 50) => {
    const fg = graphRef.current as any;
    if (!fg || graphData.nodes.length === 0) return;

    const currentZoom = fg.zoom(); // 현재 줌 레벨 저장
    fg.zoomToFit(0, padding);      // 즉시 fit 계산
    const fittedZoom = fg.zoom();  // fit된 줌 레벨 확인

    if (fittedZoom > currentZoom) {
      // 줌인이면 원래 줌 레벨로 복원 + 중심만 이동
      fg.zoom(currentZoom, 0);
      // 노드 중심으로 카메라 이동
      const avgX = graphData.nodes.reduce((sum, n: any) => sum + (n.x || 0), 0) / graphData.nodes.length;
      const avgY = graphData.nodes.reduce((sum, n: any) => sum + (n.y || 0), 0) / graphData.nodes.length;
      fg.centerAt(avgX, avgY, duration);
    }
    // 줌아웃인 경우 이미 적용됨 (0ms로 즉시 적용)
  }, [graphData.nodes]);

  // shouldZoomToFit prop 변경 감지
  useEffect(() => {
    if (shouldZoomToFit) {
      shouldZoomToFitRef.current = true;
    }
  }, [shouldZoomToFit]);

  // 모드별 시뮬레이션 설정
  const getSimulationConfig = useCallback((mode: GraphAnimationMode) => {
    const configs = {
      fast: { warmupTicks: 200, cooldownTicks: 100, cooldownTime: 1500 },
      fade: { warmupTicks: 150, cooldownTicks: 80, cooldownTime: 1500 },
      'scale-fade': { warmupTicks: 150, cooldownTicks: 80, cooldownTime: 1500 },
      ripple: { warmupTicks: 200, cooldownTicks: 50, cooldownTime: 1000 }
    };
    return configs[mode];
  }, []);

  // Easing 함수 (부드러운 애니메이션)
  const easeOutCubic = useCallback((t: number) => 1 - Math.pow(1 - t, 3), []);

  // 일괄 애니메이션 트리거 (fade, scale-fade)
  const triggerBatchAnimation = useCallback(() => {
    setAnimationPhase('animating');
    const duration = filter.animationMode === 'fade' ? 300 : 400;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = easeOutCubic(progress);

      const newVisibility = new Map<string, { opacity: number; scale: number }>();
      graphData.nodes.forEach(node => {
        newVisibility.set(node.id, {
          opacity: eased,
          scale: filter.animationMode === 'scale-fade' ? 0.5 + 0.5 * eased : 1
        });
      });
      setNodeVisibility(newVisibility);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setAnimationPhase('done');
        animationFrameRef.current = null;
      }
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [filter.animationMode, graphData.nodes, easeOutCubic]);

  // 순차 애니메이션 트리거 (ripple)
  const triggerRippleAnimation = useCallback(() => {
    setAnimationPhase('animating');

    // 연결 수 계산
    const connectionCount = new Map<string, number>();
    graphData.nodes.forEach(node => connectionCount.set(node.id, 0));
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      connectionCount.set(sourceId, (connectionCount.get(sourceId) || 0) + 1);
      connectionCount.set(targetId, (connectionCount.get(targetId) || 0) + 1);
    });

    // 연결 수 기준 정렬 (많은 순)
    const sortedNodes = [...graphData.nodes].sort((a, b) =>
      (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    );

    // 초기 상태: 모두 숨김
    const initialVisibility = new Map<string, { opacity: number; scale: number }>();
    graphData.nodes.forEach(node => {
      initialVisibility.set(node.id, { opacity: 0, scale: 0.5 });
    });
    setNodeVisibility(initialVisibility);

    // 순차적으로 노드 등장
    const delay = 40; // 노드 간 딜레이 (ms)
    const duration = 250; // 개별 애니메이션 시간 (ms)

    sortedNodes.forEach((node, index) => {
      setTimeout(() => {
        const startTime = performance.now();

        const animateNode = (time: number) => {
          const progress = Math.min((time - startTime) / duration, 1);
          const eased = easeOutCubic(progress);

          setNodeVisibility(prev => {
            const newMap = new Map(prev);
            newMap.set(node.id, {
              opacity: eased,
              scale: 0.5 + 0.5 * eased
            });
            return newMap;
          });

          if (progress < 1) {
            requestAnimationFrame(animateNode);
          } else if (index === sortedNodes.length - 1) {
            setAnimationPhase('done');
          }
        };
        requestAnimationFrame(animateNode);
      }, index * delay);
    });
  }, [graphData.nodes, graphData.links, easeOutCubic]);

  // 애니메이션 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // graphData 변경 시 애니메이션 상태 초기화
  useEffect(() => {
    if (graphData.nodes.length > 0) {
      setAnimationPhase('simulating');
      // 모든 모드: 시뮬레이션 완료 전까지 노드 숨김 (겹침 현상 방지)
      const hiddenVisibility = new Map<string, { opacity: number; scale: number }>();
      graphData.nodes.forEach(node => {
        hiddenVisibility.set(node.id, { opacity: 0, scale: filter.animationMode === 'scale-fade' ? 0.5 : 1 });
      });
      setNodeVisibility(hiddenVisibility);
    }
  }, [graphData.nodes, filter.animationMode]);

  // onEngineStop 핸들러 - 시뮬레이션 완료 시 zoomToFit 및 애니메이션 실행
  const handleEngineStop = useCallback(() => {
    // 첫 로드 시 zoomToFit
    if (!isInitialLoadComplete && graphData.nodes.length > 0) {
      safeZoomToFit(500, 50);
      setIsInitialLoadComplete(true);
    }

    // 새로고침 시 zoomToFit
    if (shouldZoomToFitRef.current) {
      safeZoomToFit(500, 50);
      shouldZoomToFitRef.current = false;
      onZoomToFitComplete?.();
    }

    // 시뮬레이션 완료 시 애니메이션 트리거
    if (animationPhase === 'simulating' && graphData.nodes.length > 0) {
      if (filter.animationMode === 'fast') {
        // fast 모드: 시뮬레이션 완료 후 즉시 표시 (애니메이션 없음)
        const fullVisibility = new Map<string, { opacity: number; scale: number }>();
        graphData.nodes.forEach(node => {
          fullVisibility.set(node.id, { opacity: 1, scale: 1 });
        });
        setNodeVisibility(fullVisibility);
        setAnimationPhase('done');
      } else if (filter.animationMode === 'fade' || filter.animationMode === 'scale-fade') {
        // fade/scale-fade: 일괄 애니메이션
        triggerBatchAnimation();
      } else if (filter.animationMode === 'ripple') {
        // ripple: 순차 애니메이션
        triggerRippleAnimation();
      }
    }
  }, [isInitialLoadComplete, graphData.nodes.length, safeZoomToFit, onZoomToFitComplete, animationPhase, filter.animationMode, triggerBatchAnimation, triggerRippleAnimation]);

  // 화면 좌표를 그래프 좌표로 변환
  const screenToGraph = useCallback((screenX: number, screenY: number) => {
    if (!graphRef.current) return { x: screenX, y: screenY };
    const fg = graphRef.current as any;
    return fg.screen2GraphCoords(screenX, screenY);
  }, []);

  // 마퀴 선택 시작 핸들러
  const handleMarqueeStart = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;
    const graphCoords = screenToGraph(x, y);

    marqueeStartRef.current = {
      x,
      y,
      graphX: graphCoords.x,
      graphY: graphCoords.y
    };
    setIsMarqueeActive(true);
    setMarqueeSelecting(true);
    setMarqueeRect({
      startX: x,
      startY: y,
      endX: x,
      endY: y
    });

    // 기존 선택 초기화 (새로운 마퀴 선택 시작)
    setSelectedNode(null);
    closeActionMenu();
  }, [screenToGraph, setMarqueeSelecting, setSelectedNode, closeActionMenu]);

  // 마퀴 선택 이동 핸들러
  const handleMarqueeMove = useCallback((clientX: number, clientY: number) => {
    if (!isMarqueeActive || !containerRef.current || !marqueeStartRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;

    setMarqueeRect({
      startX: marqueeStartRef.current.x,
      startY: marqueeStartRef.current.y,
      endX: x,
      endY: y
    });
  }, [isMarqueeActive]);

  // 마퀴 선택 종료 핸들러
  const handleMarqueeEnd = useCallback(() => {
    if (!isMarqueeActive || !marqueeRect) {
      setIsMarqueeActive(false);
      setMarqueeSelecting(false);
      setMarqueeRect(null);
      marqueeStartRef.current = null;
      return;
    }

    // 선택 영역의 그래프 좌표 계산
    const startCoords = screenToGraph(marqueeRect.startX, marqueeRect.startY);
    const endCoords = screenToGraph(marqueeRect.endX, marqueeRect.endY);

    const minX = Math.min(startCoords.x, endCoords.x);
    const maxX = Math.max(startCoords.x, endCoords.x);
    const minY = Math.min(startCoords.y, endCoords.y);
    const maxY = Math.max(startCoords.y, endCoords.y);

    // 선택 영역 내의 노드들 찾기
    const selectedIds = graphData.nodes
      .filter((node) => {
        const nodeWithPos = node as GraphNode & { x?: number; y?: number };
        if (nodeWithPos.x === undefined || nodeWithPos.y === undefined) return false;
        return (
          nodeWithPos.x >= minX &&
          nodeWithPos.x <= maxX &&
          nodeWithPos.y >= minY &&
          nodeWithPos.y <= maxY
        );
      })
      .map((node) => node.id);

    // 선택된 노드들 설정
    if (selectedIds.length > 0) {
      setSelectedNodeIds(selectedIds);
      onMultiSelect?.(selectedIds);
    } else {
      clearMultiSelection();
    }

    setIsMarqueeActive(false);
    setMarqueeSelecting(false);
    setMarqueeRect(null);
    marqueeStartRef.current = null;
  }, [isMarqueeActive, marqueeRect, screenToGraph, graphData.nodes, setSelectedNodeIds, clearMultiSelection, setMarqueeSelecting, onMultiSelect]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 마우스 왼쪽 버튼 + Shift 키 조합만 처리
    if (e.button !== 0) return;
    if (!e.shiftKey) return;

    e.preventDefault();
    e.stopPropagation();
    handleMarqueeStart(e.clientX, e.clientY);
  }, [handleMarqueeStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Shift 키 + 드래그 중이면 마퀴 선택 시작 (세 손가락 드래그 지원)
    // e.buttons === 1: 왼쪽 마우스 버튼이 눌린 상태
    // e.buttons === 0: 버튼 없이 드래그 (세 손가락 터치패드 드래그)
    if (e.shiftKey && !isMarqueeActive && !marqueeStartRef.current) {
      // 마우스 버튼이 눌려있거나, 이동 거리가 있으면 마퀴 선택 시작
      if (e.buttons === 1 || e.buttons === 0) {
        handleMarqueeStart(e.clientX, e.clientY);
        return;
      }
    }

    if (!isMarqueeActive) return;
    handleMarqueeMove(e.clientX, e.clientY);
  }, [isMarqueeActive, handleMarqueeMove, handleMarqueeStart]);

  const handleMouseUp = useCallback(() => {
    if (!isMarqueeActive) return;
    handleMarqueeEnd();
  }, [isMarqueeActive, handleMarqueeEnd]);

  // 컨테이너 외부에서 마우스를 놓았을 때 처리
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMarqueeActive) {
        handleMarqueeEnd();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isMarqueeActive, handleMarqueeEnd]);

  // Shift 키 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      // ESC 키로 선택 해제
      if (e.key === 'Escape') {
        if (isMarqueeActive) {
          // 마퀴 선택 중이면 취소
          setIsMarqueeActive(false);
          setMarqueeRect(null);
          marqueeStartRef.current = null;
          setMarqueeSelecting(false);
        } else if (selectedNodeIds.length > 0) {
          // 선택된 노드가 있으면 선택 해제
          clearMultiSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        // Shift 키를 놓으면 마퀴 선택 종료
        if (isMarqueeActive) {
          handleMarqueeEnd();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMarqueeActive, handleMarqueeEnd, selectedNodeIds.length, clearMultiSelection, setMarqueeSelecting]);

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
      // 애니메이션 visibility 적용
      const visibility = nodeVisibility.get(node.id) || { opacity: 1, scale: 1 };
      if (visibility.opacity <= 0) return; // 완전 투명이면 렌더링 스킵

      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isMultiSelected = selectedNodeIds.includes(node.id);
      const baseSize = getNodeSize(node);
      const rawSize = isSelected || isMultiSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize;
      const size = rawSize * visibility.scale; // 스케일 애니메이션 적용

      const x = node.x ?? 0;
      const y = node.y ?? 0;

      // globalAlpha 저장 및 설정
      const prevAlpha = ctx.globalAlpha;
      ctx.globalAlpha = visibility.opacity;

      // 다중 선택 시 강조 효과 (청록색 글로우)
      if (isMultiSelected) {
        ctx.beginPath();
        ctx.arc(x, y, size + 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.3)'; // sky-400 with opacity
        ctx.fill();

        // 다중 선택 테두리 (점선 효과를 위한 이중 원)
        ctx.beginPath();
        ctx.arc(x, y, size + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // 단일 선택/호버 시 글로우 효과
      else if (isSelected || isHovered) {
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
      if (isSelected || isMultiSelected) {
        ctx.strokeStyle = isMultiSelected ? 'rgba(56, 189, 248, 1)' : '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 노드 타입별 아이콘 그리기
      const iconSize = size * 0.7;
      drawNodeIcon(ctx, node.type, x, y, iconSize);

      // globalAlpha 복원
      ctx.globalAlpha = prevAlpha;

      // 라벨은 onRenderFramePost에서 별도로 그림 (z-index 문제 해결)
    },
    [selectedNodeId, hoveredNodeId, selectedNodeIds, drawNodeIcon, nodeVisibility]
  );

  // 모든 노드가 그려진 후 라벨을 별도로 그리기 (z-index 문제 해결)
  const onRenderFramePost = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      // 줌 레벨이 너무 낮으면 라벨 표시 안함
      if (globalScale <= 0.4) return;

      // 화면 중앙 x 좌표 계산
      const centerX = dimensions.width / 2;

      graphData.nodes.forEach((node) => {
        const nodeWithPos = node as GraphNode & { x?: number; y?: number };
        if (nodeWithPos.x === undefined || nodeWithPos.y === undefined) return;

        // 애니메이션 visibility 적용 (라벨도 노드와 함께 페이드인)
        const visibility = nodeVisibility.get(node.id) || { opacity: 1, scale: 1 };
        if (visibility.opacity <= 0) return; // 완전 투명이면 라벨도 스킵

        const x = nodeWithPos.x;
        const y = nodeWithPos.y;
        const baseSize = getNodeSize(node);
        const isSelected = node.id === selectedNodeId;
        const isHovered = node.id === hoveredNodeId;
        const isMultiSelected = selectedNodeIds.includes(node.id);
        const rawSize = isSelected || isMultiSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize;
        const size = rawSize * visibility.scale;

        // globalAlpha 저장 및 설정
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha = visibility.opacity;

        const labelFontSize = Math.max(8, Math.min(11, 10 / globalScale));
        ctx.font = `500 ${labelFontSize}px Inter, system-ui, sans-serif`;

        // 제목 텍스트 (최대 길이 제한)
        const maxTitleLength = 15;
        const displayTitle = node.title.length > maxTitleLength
          ? node.title.substring(0, maxTitleLength) + '...'
          : node.title;

        const textWidth = ctx.measureText(displayTitle).width;
        const padding = 3;

        // 노드 위치에 따라 라벨 위치 결정 (좌우 대칭)
        const isLeftSide = x < centerX;
        const labelY = y + size / 2 + 5; // 노드 아래쪽
        const labelX = isLeftSide
          ? x - size - 8  // 왼쪽 노드: 노드 왼쪽에 라벨
          : x + size + 8; // 오른쪽 노드: 노드 오른쪽에 라벨
        const textAlign = isLeftSide ? 'right' : 'left';

        // 배경 박스 (호버/선택/다중선택 시 더 진하게)
        const bgOpacity = isMultiSelected ? 0.85 : isSelected ? 0.85 : isHovered ? 0.75 : 0.6;
        ctx.fillStyle = isMultiSelected ? 'rgba(56, 189, 248, 0.9)' : `rgba(0, 0, 0, ${bgOpacity})`;
        ctx.beginPath();

        // 텍스트 정렬에 따른 배경 박스 위치 조정
        const boxX = isLeftSide
          ? labelX - textWidth - padding
          : labelX - padding;

        ctx.roundRect(
          boxX,
          labelY - labelFontSize / 2 - padding / 2,
          textWidth + padding * 2,
          labelFontSize + padding,
          3
        );
        ctx.fill();

        // 텍스트
        ctx.textAlign = textAlign as CanvasTextAlign;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isSelected || isHovered || isMultiSelected ? '#fff' : 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(displayTitle, labelX, labelY);

        // globalAlpha 복원
        ctx.globalAlpha = prevAlpha;
      });
    },
    [graphData.nodes, selectedNodeId, hoveredNodeId, selectedNodeIds, dimensions.width, nodeVisibility]
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

  // 링크 visibility (노드 애니메이션과 동기화 - 시뮬레이션 중에는 숨김)
  const linkVisibility = useCallback(() => {
    return animationPhase !== 'simulating';
  }, [animationPhase]);

  // 사각형 선택 영역 스타일 계산
  const getMarqueeStyle = useCallback(() => {
    if (!marqueeRect) return {};

    const left = Math.min(marqueeRect.startX, marqueeRect.endX);
    const top = Math.min(marqueeRect.startY, marqueeRect.endY);
    const width = Math.abs(marqueeRect.endX - marqueeRect.startX);
    const height = Math.abs(marqueeRect.endY - marqueeRect.startY);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  }, [marqueeRect]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-base-200 relative ${isShiftPressed ? 'cursor-crosshair' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={(e) => {
        // 빈 공간 클릭 시만 처리 (마퀴 선택 중이 아닐 때)
        if (e.target === containerRef.current && !isMarqueeActive) {
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
        linkVisibility={linkVisibility}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        // 물리 시뮬레이션 설정 (애니메이션 모드별 동적 적용)
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
        warmupTicks={getSimulationConfig(filter.animationMode).warmupTicks}
        cooldownTicks={getSimulationConfig(filter.animationMode).cooldownTicks}
        cooldownTime={getSimulationConfig(filter.animationMode).cooldownTime}
        // 상호작용 설정
        enableZoomInteraction={true}
        enablePanInteraction={!isMarqueeActive && !isShiftPressed}
        enableNodeDrag={!isMarqueeActive && !isShiftPressed}
        onZoom={handleZoom}
        onEngineStop={handleEngineStop}
        // 라벨을 모든 노드 위에 그리기 위한 후처리
        onRenderFramePost={onRenderFramePost}
        // 배경
        backgroundColor="transparent"
      />

      {/* Shift 키 안내 메시지 */}
      {isShiftPressed && !isMarqueeActive && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-sky-500 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          </svg>
          드래그하여 영역 선택
        </div>
      )}

      {/* 사각형 선택 영역 오버레이 */}
      {isMarqueeActive && marqueeRect && (
        <div
          className="absolute pointer-events-none border-2 border-sky-400 bg-sky-400/20 rounded-sm"
          style={getMarqueeStyle()}
        />
      )}
    </div>
  );
}

export default GraphCanvas;
