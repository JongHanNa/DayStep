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

  // 센서 설정: 웹 브라우저 호환
  // 할일 카드 전체를 꾹 누르면 드래그 시작 (300ms 지연)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 300,        // 300ms 꾹 누르기 후 드래그 시작
        tolerance: 5,      // 5px 이하 움직임 허용 (마우스 떨림 방지)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300,
        tolerance: 5,
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
