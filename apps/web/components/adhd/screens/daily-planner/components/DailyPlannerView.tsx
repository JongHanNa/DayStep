'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence, useAnimation, type PanInfo } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
} from '@dnd-kit/core';
import { pointerWithin } from '@dnd-kit/core';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';

import { useTodoStore } from '@/state/stores/todoStore';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useFocusSession } from '@/components/adhd/hooks/useFocusSession';
import { FocusOverlay } from '@/components/adhd/common/FocusOverlay';
import { FocusSidePanel } from '@/components/adhd/common/FocusSidePanel';
import { useDailyPlannerData } from '../hooks/useDailyPlannerData';
import { TimeSchedulePanel } from './TimeSchedulePanel';
import { PriorityMatrixPanel } from './PriorityMatrixPanel';
import { ReluctantTasksPanel } from './ReluctantTasksPanel';
import { RewardPanel } from './RewardPanel';
import { PraisePanel } from './PraisePanel';
import { GratitudePanel } from './GratitudePanel';
import { DayReflectionBar } from './DayReflectionBar';
import { DraggableTodoChip } from './DraggableTodoChip';
import { ProjectSummaryBar } from './ProjectSummaryBar';
import RecurringUpdateDialog from '@/components/todos/RecurringUpdateDialog';
import { useSubtaskPreload } from '@/hooks/useSubtaskPreload';
import type { Todo } from '@/entities/todo/Todo';
import type { Note } from '@/types/domain';
import type { TimelineItem } from '../../timeline/types';

interface DailyPlannerViewProps {
  userId: string;
  date: Date;
  timelineItems: TimelineItem[];
  showMotivationBadges?: boolean;
  getLinkedMotivations?: (item: TimelineItem) => Note[];
  onEditClick?: (item: TimelineItem) => void;
  onToggleComplete?: (item: TimelineItem) => void;
  onUnskipTodo?: (item: TimelineItem) => void;
  onSkipTodo?: (item: TimelineItem, reason: 'not_needed' | 'missed') => void;
  onOpenPostponeSheet?: (item: TimelineItem) => void;
  onRestoreOriginal?: (item: TimelineItem) => void;
  onAddTodo?: (prefillStart?: Date, prefillEnd?: Date, mode?: 'detailed' | 'new') => void;
}

