/**
 * DnD Context
 * 드래그 앤 드롭 전역 상태 관리
 * - 글로벌 Pan 제스처: 캐러셀 외부에서 처리 → 페이지 전환에도 드래그 유지
 * - DroppableZone 레지스트리 + 활성 드래그 아이템 추적
 * - 연속 스크롤 엣지 감지: 2차 이징 가속 + 목표까지 연속 스크롤
 */
import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
} from 'react';
import {Dimensions, View, Text, StyleSheet} from 'react-native';
import {GestureDetector, Gesture} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type {Todo} from '@daystep/shared-core';
import type {SwipeablePagesRef} from '@/components/core/SwipeablePages';
import {PAGE_WIDTH, PEEK_WIDTH} from '@/components/core/SwipeablePages';
import {resolveTodoIcon} from '@/lib/iconMap';
import {getPriorityColor} from '@/lib/todoUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EDGE_ZONE = 80;           // 엣지 감지 거리 (px)
const EDGE_DWELL_MS = 150;      // 스크롤 시작 전 대기 (실수 방지)
const SCROLL_TICK_MS = 16;      // ~60fps
const MAX_SCROLL_SPEED = 8;     // px/tick (≈480px/s → ~0.73s에 한 페이지)
const PAGE_CHANGE_COOLDOWN_MS = 500;
const hapticOptions = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

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
  width: number;
  height: number;
}

interface DndContextValue {
  // Zone registry
  registerZone: (zone: DropZoneLayout) => void;
  unregisterZone: (id: string) => void;
  getZones: () => DropZoneLayout[];
  findZoneAtPoint: (x: number, y: number) => DropZoneLayout | null;

