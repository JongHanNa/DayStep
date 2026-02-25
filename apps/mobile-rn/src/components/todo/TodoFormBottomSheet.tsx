/**
 * TodoFormBottomSheet — Orchestrator
 * 같은 ref API (TodoFormBottomSheetRef) 유지, 내부는 Create/Edit 분리
 * - Create: TodoCreatePanel (BottomSheet non-modal, 키보드 동기화)
 * - Edit: TodoEditOverlay (풀스크린 오버레이)
 * - SchedulePanel: 별도 BottomSheetModal (create 위에 독립적으로 열림)
 * - 서브시트: PriorityPickerSheet (create 전용)
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
import {PriorityPickerSheet, type PriorityPickerSheetRef} from './sheets/PriorityPickerSheet';
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
    const prioritySheetRef = useRef<PriorityPickerSheetRef>(null);

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

        {/* ──────── 서브시트 (같은 레벨) ──────── */}
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
      </>
    );
  },
);

TodoFormBottomSheet.displayName = 'TodoFormBottomSheet';
