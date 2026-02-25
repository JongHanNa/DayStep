/**
 * TodoFormBottomSheet — Orchestrator
 * 같은 ref API (TodoFormBottomSheetRef) 유지, 내부는 Create/Edit 분리
 * - Create: TodoCreatePanel (BottomSheet non-modal, 키보드 동기화)
 * - Edit: TodoEditOverlay (풀스크린 오버레이)
 * - SchedulePanel: 별도 BottomSheetModal (create 위에 독립적으로 열림)
 * - 서브시트 5개는 동일 레벨에서 렌더
 */
import React, {
  useCallback,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {Keyboard} from 'react-native';
import {useTodoForm} from './useTodoForm';
import {TodoCreatePanel, type TodoCreatePanelRef} from './TodoCreatePanel';
import {TodoEditOverlay} from './TodoEditOverlay';
import {SchedulePanel, type SchedulePanelRef} from './SchedulePanel';
import {TimePickerSheet, type TimePickerSheetRef} from './sheets/TimePickerSheet';
import {RecurrencePickerSheet, type RecurrencePickerSheetRef} from './sheets/RecurrencePickerSheet';
import {PriorityPickerSheet, type PriorityPickerSheetRef} from './sheets/PriorityPickerSheet';
import {IconPickerSheet, type IconPickerSheetRef} from './sheets/IconPickerSheet';
import {AlarmPickerSheet, type AlarmPickerSheetRef} from './sheets/AlarmPickerSheet';
import {useHaptic} from '@/hooks/useHaptic';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Types (외부 API 변경 없음)
// ============================================

export interface TodoFormBottomSheetRef {
  openCreate: (date?: string) => void;
  openEdit: (todo: Todo) => void;
  close: () => void;
}

// ============================================
// Component
// ============================================

export const TodoFormBottomSheet = forwardRef<TodoFormBottomSheetRef, {}>(
  (_props, ref) => {
    const formHook = useTodoForm();
    const haptic = useHaptic();
    const [editVisible, setEditVisible] = useState(false);

    // Create 패널 ref (BottomSheet non-modal)
    const createSheetRef = useRef<TodoCreatePanelRef>(null);
    // 일정 패널 ref (BottomSheetModal)
    const scheduleModalRef = useRef<SchedulePanelRef>(null);

    // 서브시트 refs
    const timeSheetRef = useRef<TimePickerSheetRef>(null);
    const recurrenceSheetRef = useRef<RecurrencePickerSheetRef>(null);
    const prioritySheetRef = useRef<PriorityPickerSheetRef>(null);
    const iconSheetRef = useRef<IconPickerSheetRef>(null);
    const alarmSheetRef = useRef<AlarmPickerSheetRef>(null);

    // ------------------------------------------
    // Imperative handle (기존 API 유지)
    // ------------------------------------------
    useImperativeHandle(ref, () => ({
      openCreate: (date?: string) => {
        formHook.resetForCreate(date);
        createSheetRef.current?.expand();
      },
      openEdit: (todo: Todo) => {
        formHook.loadForEdit(todo);
        setEditVisible(true);
      },
      close: () => {
        createSheetRef.current?.close();
        setEditVisible(false);
        Keyboard.dismiss();
      },
    }));

    // ------------------------------------------
    // Create 모드 콜백
    // ------------------------------------------
    const createToolbarCallbacks = useCallback(
      () => ({
        onPriorityPress: () => {
          haptic.selection();
          prioritySheetRef.current?.open();
        },
        onDatePress: () => {
          haptic.selection();
          Keyboard.dismiss();
          scheduleModalRef.current?.open();
        },
      }),
      [haptic],
    );

    return (
      <>
        {/* Create: BottomSheet (non-modal, 키보드 동기화) */}
        <TodoCreatePanel
          ref={createSheetRef}
          toolbarCallbacks={createToolbarCallbacks()}
          {...formHook}
        />

        {/* Edit: 풀스크린 오버레이 */}
        <TodoEditOverlay
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          onSchedulePress={() => scheduleModalRef.current?.open()}
          {...formHook}
        />

        {/* 일정 패널 — 별도 BottomSheetModal (create 위에 독립적으로 열림) */}
        <SchedulePanel
          ref={scheduleModalRef}
          form={formHook.form}
          updateField={formHook.updateField}
        />

        {/* ──────── 서브시트 5개 (같은 레벨) ──────── */}
        <TimePickerSheet
          ref={timeSheetRef}
          scheduleType={formHook.form.scheduleType}
          startTime={formHook.form.startTime}
          endTime={formHook.form.endTime}
          anytimeDuration={formHook.form.anytimeDuration}
          onScheduleTypeChange={v => formHook.updateField('scheduleType', v)}
          onStartTimeChange={v => formHook.updateField('startTime', v)}
          onEndTimeChange={v => formHook.updateField('endTime', v)}
          onAnytimeDurationChange={v =>
            formHook.updateField('anytimeDuration', v)
          }
        />

        <RecurrencePickerSheet
          ref={recurrenceSheetRef}
          recurrencePattern={formHook.form.recurrencePattern}
          recurrenceDaysOfWeek={formHook.form.recurrenceDaysOfWeek}
          onPatternChange={v => formHook.updateField('recurrencePattern', v)}
          onDaysChange={v => formHook.updateField('recurrenceDaysOfWeek', v)}
        />

        <PriorityPickerSheet
          ref={prioritySheetRef}
          importance={formHook.form.importance}
          urgency={formHook.form.urgency}
          isReluctantMustDo={formHook.form.isReluctantMustDo}
          onImportanceChange={v => formHook.updateField('importance', v)}
          onUrgencyChange={v => formHook.updateField('urgency', v)}
          onReluctantChange={v =>
            formHook.updateField('isReluctantMustDo', v)
          }
        />

        <IconPickerSheet
          ref={iconSheetRef}
          selectedIcon={formHook.form.icon}
          onIconChange={v => formHook.updateField('icon', v)}
        />

        <AlarmPickerSheet
          ref={alarmSheetRef}
          alarmOffsetMinutes={formHook.form.alarmOffsetMinutes}
          onAlarmChange={v => formHook.updateField('alarmOffsetMinutes', v)}
        />
      </>
    );
  },
);

TodoFormBottomSheet.displayName = 'TodoFormBottomSheet';