  // Drag state
  dragState: DragState;
  startDragWithLayout: (
    todo: Todo,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => DropZoneLayout | null;
  cancelDrag: () => void;

  // Active zone (for highlight)
  activeZoneId: string | null;

  // Global Pan ref (DraggableTodoChip에서 simultaneousWithExternalGesture에 사용)
  globalPanRef: React.MutableRefObject<any>;

  // UI 스레드용 드래그 상태 (LongPress에서 설정, Pan에서 체크)
  isDraggingShared: Animated.SharedValue<boolean>;

  // 오버레이 위치 SharedValue (LongPress.onStart에서 사전 설정하여 (0,0) 깜빡임 방지)
  overlayX: Animated.SharedValue<number>;
  overlayY: Animated.SharedValue<number>;

  // 콜백 기반 드래그 종료 — DraggableTodoChip이 등록
  setDragEndCallback: (cb: (() => void) | null) => void;
  setOnDropCallback: (cb: ((zone: DropZoneLayout | null) => void) | null) => void;

  // Page transition
  currentPageRef: React.MutableRefObject<number>;
  setPagesRef: (ref: SwipeablePagesRef | null) => void;

  // Remeasure trigger (페이지 전환 후 드롭존 재측정)
  remeasureTrigger: number;
  triggerRemeasure: () => void;
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
    width: 0,
    height: 0,
  });
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [remeasureTrigger, setRemeasureTrigger] = useState(0);

  // 글로벌 Pan 제스처 ref
  const globalPanRef = useRef<any>(null);
  // UI 스레드용 드래그 상태
  const isDraggingShared = useSharedValue(false);
  // 오버레이 위치 (SharedValue로 UI 스레드 구동)
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);

  // 드래그 위치 ref — 매 프레임 업데이트 (리렌더 방지)
  const dragPositionRef = useRef<{x: number; y: number}>({x: 0, y: 0});
  const activeZoneIdRef = useRef<string | null>(null);

  // 콜백 기반 드래그 종료
  const dragEndCallbackRef = useRef<(() => void) | null>(null);
  const onDropCallbackRef = useRef<((zone: DropZoneLayout | null) => void) | null>(null);

  const setDragEndCallback = useCallback((cb: (() => void) | null) => {
    dragEndCallbackRef.current = cb;
  }, []);

  const setOnDropCallback = useCallback((cb: ((zone: DropZoneLayout | null) => void) | null) => {
    onDropCallbackRef.current = cb;
  }, []);

  // 연속 스크롤 엔진
  const currentPageRef = useRef<number>(0);
  const pagesRefHolder = useRef<SwipeablePagesRef | null>(null);
  const edgeDwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const edgeScrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPageChangeTimeRef = useRef<number>(0);
  const isScrollingRef = useRef(false);
  const currentScrollDirectionRef = useRef<'next' | 'prev' | null>(null);

  // --- Zone registry ---
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

  // --- 연속 스크롤 엔진 ---
  const setPagesRef = useCallback((ref: SwipeablePagesRef | null) => {
    pagesRefHolder.current = ref;
  }, []);

  const stopEdgeScroll = useCallback((snap: boolean) => {
    if (edgeDwellTimerRef.current) {
      clearTimeout(edgeDwellTimerRef.current);
      edgeDwellTimerRef.current = null;
    }
    if (edgeScrollIntervalRef.current) {
      clearInterval(edgeScrollIntervalRef.current);
      edgeScrollIntervalRef.current = null;
    }
    isScrollingRef.current = false;
    currentScrollDirectionRef.current = null;
    if (snap && pagesRefHolder.current) {
      pagesRefHolder.current.snapToNearestPage();
    }
  }, []);

  const triggerRemeasure = useCallback(() => {
    setRemeasureTrigger(prev => prev + 1);
  }, []);

  const startContinuousScroll = useCallback((direction: 'next' | 'prev') => {
    ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    isScrollingRef.current = true;
    const targetPage = direction === 'next'
      ? currentPageRef.current + 1
      : currentPageRef.current - 1;
    const startPage = currentPageRef.current;
    const snapOffset = (page: number) => page === 0 ? 0 : page * PAGE_WIDTH - PEEK_WIDTH;
    const targetPosition = snapOffset(targetPage);
    const midpoint = (snapOffset(startPage) + snapOffset(targetPage)) / 2;
    let pageChangeCommitted = false;

    edgeScrollIntervalRef.current = setInterval(() => {
      const pages = pagesRefHolder.current;
      if (!pages) return;

      const {x} = dragPositionRef.current;
      const proximity = direction === 'next'
        ? SCREEN_WIDTH - x
        : x;

      // 엣지 존 벗어남 → 중지 (snap 안 함 — updateDrag에서 이미 처리)
      if (proximity >= EDGE_ZONE) {
        stopEdgeScroll(false);
        return;
      }

      // 2차 이징 속도 계산
      const ratio = (EDGE_ZONE - proximity) / EDGE_ZONE;
      const speed = MAX_SCROLL_SPEED * ratio * ratio;
      const dx = direction === 'next' ? speed : -speed;
      pages.scrollByPixels(dx);

      const scrollPos = pages.getScrollPosition();

      // 50% 임계값 — 페이지 전환 확정 (1회만)
      if (!pageChangeCommitted) {
        const passed = direction === 'next'
          ? scrollPos > midpoint
          : scrollPos < midpoint;
        if (passed) {
          pageChangeCommitted = true;
          currentPageRef.current = targetPage;
          lastPageChangeTimeRef.current = Date.now();
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          setTimeout(() => triggerRemeasure(), 400);
        }
      }

      // 목표 위치 도달 → 스크롤 완료
      const reached = direction === 'next'
        ? scrollPos >= targetPosition
        : scrollPos <= targetPosition;
      if (reached) {
        if (!pageChangeCommitted) {
          currentPageRef.current = targetPage;
          lastPageChangeTimeRef.current = Date.now();
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
          setTimeout(() => triggerRemeasure(), 400);
        }
        clearInterval(edgeScrollIntervalRef.current!);
        edgeScrollIntervalRef.current = null;
        isScrollingRef.current = false;
        currentScrollDirectionRef.current = null;
      }
    }, SCROLL_TICK_MS);
  }, [stopEdgeScroll, triggerRemeasure]);

  const handleEdgeProximity = useCallback((direction: 'next' | 'prev') => {
    // 방향 변경 → 기존 스크롤 중단, dwell 재시작
    if (currentScrollDirectionRef.current && currentScrollDirectionRef.current !== direction) {
      stopEdgeScroll(false);
    }
    currentScrollDirectionRef.current = direction;

    // 이미 스크롤 중 → interval이 proximity 기반 속도 조절
    if (isScrollingRef.current) return;

    // 이미 dwell 대기 중
    if (edgeDwellTimerRef.current) return;

    // dwell 타이머 시작
    edgeDwellTimerRef.current = setTimeout(() => {
      edgeDwellTimerRef.current = null;
      startContinuousScroll(direction);
    }, EDGE_DWELL_MS);
  }, [stopEdgeScroll, startContinuousScroll]);

  // --- Drag state ---
  const startDragWithLayout = useCallback(
    (todo: Todo, x: number, y: number, width: number, height: number) => {
      // overlayX/Y 사전 설정 — DragOverlay 마운트 시 (0,0) 깜빡임 방지
      overlayX.value = x;
      overlayY.value = y;
      dragPositionRef.current = {x, y};
      setDragState({todo, x, y, isDragging: true, width, height});
    },
    [overlayX, overlayY],
  );

  const updateDrag = useCallback(
    (x: number, y: number) => {
      // ref만 업데이트 — setDragState 호출 안 함 → 리렌더 방지
      dragPositionRef.current = {x, y};

      // zone 변경 시만 setState
      const zone = findZoneAtPoint(x, y);
      const newZoneId = zone?.id ?? null;
      if (newZoneId !== activeZoneIdRef.current) {
        activeZoneIdRef.current = newZoneId;
        setActiveZoneId(newZoneId);
      }

      // --- 연속 스크롤 엣지 감지 ---
      // 이미 스크롤 중이면 interval이 자체 관리 (proximity 기반 속도/정지) → 간섭 안 함
      if (isScrollingRef.current) return;

      const rightProximity = SCREEN_WIDTH - x;
      const leftProximity = x;
      const now = Date.now();
      const inCooldown = now - lastPageChangeTimeRef.current < PAGE_CHANGE_COOLDOWN_MS;

      if (!inCooldown && rightProximity < EDGE_ZONE && pagesRefHolder.current && currentPageRef.current < 1) {
        handleEdgeProximity('next');
      } else if (!inCooldown && leftProximity < EDGE_ZONE && pagesRefHolder.current && currentPageRef.current > 0) {
        handleEdgeProximity('prev');
      } else {
        if (edgeDwellTimerRef.current) {
          stopEdgeScroll(false);  // dwell timer만 정리
        }
      }
    },
    [findZoneAtPoint, handleEdgeProximity, stopEdgeScroll],
  );

  const endDrag = useCallback((): DropZoneLayout | null => {
    // dragPositionRef에서 최신 위치 사용 (setDragState 안 하므로 dragState.x/y는 최초값)
    const {x, y} = dragPositionRef.current;
    const zone = findZoneAtPoint(x, y);
    setDragState({todo: null, x: 0, y: 0, isDragging: false, width: 0, height: 0});
    setActiveZoneId(null);
    activeZoneIdRef.current = null;
    isDraggingShared.value = false;
    stopEdgeScroll(true);
    dragEndCallbackRef.current?.();
    dragEndCallbackRef.current = null;
    return zone;
  }, [findZoneAtPoint, isDraggingShared, stopEdgeScroll]);

  const cancelDrag = useCallback(() => {
    setDragState({todo: null, x: 0, y: 0, isDragging: false, width: 0, height: 0});
    setActiveZoneId(null);
    activeZoneIdRef.current = null;
    isDraggingShared.value = false;
    stopEdgeScroll(true);
    dragEndCallbackRef.current?.();
    dragEndCallbackRef.current = null;
  }, [isDraggingShared, stopEdgeScroll]);

  /** Global Pan의 onEnd에서 호출 — 드롭존 판정 + 콜백 실행 */
  const endDragFromPan = useCallback(() => {
    const zone = endDrag();
    onDropCallbackRef.current?.(zone);
    onDropCallbackRef.current = null;
  }, [endDrag]);

  // --- 글로벌 Pan 제스처 (캐러셀 외부) ---
  const globalPanGesture = Gesture.Pan()
    .withRef(globalPanRef)
    .manualActivation(true)
    .onTouchesMove((_e, state) => {
      if (isDraggingShared.value) {
        state.activate();
      }
    })
    .onUpdate(e => {
      overlayX.value = e.absoluteX;
      overlayY.value = e.absoluteY;
      runOnJS(updateDrag)(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => {
      // Pan이 끝나면 드롭존 판정 + 콜백 실행
      if (isDraggingShared.value) {
        isDraggingShared.value = false; // onFinalize 중복 방지
        runOnJS(endDragFromPan)();
      }
    })
    .onFinalize(() => {
      // 안전망 — onEnd에서 처리 못한 경우
      if (isDraggingShared.value) {
        isDraggingShared.value = false;
        runOnJS(endDragFromPan)();
      }
    });

  return (
    <DndCtx.Provider
      value={{
        registerZone,
        unregisterZone,
        getZones,
        findZoneAtPoint,
        dragState,
        startDragWithLayout,
        updateDrag,
        endDrag,
        cancelDrag,
        activeZoneId,
        globalPanRef,
        isDraggingShared,
        overlayX,
        overlayY,
        setDragEndCallback,
        setOnDropCallback,
        currentPageRef,
        setPagesRef,
        remeasureTrigger,
        triggerRemeasure,
      }}>
      <GestureDetector gesture={globalPanGesture}>
        <Animated.View style={{flex: 1}}>
          {children}
        </Animated.View>
      </GestureDetector>
      {/* 글로벌 드래그 오버레이 — 풀사이즈 카드 */}
      {dragState.isDragging && dragState.todo && (
        <DragOverlay
          todo={dragState.todo}
          overlayX={overlayX}
          overlayY={overlayY}
          width={dragState.width}
          height={dragState.height}
        />
      )}
    </DndCtx.Provider>
  );
}

/**
 * 드래그 중 표시되는 풀사이즈 고스트 카드
 * SharedValue로 위치 구동 → 60fps
 */
function DragOverlay({
  todo,
  overlayX,
  overlayY,
  width,
  height,
}: {
  todo: Todo;
  overlayX: Animated.SharedValue<number>;
  overlayY: Animated.SharedValue<number>;
  width: number;
  height: number;
}) {
  const IconComp = resolveTodoIcon(todo.icon);
  const priorityColor = getPriorityColor(todo.importance, todo.urgency);

  const animatedStyle = useAnimatedStyle(() => ({
    left: overlayX.value - width / 2,
    top: overlayY.value - height / 2,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[overlayStyles.container, {width}, animatedStyle]}>
      {/* 우선순위 바 */}
      {priorityColor && (
        <View
          style={[overlayStyles.priorityBar, {backgroundColor: priorityColor}]}
        />
      )}

      {/* 아이콘 + 제목 */}
      <View style={overlayStyles.content}>
        {IconComp && (
          <IconComp size={16} color="#6B7280" style={{marginRight: 6}} />
        )}
        <Text style={overlayStyles.title} numberOfLines={2}>
          {todo.title}
        </Text>
      </View>

      {/* 태그 */}
      {todo.is_reluctant_must_do && (
        <View style={overlayStyles.tagRow}>
          <View style={overlayStyles.tag}>
            <Text style={overlayStyles.tagText}>😤 해야 할 일</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 100,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    opacity: 0.85,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    overflow: 'hidden',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
  },
});
