/**
 * Settings Store (Zustand + MMKV)
 * 웹앱 settingsStore 패턴의 RN 버전
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {ColorTheme} from '@/theme/colors';

export type BackgroundPreset = 'warmBackground' | 'calmBackground' | 'eveningBackground' | 'executionBackground';

export type PlannerViewMode = 'day' | '3day' | 'week' | 'dailyPlanner' | 'monthlyPlanner';

interface SettingsState {
  // 표시 설정
  colorTheme: ColorTheme;
  showDescriptions: boolean;

  // ADHD 설정
  showMotivationBadges: boolean;

  // 알림 설정
  notificationsEnabled: boolean;

  // 배경 설정
  backgroundPreset: BackgroundPreset;

  // Planner 뷰 모드
  plannerViewMode: PlannerViewMode;

  // More 패널
  morePanelShowLabels: boolean;

  // 통화 후 리마인더
  callReminderEnabled: boolean;

  // 온보딩 — 홈 화면 코치마크 첫 진입 안내 완료 플래그
  hasSeenHomeOnboarding: boolean;

  // 동기화
  _lastSyncedAt: string | null;

  // 액션
  setColorTheme: (theme: ColorTheme) => void;
  setShowDescriptions: (show: boolean) => void;
  setShowMotivationBadges: (show: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setBackgroundPreset: (preset: BackgroundPreset) => void;
  setPlannerViewMode: (mode: PlannerViewMode) => void;
  setMorePanelShowLabels: (show: boolean) => void;
  setCallReminderEnabled: (enabled: boolean) => void;
  setHasSeenHomeOnboarding: (seen: boolean) => void;
  loadFromDB: (settings: Record<string, any>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorTheme: 'ocean-blue',
      showDescriptions: true,
      showMotivationBadges: true,
      notificationsEnabled: true,
      backgroundPreset: 'calmBackground',
      plannerViewMode: 'dailyPlanner',
      morePanelShowLabels: true,
      callReminderEnabled: false,
      hasSeenHomeOnboarding: false,
      _lastSyncedAt: null,

      setColorTheme: (theme) => set({colorTheme: theme}),
      setShowDescriptions: (show) => set({showDescriptions: show}),
      setShowMotivationBadges: (show) => set({showMotivationBadges: show}),
      setNotificationsEnabled: (enabled) => set({notificationsEnabled: enabled}),
      setBackgroundPreset: (preset) => set({backgroundPreset: preset}),
      setPlannerViewMode: (mode) => set({plannerViewMode: mode}),
      setMorePanelShowLabels: (show) => set({morePanelShowLabels: show}),
      setCallReminderEnabled: (enabled) => set({callReminderEnabled: enabled}),
      setHasSeenHomeOnboarding: (seen) => set({hasSeenHomeOnboarding: seen}),
      loadFromDB: (settings) =>
        set((state) => ({
          ...state,
          ...settings,
          _lastSyncedAt: new Date().toISOString(),
        })),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);

/** 배경 프리셋별 메인컬러 매핑 */
const PRESET_MAIN_COLORS: Record<BackgroundPreset, string> = {
  calmBackground: '#3B82F6',
  warmBackground: '#D97706',
  eveningBackground: '#8B5CF6',
  executionBackground: '#EA580C',
};

/** 현재 배경 프리셋에 맞는 메인컬러 반환 */
export function getMainColorForPreset(preset: BackgroundPreset): string {
  return PRESET_MAIN_COLORS[preset];
}

/** DB 저장용 설정 추출 (액션 함수 제외) */
// DEV: expose store for debugging
if (__DEV__) {
  (globalThis as any).__settingsStore = useSettingsStore;
}

export function getSettingsForSync() {
  const state = useSettingsStore.getState();
  return {
    colorTheme: state.colorTheme,
    showDescriptions: state.showDescriptions,
    showMotivationBadges: state.showMotivationBadges,
    notificationsEnabled: state.notificationsEnabled,
    backgroundPreset: state.backgroundPreset,
    plannerViewMode: state.plannerViewMode,
    morePanelShowLabels: state.morePanelShowLabels,
    _lastSyncedAt: state._lastSyncedAt,
  };
}
