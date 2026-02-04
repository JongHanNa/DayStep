import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  TodoCompletionSettings,
  DEFAULT_TODO_COMPLETION_SETTINGS,
  CompletionBehavior
} from '@/types/settings';
import { ColorTheme, DEFAULT_COLOR_THEME } from '@/lib/color-themes';

export type TimeFormat = '12h' | '24h';
export type FontFamily = 'system' | 'opendyslexic';
export type WordSpacing = number; // -0.5 ~ 0.5 범위의 em 단위
export type LetterSpacing = number; // -0.2 ~ 0.3 범위의 em 단위
export type FontSize = number; // 12 ~ 24 범위의 px 단위

export type { ColorTheme } from '@/lib/color-themes';

// DB 동기화용 설정 타입 (persist 대상만)
export interface AppSettings {
  timeFormat: TimeFormat;
  fontFamily: FontFamily;
  wordSpacing: WordSpacing;
  letterSpacing: LetterSpacing;
  fontSize: FontSize;
  todoCompletion: TodoCompletionSettings;
  colorTheme: ColorTheme;
  showDescriptions: boolean;
  showFuelBadges: boolean;
  _lastSyncedAt: string | null;
}

interface SettingsState extends AppSettings {
  // DB 동기화 상태
  _isSyncing: boolean;

  // Actions
  setTimeFormat: (format: TimeFormat) => void;
  setFontFamily: (family: FontFamily) => void;
  setWordSpacing: (spacing: WordSpacing) => void;
  setLetterSpacing: (spacing: LetterSpacing) => void;
  setFontSize: (size: FontSize) => void;
  setCompletionBehavior: (behavior: CompletionBehavior) => void;
  setShowCompletedItems: (show: boolean) => void;
  setCompletedItemsOpacity: (opacity: number) => void;
  setColorTheme: (theme: ColorTheme) => void;
  setShowDescriptions: (show: boolean) => void;
  setShowFuelBadges: (show: boolean) => void;

  // DB 동기화 액션
  loadFromDB: (settings: Partial<AppSettings>) => void;
  setIsSyncing: (syncing: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // 기본값: 12시간 표기법
        timeFormat: '12h',

        // 기본값: 시스템 글꼴
        fontFamily: 'system',

        // 기본값: 기본 단어 간격 (0.0em)
        wordSpacing: 0.0,

        // 기본값: 기본 글자 간격 (0.0em)
        letterSpacing: 0.0,

        // 기본값: 기본 글자 크기 (16px)
        fontSize: 16,

        // 할일 완료 설정 기본값
        todoCompletion: DEFAULT_TODO_COMPLETION_SETTINGS,

        // 기본값: Ocean Blue 테마
        colorTheme: DEFAULT_COLOR_THEME,

        // 기본값: 설명 표시
        showDescriptions: true,

        // 기본값: Fuel 배지 표시
        showFuelBadges: true,

        // DB 동기화 상태
        _lastSyncedAt: null,
        _isSyncing: false,

        // Actions
        setTimeFormat: (format: TimeFormat) => {
          console.log('⚙️ 시간 표기법 설정 변경:', format);
          set({ timeFormat: format });
        },
        
        setFontFamily: (family: FontFamily) => {
          console.log('⚙️ 글꼴 설정 변경:', family);
          set({ fontFamily: family });
        },
        
        setWordSpacing: (spacing: WordSpacing) => {
          console.log('⚙️ 단어 간격 설정 변경:', spacing);
          set({ wordSpacing: spacing });
        },
        
        setLetterSpacing: (spacing: LetterSpacing) => {
          console.log('⚙️ 글자 간격 설정 변경:', spacing);
          set({ letterSpacing: spacing });
        },
        
        setFontSize: (size: FontSize) => {
          console.log('⚙️ 글자 크기 설정 변경:', size);
          set({ fontSize: size });
        },

        setCompletionBehavior: (behavior: CompletionBehavior) => {
          console.log('⚙️ 할일 완료 동작 설정 변경:', behavior);
          set((state) => ({
            todoCompletion: {
              ...state.todoCompletion,
              behavior
            }
          }));
        },
        
        setShowCompletedItems: (show: boolean) => {
          console.log('⚙️ 완료된 할일 표시 설정 변경:', show);
          set((state) => ({
            todoCompletion: {
              ...state.todoCompletion,
              showCompletedItems: show
            }
          }));
        },
        
        setCompletedItemsOpacity: (opacity: number) => {
          console.log('⚙️ 완료된 할일 투명도 설정 변경:', opacity);
          set((state) => ({
            todoCompletion: {
              ...state.todoCompletion,
              completedItemsOpacity: opacity
            }
          }));
        },

        setColorTheme: (theme: ColorTheme) => {
          console.log('⚙️ 컬러 테마 설정 변경:', theme);
          set({ colorTheme: theme });
        },

        setShowDescriptions: (show: boolean) => {
          console.log('⚙️ 설명 표시 설정 변경:', show);
          set({ showDescriptions: show });
        },

        setShowFuelBadges: (show: boolean) => {
          console.log('⚙️ Fuel 배지 표시 설정 변경:', show);
          set({ showFuelBadges: show });
        },

        // DB 동기화 액션
        loadFromDB: (settings: Partial<AppSettings>) => {
          console.log('⚙️ DB에서 설정 로드:', settings);
          set((state) => ({
            ...state,
            ...settings,
          }));
        },

        setIsSyncing: (syncing: boolean) => {
          set({ _isSyncing: syncing });
        },
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          timeFormat: state.timeFormat,
          fontFamily: state.fontFamily,
          wordSpacing: state.wordSpacing,
          letterSpacing: state.letterSpacing,
          fontSize: state.fontSize,
          todoCompletion: state.todoCompletion,
          colorTheme: state.colorTheme,
          showDescriptions: state.showDescriptions,
          showFuelBadges: state.showFuelBadges,
          _lastSyncedAt: state._lastSyncedAt,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
);

/**
 * DB 동기화를 위해 현재 설정을 추출하는 유틸리티 함수
 */
export function getSettingsForSync(): AppSettings {
  const state = useSettingsStore.getState();
  return {
    timeFormat: state.timeFormat,
    fontFamily: state.fontFamily,
    wordSpacing: state.wordSpacing,
    letterSpacing: state.letterSpacing,
    fontSize: state.fontSize,
    todoCompletion: state.todoCompletion,
    colorTheme: state.colorTheme,
    showDescriptions: state.showDescriptions,
    showFuelBadges: state.showFuelBadges,
    _lastSyncedAt: state._lastSyncedAt,
  };
}