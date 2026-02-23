/**
 * TodoFormBottomSheet — Orchestrator
 * 같은 ref API (TodoFormBottomSheetRef) 유지, 내부는 Create/Edit 분리
 * - Create: TodoCreatePanel (키보드 위 인라인 패널)
 * - Edit: TodoEditOverlay (풀스크린 오버레이)
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
import {TodoCreatePanel} from './TodoCreatePanel';
import {TodoEditOverlay} from './TodoEditOverlay';
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
    const [createVisible, setCreateVisible] = useState(false);
    const [editVisible, setEditVisible] = useState(false);

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
        setCreateVisible(true);
      },
      openEdit: (todo: Todo) => {
        formHook.loadForEdit(todo);
        setEditVisible(true);
      },
      close: () => {
        setCreateVisible(false);
        setEditVisible(false);
        Keyboard.dismiss();
      },
    }));

    // ------------------------------------------
    // 서브시트 공통 콜백
    // ------------------------------------------
    const makeToolbarCallbacks = useCallback(
      (includeIcon: boolean) => ({
        onDatePress: () => {
          haptic.selection();
          // TODO: DatePickerSheet
        },
        onTimePress: () => {
          haptic.selection();
          timeSheetRef.current?.open();
        },
        onAlarmPress: () => {
          haptic.selection();
          alarmSheetRef.current?.open();
        },
        onRecurrencePress: () => {
          haptic.selection();
          recurrenceSheetRef.current?.open();
        },
        onPriorityPress: () => {
          haptic.selection();
          prioritySheetRef.current?.open();
        },
        ...(includeIcon && {
          onIconPress: () => {
            haptic.selection();
            iconSheetRef.current?.open();
          },
        }),
      }),
      [haptic],
    );

    return (
      <>
        {/* Create: 키보드 위 패널 */}
        <TodoCreatePanel
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          toolbarCallbacks={
            makeToolbarCallbacks(true) as any
          }
          {...formHook}
        />

        {/* Edit: 풀스크린 오버레이 */}
        <TodoEditOverlay
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          toolbarCallbacks={makeToolbarCallbacks(false)}
          {...formHook}
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
