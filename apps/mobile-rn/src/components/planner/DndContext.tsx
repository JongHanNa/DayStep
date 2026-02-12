/**
 * DnD Context
 * 드래그 앤 드롭 전역 상태 관리
 * DroppableZone 레지스트리 + 활성 드래그 아이템 추적
 */
import React, {createContext, useContext, useCallback, useRef, useState} from 'react';
import type {Todo} from '@daystep/shared-core';

interface DropZoneLayout {
  id: string;
  type: 'matrix' | 'reluctant' | 'time-slot';
  x: number;
  y: number;
  width: number;
  height: number;
  data?: Record<string, any>;
}

interface DragState {
  todo: Todo | null;
  x: number;
  y: number;
  isDragging: boolean;
}

interface DndContextValue {
  // Zone registry
  registerZone: (zone: DropZoneLayout) => void;
  unregisterZone: (id: string) => void;
  getZones: () => DropZoneLayout[];
  findZoneAtPoint: (x: number, y: number) => DropZoneLayout | null;

  // Drag state
  dragState: DragState;
  startDrag: (todo: Todo, x: number, y: number) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => DropZoneLayout | null;
  cancelDrag: () => void;

  // Active zone (for highlight)
  activeZoneId: string | null;
}

const DndCtx = createContext<DndContextValue | null>(null);

export function useDnd() {
  const ctx = useContext(DndCtx);
  if (!ctx) throw new Error('useDnd must be used within DndProvider');
  return ctx;
}

export function DndProvider({children}: {children: React.ReactNode}) {
  const zonesRef = useRef<Map<string, DropZoneLayout>>(new Map());
  const [dragState, setDragState] = useState<DragState>({
    todo: null,
    x: 0,
    y: 0,
    isDragging: false,
  });
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);

  const registerZone = useCallback((zone: DropZoneLayout) => {
    zonesRef.current.set(zone.id, zone);
  }, []);

  const unregisterZone = useCallback((id: string) => {
    zonesRef.current.delete(id);
  }, []);

  const getZones = useCallback(() => {
    return Array.from(zonesRef.current.values());
  }, []);

  const findZoneAtPoint = useCallback(
    (px: number, py: number): DropZoneLayout | null => {
      for (const zone of zonesRef.current.values()) {
        if (
          px >= zone.x &&
          px <= zone.x + zone.width &&
          py >= zone.y &&
          py <= zone.y + zone.height
        ) {
          return zone;
        }
      }
      return null;
    },
    [],
  );

  const startDrag = useCallback((todo: Todo, x: number, y: number) => {
    setDragState({todo, x, y, isDragging: true});
  }, []);

  const updateDrag = useCallback(
    (x: number, y: number) => {
      setDragState(prev => ({...prev, x, y}));
      const zone = findZoneAtPoint(x, y);
      setActiveZoneId(zone?.id ?? null);
    },
    [findZoneAtPoint],
  );

  const endDrag = useCallback((): DropZoneLayout | null => {
    const {x, y} = dragState;
    const zone = findZoneAtPoint(x, y);
    setDragState({todo: null, x: 0, y: 0, isDragging: false});
    setActiveZoneId(null);
    return zone;
  }, [dragState, findZoneAtPoint]);

  const cancelDrag = useCallback(() => {
    setDragState({todo: null, x: 0, y: 0, isDragging: false});
    setActiveZoneId(null);
  }, []);

  return (
    <DndCtx.Provider
      value={{
        registerZone,
        unregisterZone,
        getZones,
        findZoneAtPoint,
        dragState,
        startDrag,
        updateDrag,
        endDrag,
        cancelDrag,
        activeZoneId,
      }}>
      {children}
    </DndCtx.Provider>
  );
}
