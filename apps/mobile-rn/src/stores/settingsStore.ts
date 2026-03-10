/**
 * Settings Store (Zustand + MMKV)
 * 웹앱 settingsStore 패턴의 RN 버전
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {ColorTheme} from '@/theme/colors';

export type BackgroundPreset = 'warmBackground' | 'calmBackground' | 'eveningBackground' | 'executionBackground';

interface SettingsState {
  // 표시 설정
  colorTheme: ColorTheme;
  showDescriptions: boolean;

  // ADHD 설정
  showFuelBadges: boolean;

  // 알림 설정
  notificationsEnabled: boolean;

  // 배경 설정
  backgroundPreset: BackgroundPreset;

  // More 패널
  morePanelShowLabels: boolean;

  // 동기화
  _lastSyncedAt: string | null;

  // 액션
  setColorTheme: (theme: ColorTheme) => void;
  setShowDescriptions: (show: boolean) => void;
  setShowFuelBadges: (show: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setBackgroundPreset: (preset: BackgroundPreset) => void;
  setMorePanelShowLabels: (show: boolean) => void;
  loadFromDB: (settings: Record<string, any>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorTheme: 'ocean-blue',
      showDescriptions: true,
      showFuelBadges: true,
      notificationsEnabled: true,
      backgroundPreset: 'calmBackground',
      morePanelShowLabels: true,
      _lastSyncedAt: null,

      setColorTheme: (theme) => set({colorTheme: theme}),
      setShowDescriptions: (show) => set({showDescriptions: show}),
      setShowFuelBadges: (show) => set({showFuelBadges: show}),
      setNotificationsEnabled: (enabled) => set({notificationsEnabled: enabled}),
      setBackgroundPreset: (preset) => set({backgroundPreset: preset}),
      setMorePanelShowLabels: (show) => set({morePanelShowLabels: show}),
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

/** DB 저장용 설정 추출 (액션 함수 제외) */
export function getSettingsForSync() {
  const state = useSettingsStore.getState();
  return {
    colorTheme: state.colorTheme,
    showDescriptions: state.showDescriptions,
    showFuelBadges: state.showFuelBadges,
    notificationsEnabled: state.notificationsEnabled,
    backgroundPreset: state.backgroundPreset,
    morePanelShowLabels: state.morePanelShowLabels,
    _lastSyncedAt: state._lastSyncedAt,
  };
}
