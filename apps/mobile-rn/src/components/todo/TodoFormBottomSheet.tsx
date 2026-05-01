/**
 * TodoFormBottomSheet — Orchestrator
 * 같은 ref API (TodoFormBottomSheetRef) 유지, 내부는 Create/Edit 분리
 * - Create: TodoCreatePanel (BottomSheet non-modal, 키보드 동기화)
 * - Edit: TodoEditOverlay (풀스크린 오버레이)
 * - SchedulePanel: 별도 BottomSheetModal (create 위에 독립적으로 열림)
 * - 우선순위/아이콘: TodoCreatePanel 내부 Popover로 처리
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {Keyboard} from 'react-native';
import {useUIStore} from '@/stores/uiStore';
import {useTodoForm} from './useTodoForm';
import {TodoCreatePanel, type TodoCreatePanelRef} from './TodoCreatePanel';
import {LimitReachedModal} from '@/components/subscription/LimitReachedModal';
import {TodoEditOverlay} from './TodoEditOverlay';
import {SchedulePanel, type SchedulePanelRef} from './SchedulePanel';
import {useHaptic} from '@/hooks/useHaptic';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Types (외부 API 변경 없음)
// ============================================

export interface TodoFormBottomSheetRef {
  openCreate: (
    date?: string,
    preset?: 'allDay' | 'anytime' | 'morning' | 'afternoon' | 'evening',
  ) => void;
  openEdit: (todo: Todo) => Promise<void>;
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

    // ------------------------------------------
    // Imperative handle (기존 API 유지)
    // ------------------------------------------
    useImperativeHandle(ref, () => ({
      openCreate: (date, preset) => {
        formHook.resetForCreate(date, preset);
        createSheetRef.current?.expand();
      },
      openEdit: async (todo: Todo) => {
        await formHook.loadForEdit(todo);
        setEditVisible(true);
      },
      close: () => {
        createSheetRef.current?.close();
        setEditVisible(false);
        Keyboard.dismiss();
      },
    }));

    // ------------------------------------------
    // 외부 입력 prefill 감지
    // ------------------------------------------
    const pendingPrefill = useUIStore(s => s.pendingTodoPrefill);
    const clearPendingPrefill = useUIStore(s => s.clearPendingPrefill);

    useEffect(() => {
      if (!pendingPrefill) return;
      // resetForCreate → prefill 필드 덮어쓰기 → 패널 열기
      formHook.resetForCreate(pendingPrefill.scheduledDate);
      // 약간의 딜레이 후 prefill 적용 (resetForCreate가 setForm 후 반영되도록)
      requestAnimationFrame(() => {
        formHook.setForm(prev => ({...prev, ...pendingPrefill}));
        createSheetRef.current?.expand();
        clearPendingPrefill();
      });
    }, [pendingPrefill, clearPendingPrefill, formHook]);

    // ------------------------------------------
    // Create 모드 콜백
    // ------------------------------------------
    const createToolbarCallbacks = useCallback(
      () => ({
        onDatePress: () => {
          haptic.selection();
          createSheetRef.current?.hideForSub();
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
          onDismiss={() => createSheetRef.current?.restoreFromSub()}
        />

        {/* 한도 초과 모달 */}
        <LimitReachedModal
          visible={formHook.isLimitReached}
          onClose={formHook.closeLimitModal}
          entityType={formHook.limitedEntity}
          currentCount={formHook.currentCount}
          maxCount={formHook.maxCount}
        />
      </>
    );
  },
);

TodoFormBottomSheet.displayName = 'TodoFormBottomSheet';
