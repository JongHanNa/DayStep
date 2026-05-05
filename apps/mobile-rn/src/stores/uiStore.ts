/**
 * UI Store (Zustand, non-persist)
 * 일시적 UI 상태 — 바텀시트, 모달 등 화면 전환 시 리셋되는 상태
 */
import {create} from 'zustand';
import type {FormData} from '@/components/todo/useTodoForm';

interface UIState {
  /** 바텀시트가 열려있을 때 탭바를 숨김 */
  isBottomSheetOpen: boolean;
  setBottomSheetOpen: (open: boolean) => void;

  /** 외부 입력(Share Extension/Siri/Deep Link)으로부터 받은 할일 prefill 데이터 */
  pendingTodoPrefill: Partial<FormData> | null;
  openTodoCreateWithPrefill: (data: Partial<FormData>) => void;
  clearPendingPrefill: () => void;
}

export const useUIStore = create<UIState>(set => ({
  isBottomSheetOpen: false,
  setBottomSheetOpen: open => set({isBottomSheetOpen: open}),

  pendingTodoPrefill: null,
  openTodoCreateWithPrefill: data => set({pendingTodoPrefill: data}),
  clearPendingPrefill: () => set({pendingTodoPrefill: null}),
}));
