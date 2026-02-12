/**
 * DnD Context
 * 드래그 앤 드롭 전역 상태 관리
 * DroppableZone 레지스트리 + 활성 드래그 아이템 추적
 * 크로스 페이지 드래그: 엣지 감지 → 페이지 전환 콜백
 */
import React, {createContext, useContext, useCallback, useRef, useState} from 'react';
import {Dimensions, View, Text, StyleSheet} from 'react-native';
// Animated import reserved for future use
import type {Todo} from '@daystep/shared-core';
import {resolveTodoIcon} from '@/lib/iconMap';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EDGE_THRESHOLD = 60; // 엣지 감지 거리 (px)

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

  // Page transition
  onRequestPageChange?: (direction: 'next' | 'prev') => void;
  setOnRequestPageChange: (cb: ((direction: 'next' | 'prev') => void) | undefined) => void;
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
  const pageChangeCallbackRef = useRef<((direction: 'next' | 'prev') => void) | undefined>(undefined);
  const pageChangeThrottleRef = useRef<number>(0);

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

      // 엣지 감지 → 페이지 전환
      const now = Date.now();
      if (now - pageChangeThrottleRef.current > 800) {
        if (x > SCREEN_WIDTH - EDGE_THRESHOLD && pageChangeCallbackRef.current) {
          pageChangeThrottleRef.current = now;
          pageChangeCallbackRef.current('next');
        } else if (x < EDGE_THRESHOLD && pageChangeCallbackRef.current) {
          pageChangeThrottleRef.current = now;
          pageChangeCallbackRef.current('prev');
        }
      }
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

  const setOnRequestPageChange = useCallback(
    (cb: ((direction: 'next' | 'prev') => void) | undefined) => {
      pageChangeCallbackRef.current = cb;
    },
    [],
  );

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
        onRequestPageChange: pageChangeCallbackRef.current,
        setOnRequestPageChange,
      }}>
      {children}
      {/* 글로벌 드래그 오버레이 */}
      {dragState.isDragging && dragState.todo && (
        <DragOverlay todo={dragState.todo} x={dragState.x} y={dragState.y} />
      )}
    </DndCtx.Provider>
  );
}

/**
 * 드래그 중 표시되는 플로팅 고스트 칩
 */
function DragOverlay({todo, x, y}: {todo: Todo; x: number; y: number}) {
  const IconComp = resolveTodoIcon(todo.icon);

  return (
    <View
      pointerEvents="none"
      style={[
        overlayStyles.container,
        {
          left: x - 80,
          top: y - 24,
        },
      ]}>
      <View style={overlayStyles.chip}>
        {IconComp && <IconComp size={14} color="#6B7280" style={{marginRight: 4}} />}
        <Text style={overlayStyles.text} numberOfLines={1}>
          {todo.title}
        </Text>
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 100,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 160,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
});
