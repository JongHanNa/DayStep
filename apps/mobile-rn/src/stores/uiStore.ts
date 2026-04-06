/**
 * UI Store (Zustand, non-persist)
 * 일시적 UI 상태 — 바텀시트, 모달 등 화면 전환 시 리셋되는 상태
 */
import {create} from 'zustand';

interface UIState {
  /** 바텀시트가 열려있을 때 탭바를 숨김 */
  isBottomSheetOpen: boolean;
  setBottomSheetOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>(set => ({
  isBottomSheetOpen: false,
  setBottomSheetOpen: open => set({isBottomSheetOpen: open}),
}));