export function DailyPlannerView({ userId, date, timelineItems, showMotivationBadges, getLinkedMotivations, onEditClick, onToggleComplete, onUnskipTodo, onSkipTodo, onOpenPostponeSheet, onRestoreOriginal, onAddTodo }: DailyPlannerViewProps) {
  const updateTodo = useTodoStore(s => s.updateTodo);
  const updateRecurringTodo = useTodoStore(s => s.updateRecurringTodo);
  const todos = useTodoStore(s => s.todos);
  const { focusMode, startFocus } = useADHDStore();
  // todayTodos는 timelineItems 기반 → 가상 반복 인스턴스 포함, 정확한 timed 할일만
  const {
    todayTodos,
    anytimeTodos,
    deferredTodos,
    morningTodos,
    afternoonTodos,
    eveningTodos,
    matrixTodos,
    reluctantTodos,
    reflection,
    upsertReflection,
    dateStr,
    projectMap,
    departmentMap,
    todayProjectSummary,
  } = useDailyPlannerData({ userId, date, timelineItems });

  // 서브태스크 프리로드
  const todayTodoIds = useMemo(() => todayTodos.map((t: Todo) => t.id), [todayTodos]);
  useSubtaskPreload(todayTodoIds);

  // 프로젝트 하이라이트 필터 상태
  const [highlightProjectId, setHighlightProjectId] = useState<string | null>(null);
  const [expandedMotivationId, setExpandedMotivationId] = useState<string | null>(null);

  // todoId → linked motivations 매핑
  const todoMotivationMap = useMemo(() => {
    if (!showMotivationBadges || !getLinkedMotivations) return {};
    const map: Record<string, { id: string; title: string; content: string }[]> = {};
    for (const item of timelineItems) {
      const motivations = getLinkedMotivations(item);
      if (motivations.length > 0) {
        map[item.id] = motivations.map(f => ({ id: f.id, title: f.title, content: f.content }));
      }
    }
    return map;
  }, [showMotivationBadges, getLinkedMotivations, timelineItems]);

  const focusSession = useFocusSession(todayTodos);

  // 칩에서 포커스 시작
  const handleChipStartFocus = useCallback((todo: Todo) => {
    startFocus(todo, 'inline');
    focusSession.startFocusTimer(todo);
  }, [startFocus, focusSession]);

  // 포커스 오버레이 닫기
  const handleCloseFocus = useCallback(() => {
    focusSession.stop();
  }, [focusSession]);

  // 반복 할일 DnD 다이얼로그 상태
  const [pendingDrop, setPendingDrop] = useState<{todoId: string; updates: any; title: string} | null>(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);

  // DndContext 언마운트 시 잔여 DOM 정리
  useEffect(() => {
    return () => {
      requestAnimationFrame(() => {
        document.querySelectorAll('[id^="DndLiveRegion"], [id^="DndDescribedBy"]')
          .forEach(el => el.remove());
        window.scrollTo(0, 0);
      });
    };
  }, []);

  // Desktop detection (JS-based to avoid duplicate droppable registration)
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 데스크탑 포커스 패널 리사이즈
  const [focusPanelWidth, setFocusPanelWidth] = useState(380);
  const isDraggingSplit = useRef(false);
  const desktopContainerRef = useRef<HTMLDivElement>(null);

  const handleSplitDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplit.current = true;
    const startX = e.clientX;
    const startWidth = focusPanelWidth;

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingSplit.current) return;
      const delta = startX - ev.clientX; // 왼쪽으로 가면 패널 넓어짐
      const container = desktopContainerRef.current;
      const maxW = container ? container.offsetWidth * 0.7 : 800;
      setFocusPanelWidth(Math.max(300, Math.min(startWidth + delta, maxW)));
    };
    const onUp = () => {
      isDraggingSplit.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [focusPanelWidth]);

  // Mobile swipe state
  const [mobilePage, setMobilePage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const swipeControls = useAnimation();

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const PEEK_AMOUNT = 40;
  const GAP = 12;
  const page1Width = containerWidth > 0 ? containerWidth - PEEK_AMOUNT : 0;
  const slideOffset = PEEK_AMOUNT - page1Width - GAP;

  useEffect(() => {
    swipeControls.start({ x: mobilePage === 0 ? 0 : slideOffset });
  }, [mobilePage, slideOffset, swipeControls]);

  // DnD state
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [edgeHover, setEdgeHover] = useState<'left' | 'right' | null>(null);
  const pageSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const todoId = (event.active.data.current as any)?.todoId;
    if (todoId) {
      const todo = todayTodos.find((t: Todo) => t.id === todoId);
      if (todo) setActiveTodo(todo);
    }
  }, [todayTodos]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    // 페이지 전환 타이머 정리
    if (pageSwitchTimeoutRef.current) {
      clearTimeout(pageSwitchTimeoutRef.current);
      pageSwitchTimeoutRef.current = null;
    }
    setEdgeHover(null);
    setActiveTodo(null);

    const { active, over } = event;
    if (!over) return;

    const todoId = (active.data.current as any)?.todoId;
    const dropData = over.data.current as any;
    if (!todoId || !dropData) return;

    // 반복 인스턴스인지 확인
    const timelineItem = timelineItems.find(i => i.id === todoId);
    const isRecurrenceInstance = timelineItem?.isRecurrenceInstance;
    const dbId = isRecurrenceInstance ? timelineItem?.recurrenceSourceId : todoId;

    if (!dbId) return;

    try {
      switch (dropData.type) {
        case 'time-slot': {
          // 반복 인스턴스는 시간 변경 불가
          if (isRecurrenceInstance) break;

          const defaultTimes: Record<string, string> = {
            morning: '09:00',
            afternoon: '13:00',
            evening: '18:00',
          };
          const time = defaultTimes[dropData.period] || '09:00';
          const [h, m] = time.split(':');
          const startDate = new Date(date);
          startDate.setHours(parseInt(h), parseInt(m), 0, 0);

          await updateTodo(dbId, {
            start_time: startDate.toISOString(),
            schedule_type: 'timed',
          });
          break;
        }
        case 'matrix': {
          const matrixUpdates: any = {
            importance: dropData.importance,
            urgency: dropData.urgency,
          };
          if (isRecurrenceInstance && timelineItem) {
            matrixUpdates.start_time = timelineItem.startTime?.toISOString();
            matrixUpdates.end_time = timelineItem.endTime?.toISOString();
            const todoTitle = timelineItem.title || '';
            setPendingDrop({todoId: dbId, updates: matrixUpdates, title: todoTitle});
            setRecurringDialogOpen(true);
            return;
          }
          await updateTodo(dbId, matrixUpdates);
          break;
        }
        case 'reluctant': {
          const reluctantUpdates: any = {
            is_reluctant_must_do: true,
          };
          if (isRecurrenceInstance && timelineItem) {
            reluctantUpdates.start_time = timelineItem.startTime?.toISOString();
            reluctantUpdates.end_time = timelineItem.endTime?.toISOString();
            const todoTitle = timelineItem.title || '';
            setPendingDrop({todoId: dbId, updates: reluctantUpdates, title: todoTitle});
            setRecurringDialogOpen(true);
            return;
          }
          await updateTodo(dbId, reluctantUpdates);
          break;
        }
      }
    } catch (error) {
      console.error('드래그 앤 드롭 업데이트 실패:', error);
    }
  }, [date, updateTodo, timelineItems]);

  const handleDragCancel = useCallback(() => {
    if (pageSwitchTimeoutRef.current) {
      clearTimeout(pageSwitchTimeoutRef.current);
      pageSwitchTimeoutRef.current = null;
    }
    setEdgeHover(null);
    setActiveTodo(null);
  }, []);

  // 반복 할일 DnD 다이얼로그 콜백
  const handleRecurringDropChoice = useCallback(async (choice: 'this-only' | 'from-now' | 'all') => {
    if (!pendingDrop) return;
    const updateTypeMap: Record<string, 'this' | 'future' | 'all'> = {
      'this-only': 'this',
      'from-now': 'future',
      'all': 'all',
    };
    await updateRecurringTodo(
      pendingDrop.todoId,
      pendingDrop.updates,
      updateTypeMap[choice],
      date,
    );
    setPendingDrop(null);
  }, [pendingDrop, updateRecurringTodo, date]);

  // 칩 클릭 → TimelineItem 찾아서 편집 콜백 호출
  const handleChipEditClick = useCallback((todo: Todo) => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onEditClick) onEditClick(item);
  }, [timelineItems, onEditClick]);

  // 칩 토글 → TimelineItem 찾아서 토글 콜백 호출
  const handleChipToggle = useCallback((todo: Todo) => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onToggleComplete) onToggleComplete(item);
  }, [timelineItems, onToggleComplete]);

  // 칩 스킵 → TimelineItem 찾아서 스킵 콜백 호출
  const handleChipSkip = useCallback((todo: Todo, reason: 'not_needed' | 'missed') => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onSkipTodo) onSkipTodo(item, reason);
  }, [timelineItems, onSkipTodo]);

  // 칩 미루기 → TimelineItem 찾아서 미루기 시트 열기
  const handleChipPostpone = useCallback((todo: Todo) => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onOpenPostponeSheet) onOpenPostponeSheet(item);
  }, [timelineItems, onOpenPostponeSheet]);

  // 칩 스킵 취소 → TimelineItem 찾아서 스킵 취소 콜백 호출
  const handleChipUnskip = useCallback((todo: Todo) => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onUnskipTodo) onUnskipTodo(item);
  }, [timelineItems, onUnskipTodo]);

  // 칩 미룸 복원 → TimelineItem 찾아서 복원 콜백 호출
  const handleChipRestoreOriginal = useCallback((todo: Todo) => {
    const item = timelineItems.find(i => i.id === todo.id);
    if (item && onRestoreOriginal) onRestoreOriginal(item);
  }, [timelineItems, onRestoreOriginal]);

  // 배치 해제 핸들러
  const handleUnassignMatrix = useCallback(async (todo: Todo) => {
    const timelineItem = timelineItems.find(i => i.id === todo.id);
    const isRecurrenceInstance = timelineItem?.isRecurrenceInstance;
    const dbId = isRecurrenceInstance ? timelineItem?.recurrenceSourceId : todo.id;
    if (!dbId) return;

    const updates = { importance: null, urgency: null };
    if (isRecurrenceInstance && timelineItem) {
      setPendingDrop({
        todoId: dbId,
        updates: { ...updates, start_time: timelineItem.startTime?.toISOString(), end_time: timelineItem.endTime?.toISOString() },
        title: timelineItem.title || '',
      });
      setRecurringDialogOpen(true);
      return;
    }
    await updateTodo(dbId, updates);
  }, [timelineItems, updateTodo]);

  const handleUnassignReluctant = useCallback(async (todo: Todo) => {
    const timelineItem = timelineItems.find(i => i.id === todo.id);
    const isRecurrenceInstance = timelineItem?.isRecurrenceInstance;
    const dbId = isRecurrenceInstance ? timelineItem?.recurrenceSourceId : todo.id;
    if (!dbId) return;

    const updates = { is_reluctant_must_do: false };
    if (isRecurrenceInstance && timelineItem) {
      setPendingDrop({
        todoId: dbId,
        updates: { ...updates, start_time: timelineItem.startTime?.toISOString(), end_time: timelineItem.endTime?.toISOString() },
        title: timelineItem.title || '',
      });
      setRecurringDialogOpen(true);
      return;
    }
    await updateTodo(dbId, updates);
  }, [timelineItems, updateTodo]);

  // 섹션별 추가 핸들러
  const handleAddMorning = useCallback(() => {
    if (!onAddTodo) return;
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(date);
    end.setHours(10, 0, 0, 0);
    onAddTodo(start, end, 'new');
  }, [date, onAddTodo]);

  const handleAddAfternoon = useCallback(() => {
    if (!onAddTodo) return;
    const start = new Date(date);
    start.setHours(13, 0, 0, 0);
    const end = new Date(date);
    end.setHours(14, 0, 0, 0);
    onAddTodo(start, end, 'new');
  }, [date, onAddTodo]);

  const handleAddEvening = useCallback(() => {
    if (!onAddTodo) return;
    const start = new Date(date);
    start.setHours(18, 0, 0, 0);
    const end = new Date(date);
    end.setHours(19, 0, 0, 0);
    onAddTodo(start, end, 'new');
  }, [date, onAddTodo]);

  const handleAddMatrix = useCallback(() => {
    if (!onAddTodo) return;
    onAddTodo(undefined, undefined, 'new');
  }, [onAddTodo]);

  const handleAddReluctant = useCallback(() => {
    if (!onAddTodo) return;
    onAddTodo(undefined, undefined, 'new');
  }, [onAddTodo]);

  // Reflection handlers
  const handleReflectionUpdate = useCallback((field: string, value: any) => {
    upsertReflection(userId, dateStr, { [field]: value });
  }, [userId, dateStr, upsertReflection]);

  // Mobile swipe handler
  const handleDragEndSwipe = useCallback((_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && mobilePage === 0) {
      setMobilePage(1);
    } else if (info.offset.x > threshold && mobilePage === 1) {
      setMobilePage(0);
    } else {
      swipeControls.start({ x: mobilePage === 0 ? 0 : slideOffset });
    }
  }, [mobilePage, slideOffset, swipeControls]);

  // ─── onDragMove 기반 엣지 감지 (크로스 페이지 DnD) ───
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!activeTodo || isDesktop) return; // 데스크톱에서는 엣지 감지 불필요
    const container = scrollContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // 현재 포인터 X 좌표 계산 (초기 위치 + delta)
    let initialX = 0;
    if (event.activatorEvent instanceof TouchEvent) {
      initialX = event.activatorEvent.touches[0]?.clientX ?? 0;
    } else if (event.activatorEvent instanceof MouseEvent) {
      initialX = event.activatorEvent.clientX ?? 0;
    }
    const currentX = initialX + event.delta.x;

    const edgeThreshold = 50;

    if (currentX > rect.right - edgeThreshold && mobilePage === 0) {
      setEdgeHover('right');
      if (!pageSwitchTimeoutRef.current) {
        pageSwitchTimeoutRef.current = setTimeout(() => {
          setMobilePage(1);
          pageSwitchTimeoutRef.current = null;
          setEdgeHover(null);
        }, 300);
      }
    } else if (currentX < rect.left + edgeThreshold && mobilePage === 1) {
      setEdgeHover('left');
      if (!pageSwitchTimeoutRef.current) {
        pageSwitchTimeoutRef.current = setTimeout(() => {
          setMobilePage(0);
          pageSwitchTimeoutRef.current = null;
          setEdgeHover(null);
        }, 300);
      }
    } else {
      setEdgeHover(null);
      if (pageSwitchTimeoutRef.current) {
        clearTimeout(pageSwitchTimeoutRef.current);
        pageSwitchTimeoutRef.current = null;
      }
    }
  }, [mobilePage, activeTodo, isDesktop]);

  // 날짜 표시
  const dateLabel = format(date, 'd일 (EEEE)', { locale: ko });

  // ─── 시간표 섹션 (Page 1 for mobile) ───
  const scheduleSection = (
    <div className="space-y-3">
      <TimeSchedulePanel
        anytimeTodos={anytimeTodos}
        deferredTodos={deferredTodos}
        morningTodos={morningTodos}
        afternoonTodos={afternoonTodos}
        eveningTodos={eveningTodos}
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        todoMotivationMap={todoMotivationMap}
        expandedMotivationId={expandedMotivationId}
        onExpandMotivation={setExpandedMotivationId}
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onUnskip={handleChipUnskip}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
        onRestoreOriginal={handleChipRestoreOriginal}
        onStartFocus={handleChipStartFocus}
        onAddMorning={handleAddMorning}
        onAddAfternoon={handleAddAfternoon}
        onAddEvening={handleAddEvening}
      />
    </div>
  );

  // ─── 플래너 섹션 (Page 2 for mobile) ───
  const plannerSection = (
    <div className="space-y-3">
      <PriorityMatrixPanel
        todos={matrixTodos}
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        todoMotivationMap={todoMotivationMap}
        expandedMotivationId={expandedMotivationId}
        onExpandMotivation={setExpandedMotivationId}
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onUnskip={handleChipUnskip}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
        onAddClick={handleAddMatrix}
        onUnassign={handleUnassignMatrix}
      />
      <ReluctantTasksPanel
        todos={reluctantTodos}
        projectMap={projectMap}
        departmentMap={departmentMap}
        highlightProjectId={highlightProjectId}
        todoMotivationMap={todoMotivationMap}
        expandedMotivationId={expandedMotivationId}
        onExpandMotivation={setExpandedMotivationId}
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onUnskip={handleChipUnskip}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
        onAddClick={handleAddReluctant}
        onUnassign={handleUnassignReluctant}
      />
      <RewardPanel
        value={reflection?.reward || ''}
        onChange={v => handleReflectionUpdate('reward', v)}
      />
      <PraisePanel
        values={reflection?.praises || []}
        onChange={v => handleReflectionUpdate('praises', v)}
      />
      <GratitudePanel
        values={reflection?.gratitudes || []}
        onChange={v => handleReflectionUpdate('gratitudes', v)}
      />
    </div>
  );

  // ─── 하단 리플렉션 바 (공통) ───
  const reflectionBar = (
    <DayReflectionBar
      reflection={reflection?.reflection || ''}
      spendingNote={reflection?.spending_note || ''}
      thoughtArchive={reflection?.thought_archive || ''}
      onReflectionChange={v => handleReflectionUpdate('reflection', v)}
      onSpendingNoteChange={v => handleReflectionUpdate('spending_note', v)}
      onThoughtArchiveChange={v => handleReflectionUpdate('thought_archive', v)}
    />
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1">
        {/* 날짜 표시 */}
        <div className="px-4 py-2 text-center">
          <span className="text-sm font-medium text-base-content/60">{dateLabel}</span>
        </div>

        {/* 프로젝트 요약 바 */}
        {todayProjectSummary.length > 0 && (
          <div className="px-4 pb-2">
            <ProjectSummaryBar
              summaries={todayProjectSummary}
              activeProjectId={highlightProjectId}
              onProjectClick={setHighlightProjectId}
            />
          </div>
        )}

        {/* ─── JS 기반 조건부 렌더링: 데스크탑 vs 모바일 ─── */}
        {isDesktop ? (
          <div className="px-4 pb-4">
            <div className="relative" ref={desktopContainerRef}>
              {/* 기본 레이아웃 — 항상 전체 표시 */}
              <div className="grid grid-cols-2 gap-4">
                <div>{scheduleSection}</div>
                <div>{plannerSection}</div>
              </div>
              <div className="mt-3">{reflectionBar}</div>

              {/* 포커스 타이머 오버레이 패널 (오른쪽에서 슬라이드) */}
              <AnimatePresence>
                {focusMode.isFocusActive && focusMode.focusTodo && (
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="absolute top-0 right-0 bottom-0 bg-base-100 shadow-[-4px_0_12px_rgba(0,0,0,0.08)] z-10 border-l border-base-300"
                    style={{ width: focusPanelWidth }}
                  >
                    {/* 드래그 핸들 */}
                    <div
                      onMouseDown={handleSplitDragStart}
                      className="absolute -left-3 top-0 bottom-0 w-6 cursor-col-resize flex items-center justify-center z-20 group"
                    >
                      <div className="w-1 h-10 bg-base-300 group-hover:bg-primary rounded-full transition-colors" />
                    </div>
                    {/* 패널 내용 */}
                    <div className="h-full overflow-y-auto">
                      <FocusSidePanel
                        session={focusSession}
                        todo={focusMode.focusTodo}
                        onClose={handleCloseFocus}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {/* Dot indicator */}
            <div className="flex justify-center gap-2 mb-3">
              {[0, 1].map(i => (
                <button
                  key={i}
                  onClick={() => setMobilePage(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    mobilePage === i ? 'bg-primary' : 'bg-base-300'
                  }`}
                />
              ))}
            </div>

            {/* Swipable content */}
            <div className="overflow-hidden relative" ref={scrollContainerRef}>
              {/* 오른쪽 엣지 인디케이터 (page 0 → page 1) */}
              <div
                className={`absolute right-0 top-0 bottom-0 w-12 z-20 transition-all duration-200
                  ${activeTodo && mobilePage === 0
                    ? edgeHover === 'right'
                      ? 'opacity-100 bg-primary/20 border-l-2 border-primary/50'
                      : 'opacity-60 bg-primary/5 border-l border-primary/20'
                    : 'opacity-0 pointer-events-none'}`}
              />
              {/* 왼쪽 엣지 인디케이터 (page 1 → page 0) */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-12 z-20 transition-all duration-200
                  ${activeTodo && mobilePage === 1
                    ? edgeHover === 'left'
                      ? 'opacity-100 bg-primary/20 border-r-2 border-primary/50'
                      : 'opacity-60 bg-primary/5 border-r border-primary/20'
                    : 'opacity-0 pointer-events-none'}`}
              />
              <motion.div
                drag={activeTodo ? false : "x"}
                dragConstraints={{ left: slideOffset, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEndSwipe}
                dragMomentum={false}
                animate={swipeControls}
                transition={activeTodo
                  ? { type: 'tween', duration: 0.15 }
                  : { type: 'spring', stiffness: 300, damping: 30 }
                }
                className="flex"
                style={{ gap: `${GAP}px` }}
              >
                <div className="flex-shrink-0" style={{ width: page1Width || '100%' }}>
                  {scheduleSection}
                </div>
                <div className="flex-shrink-0" style={{ width: page1Width || '100%' }}>
                  {plannerSection}
                </div>
              </motion.div>
            </div>

            {/* 하단 리플렉션 바 (고정) */}
            <div className="mt-3">{reflectionBar}</div>
          </div>
        )}
      </div>

      {/* Drag Overlay — 드래그 중일 때만 렌더링 */}
      {activeTodo && (
        <DragOverlay modifiers={[snapCenterToCursor, restrictToWindowEdges]} dropAnimation={null}>
          <div className="opacity-90 pointer-events-none w-64">
            <DraggableTodoChip todo={activeTodo} projectMap={projectMap} departmentMap={departmentMap} />
          </div>
        </DragOverlay>
      )}
      {/* 반복 할일 DnD 다이얼로그 */}
      <RecurringUpdateDialog
        open={recurringDialogOpen}
        onOpenChange={(open) => {
          setRecurringDialogOpen(open);
          if (!open) setPendingDrop(null);
        }}
        todoTitle={pendingDrop?.title || ''}
        occurrenceDate={date}
        onUpdateChoice={handleRecurringDropChoice}
        changeType="mixed"
      />

      {/* 모바일 포커스 오버레이 */}
      {!isDesktop && focusMode.isFocusActive && focusMode.focusTodo && (
        <FocusOverlay
          session={focusSession}
          todo={focusMode.focusTodo}
          onClose={handleCloseFocus}
        />
      )}
    </DndContext>
  );
}
