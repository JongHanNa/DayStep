/**
 * Settings Store (Zustand + MMKV)
 * 웹앱 settingsStore 패턴의 RN 버전
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {ColorTheme} from '@/theme/colors';

type TimeFormat = '12h' | '24h';
type FontFamily = 'system' | 'opendyslexic';

interface SettingsState {
  // 표시 설정
  timeFormat: TimeFormat;
  fontFamily: FontFamily;
  fontSize: number;
  colorTheme: ColorTheme;
  showDescriptions: boolean;

  // ADHD 설정
  showFuelBadges: boolean;
  hapticEnabled: boolean;
  animationsEnabled: boolean;

  // 알림 설정
  notificationsEnabled: boolean;
  pomodoroReminders: boolean;

  // 동기화
  _lastSyncedAt: string | null;

  // 액션
  setTimeFormat: (format: TimeFormat) => void;
  setFontFamily: (font: FontFamily) => void;
  setFontSize: (size: number) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setShowDescriptions: (show: boolean) => void;
  setShowFuelBadges: (show: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  loadFromDB: (settings: Record<string, any>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      timeFormat: '24h',
      fontFamily: 'system',
      fontSize: 17,
      colorTheme: 'ocean-blue',
      showDescriptions: true,
      showFuelBadges: true,
      hapticEnabled: true,
      animationsEnabled: true,
      notificationsEnabled: true,
      pomodoroReminders: true,
      _lastSyncedAt: null,

      setTimeFormat: (format) => set({timeFormat: format}),
      setFontFamily: (font) => set({fontFamily: font}),
      setFontSize: (size) => set({fontSize: Math.max(12, Math.min(24, size))}),
      setColorTheme: (theme) => set({colorTheme: theme}),
      setShowDescriptions: (show) => set({showDescriptions: show}),
      setShowFuelBadges: (show) => set({showFuelBadges: show}),
      setHapticEnabled: (enabled) => set({hapticEnabled: enabled}),
      setAnimationsEnabled: (enabled) => set({animationsEnabled: enabled}),
      setNotificationsEnabled: (enabled) => set({notificationsEnabled: enabled}),
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
