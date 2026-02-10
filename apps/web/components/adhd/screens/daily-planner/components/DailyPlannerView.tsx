'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { pointerWithin } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import { useTodoStore } from '@/state/stores/todoStore';
import { useDailyPlannerData } from '../hooks/useDailyPlannerData';
import { TimeSchedulePanel } from './TimeSchedulePanel';
import { PriorityMatrixPanel } from './PriorityMatrixPanel';
import { ReluctantTasksPanel } from './ReluctantTasksPanel';
import { RewardPanel } from './RewardPanel';
import { PraisePanel } from './PraisePanel';
import { GratitudePanel } from './GratitudePanel';
import { DayReflectionBar } from './DayReflectionBar';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';
import type { TimelineItem } from '../../timeline/types';

interface DailyPlannerViewProps {
  userId: string;
  date: Date;
  timelineItems: TimelineItem[];
  onEditClick?: (item: TimelineItem) => void;
  onToggleComplete?: (item: TimelineItem) => void;
  onSkipTodo?: (item: TimelineItem, reason: 'not_needed' | 'missed') => void;
  onOpenPostponeSheet?: (item: TimelineItem) => void;
  onAddTodo?: (prefillStart?: Date, prefillEnd?: Date, mode?: 'detailed' | 'new') => void;
}

export function DailyPlannerView({ userId, date, timelineItems, onEditClick, onToggleComplete, onSkipTodo, onOpenPostponeSheet, onAddTodo }: DailyPlannerViewProps) {
  const updateTodo = useTodoStore(s => s.updateTodo);

  const {
    todayTodos,
    morningTodos,
    afternoonTodos,
    eveningTodos,
    matrixTodos,
    reluctantTodos,
    reflection,
    upsertReflection,
    dateStr,
  } = useDailyPlannerData({ userId, date, timelineItems });

  // Mobile swipe state
  const [mobilePage, setMobilePage] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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

  // DnD state
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);

  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: isCapacitor ? 400 : 300,
        tolerance: isCapacitor ? 8 : 5,
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
          await updateTodo(dbId, {
            importance: dropData.importance,
            urgency: dropData.urgency,
          });
          break;
        }
        case 'reluctant': {
          await updateTodo(dbId, {
            is_reluctant_must_do: true,
          });
          break;
        }
      }
    } catch (error) {
      console.error('드래그 앤 드롭 업데이트 실패:', error);
    }
  }, [date, updateTodo, timelineItems]);

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
    }
  }, [mobilePage]);

  // 날짜 표시
  const dateLabel = format(date, 'd일 (EEEE)', { locale: ko });

  // ─── 시간표 섹션 (Page 1 for mobile) ───
  const scheduleSection = (
    <div className="space-y-3">
      <TimeSchedulePanel
        morningTodos={morningTodos}
        afternoonTodos={afternoonTodos}
        eveningTodos={eveningTodos}
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
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
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
        onAddClick={handleAddMatrix}
      />
      <ReluctantTasksPanel
        todos={reluctantTodos}
        onEditClick={handleChipEditClick}
        onToggle={handleChipToggle}
        onSkipTodo={handleChipSkip}
        onPostpone={handleChipPostpone}
        onAddClick={handleAddReluctant}
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
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-y-auto">
        {/* 날짜 표시 */}
        <div className="px-4 py-2 text-center">
          <span className="text-sm font-medium text-base-content/60">{dateLabel}</span>
        </div>

        {/* ─── 데스크탑/태블릿: 2컬럼 ─── */}
        <div className="hidden md:block px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>{scheduleSection}</div>
            <div>{plannerSection}</div>
          </div>
          <div className="mt-3">{reflectionBar}</div>
        </div>

        {/* ─── 모바일: 스와이프 페이지 ─── */}
        <div className="md:hidden px-4 pb-4">
          {/* Dot indicator */}
          <div className="flex justify-center gap-2 mb-3">
            {[0, 1].map(i => (
              <button
                key={i}
                onClick={() => setMobilePage(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  mobilePage === i ? 'bg-primary' : 'bg-base-content/20'
                }`}
              />
            ))}
          </div>

          {/* Swipable content */}
          <div className="overflow-hidden relative" ref={scrollContainerRef}>
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEndSwipe}
              animate={{ x: mobilePage === 0 ? 0 : slideOffset }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
      </div>

      {/* Drag Overlay */}
      <DragOverlay modifiers={[restrictToWindowEdges]}>
        {activeTodo && (
          <div className="opacity-90 pointer-events-none">
            <DraggableTodoChip todo={activeTodo} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
