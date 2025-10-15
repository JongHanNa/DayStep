'use client';

import { useState, useCallback } from 'react';
import {
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  MeasuringStrategy,
} from '@dnd-kit/core';
import type { Modifier } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

/**
 * Capacitor 네이티브 환경 감지
 *
 * @description
 * Capacitor WebView 환경인지 확인합니다.
 * Capacitor는 window.Capacitor 객체를 제공하므로 이를 통해 감지합니다.
 */
const isCapacitorEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as any).Capacitor !== undefined;
};

/**
 * Capacitor WebView 환경을 위한 좌표 보정 modifier (현재 사용 안 함)
 *
 * @description
 * ❌ 이 modifier는 효과가 없어서 제거됨
 *
 * 이유: transform.x/y는 절대 좌표가 아닌 드래그 이동 델타(변화량)입니다.
 * devicePixelRatio로 나누는 것은 초기 위치에 영향을 주지 않고,
 * 오히려 이동 거리를 줄여서 반응이 둔해집니다.
 *
 * DragOverlay의 초기 위치 문제는 dragOverlayProps.style에서 CSS 변수로 해결합니다.
 */
// const adjustForWebView: Modifier = ({ transform }) => {
//   if (!isCapacitorEnvironment()) {
//     return transform;
//   }
//   const scale = window.devicePixelRatio || 1;
//   return {
//     ...transform,
//     x: transform.x / scale,
//     y: transform.y / scale,
//   };
// };

// ❌ Portal 사용으로 더 이상 필요 없음 (제거됨)
// DragOverlay를 document.body에 렌더링하므로 스크롤 컨테이너 보정 불필요
//
// const adjustForScrollContainer: Modifier = ({ transform }) => {
//   const modalBox = document.querySelector('.modal-box');
//   if (!modalBox) return transform;
//   return { ...transform, y: transform.y + modalBox.scrollTop };
// };

export interface UseDndKitOptions<T> {
  /**
   * 드래그가 끝났을 때 호출되는 콜백
   * @param active 드래그된 아이템
   * @param over 드롭된 위치
   */
  onDragEnd: (active: DragStartEvent['active'], over: DragEndEvent['over']) => void;

  /**
   * 활성 아이템을 가져오는 함수 (프리뷰 카드용)
   * @param id 아이템 ID
   */
  getActiveItem?: (id: string) => T | undefined;

  /**
   * 드래그가 취소되었을 때 호출되는 콜백 (선택)
   */
  onDragCancel?: () => void;
}

export interface UseDndKitReturn<T> {
  /**
   * @dnd-kit에서 사용할 센서 설정
   */
  sensors: ReturnType<typeof useSensors>;

  /**
   * 현재 드래그 중인 아이템 (프리뷰 카드 렌더링용)
   */
  activeItem: T | null;

  /**
   * 드래그 시작 핸들러
   */
  handleDragStart: (event: DragStartEvent) => void;

  /**
   * 드래그 종료 핸들러
   */
  handleDragEnd: (event: DragEndEvent) => void;

  /**
   * 드래그 취소 핸들러
   */
  handleDragCancel: () => void;

  /**
   * DndContext에 전달할 공통 props
   */
  dndContextProps: {
    collisionDetection: typeof pointerWithin;
    modifiers: typeof restrictToWindowEdges[];
    measuring: {
      droppable: {
        strategy: MeasuringStrategy;
      };
    };
  };

  /**
   * DragOverlay에 전달할 공통 props
   */
  dragOverlayProps: {
    modifiers: Modifier[];
  };
}

/**
 * @dnd-kit 기반 드래그 앤 드롭을 위한 재사용 가능한 Hook
 *
 * @template T - 드래그되는 아이템의 타입
 * @param options - Hook 옵션
 * @returns 드래그 앤 드롭에 필요한 모든 설정과 핸들러
 *
 * @example
 * ```tsx
 * const { sensors, activeItem, handleDragStart, handleDragEnd, dndContextProps } =
 *   useDndKit<TodoItem>({
 *     onDragEnd: (active, over) => {
 *       // 드롭 로직
 *     },
 *     getActiveItem: (id) => todos.find(t => t.id === id)
 *   });
 *
 * <DndContext
 *   sensors={sensors}
 *   {...dndContextProps}
 *   onDragStart={handleDragStart}
 *   onDragEnd={handleDragEnd}
 * >
 *   {children}
 *   <DragOverlay>
 *     {activeItem && <PreviewCard item={activeItem} />}
 *   </DragOverlay>
 * </DndContext>
 * ```
 */
export function useDndKit<T = unknown>({
  onDragEnd,
  getActiveItem,
  onDragCancel,
}: UseDndKitOptions<T>): UseDndKitReturn<T> {
  const [activeItem, setActiveItem] = useState<T | null>(null);

  // Capacitor 환경 감지
  const isCapacitor = isCapacitorEnvironment();

  // 센서 설정: 웹 브라우저 + Capacitor 모바일 호환
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px 이동 후 드래그 시작 (마우스)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // Capacitor WebView에서는 터치 좌표 부정확도를 보완하기 위해
        // 거리 임계값과 지연 시간을 증가시킵니다
        distance: isCapacitor ? 8 : 5, // WebView: 8px, 브라우저: 5px
        delay: isCapacitor ? 100 : 0,  // WebView: 100ms 지연, 브라우저: 즉시
        tolerance: isCapacitor ? 3 : 0, // WebView: 3px 허용 오차
      },
    })
  );

  // 드래그 시작 핸들러
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (getActiveItem) {
        const item = getActiveItem(event.active.id as string);
        if (item) {
          setActiveItem(item);
        }
      }
    },
    [getActiveItem]
  );

  // 드래그 종료 핸들러
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // 상태 리셋
      setActiveItem(null);

      // 콜백 실행
      onDragEnd(active, over);
    },
    [onDragEnd]
  );

  // 드래그 취소 핸들러
  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    onDragCancel?.();
  }, [onDragCancel]);

  return {
    sensors,
    activeItem,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    dndContextProps: {
      collisionDetection: pointerWithin,
      modifiers: [restrictToWindowEdges],
      measuring: {
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      },
    },
    dragOverlayProps: {
      // Portal로 document.body에 렌더링
      // TimelineDndProvider와 동일하게 restrictToWindowEdges만 사용
      // snapCenterToCursor 제거: X축 드래그 제약 해결
      modifiers: [restrictToWindowEdges] as Modifier[],
    },
  };
}
