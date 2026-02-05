'use client';

import { useState, useCallback } from 'react';
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
import { useDailyPlannerData } from '../../hooks/useDailyPlannerData';
import { TimeSchedulePanel } from './TimeSchedulePanel';
import { PriorityMatrixPanel } from './PriorityMatrixPanel';
import { ReluctantTasksPanel } from './ReluctantTasksPanel';
import { RewardPanel } from './RewardPanel';
import { PraisePanel } from './PraisePanel';
import { GratitudePanel } from './GratitudePanel';
import { DayReflectionBar } from './DayReflectionBar';
import { DraggableTodoChip } from './DraggableTodoChip';
import type { Todo } from '@/entities/todo/Todo';

interface DailyPlannerViewProps {
  userId: string;
  date: Date;
}

export function DailyPlannerView({ userId, date }: DailyPlannerViewProps) {
  const updateTodo = useTodoStore(s => s.updateTodo);
  const todos = useTodoStore(s => s.todos);

  const {
    morningTodos,
    afternoonTodos,
    eveningTodos,
    matrixTodos,
    reluctantTodos,
    reflection,
    upsertReflection,
    dateStr,
  } = useDailyPlannerData({ userId, date });

  // Mobile swipe state
  const [mobilePage, setMobilePage] = useState(0);

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
      const todo = todos.find((t: Todo) => t.id === todoId);
      if (todo) setActiveTodo(todo);
    }
  }, [todos]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTodo(null);
    const { active, over } = event;
    if (!over) return;

    const todoId = (active.data.current as any)?.todoId;
    const dropData = over.data.current as any;
    if (!todoId || !dropData) return;

    try {
      switch (dropData.type) {
        case 'time-slot': {
          const defaultTimes: Record<string, string> = {
            morning: '09:00',
            afternoon: '13:00',
            evening: '18:00',
          };
          const time = defaultTimes[dropData.period] || '09:00';
          const [h, m] = time.split(':');
          const startDate = new Date(date);
          startDate.setHours(parseInt(h), parseInt(m), 0, 0);

          await updateTodo(todoId, {
            start_time: startDate.toISOString(),
            schedule_type: 'timed',
          });
          break;
        }
        case 'matrix': {
          await updateTodo(todoId, {
            importance: dropData.importance,
            urgency: dropData.urgency,
          });
          break;
        }
        case 'reluctant': {
          await updateTodo(todoId, {
            is_reluctant_must_do: true,
          });
          break;
        }
      }
    } catch (error) {
      console.error('드래그 앤 드롭 업데이트 실패:', error);
    }
  }, [date, updateTodo]);

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
  const dateLabel = format(date, 'M월 d일 (EEEE)', { locale: ko });

  // ─── 시간표 섹션 (Page 1 for mobile) ───
  const scheduleSection = (
    <div className="space-y-3">
      <TimeSchedulePanel
        morningTodos={morningTodos}
        afternoonTodos={afternoonTodos}
        eveningTodos={eveningTodos}
      />
    </div>
  );

  // ─── 플래너 섹션 (Page 2 for mobile) ───
  const plannerSection = (
    <div className="space-y-3">
      <PriorityMatrixPanel todos={matrixTodos} />
      <ReluctantTasksPanel todos={reluctantTodos} />
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
          <div className="overflow-hidden relative">
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEndSwipe}
              animate={{ x: mobilePage === 0 ? 0 : '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex"
              style={{ width: '200%' }}
            >
              <div className="w-1/2 pr-2">{scheduleSection}</div>
              <div className="w-1/2 pl-2">{plannerSection}</div>
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
