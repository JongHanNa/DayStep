import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  TodoCompletionSettings,
  DEFAULT_TODO_COMPLETION_SETTINGS,
  CompletionBehavior,
  ThemePalette,
  DEFAULT_THEME_PALETTE
} from '@/types/settings';

export type TimeFormat = '12h' | '24h';
export type FontFamily = 'system' | 'opendyslexic';
export type WordSpacing = number; // -0.5 ~ 0.5 범위의 em 단위
export type LetterSpacing = number; // -0.2 ~ 0.3 범위의 em 단위
export type FontSize = number; // 12 ~ 24 범위의 px 단위
export type BubbleShape = 'circle' | 'square' | 'arrow'; // 타임라인 버블 아이콘 형태

interface SettingsState {
  // 시간 표기법 설정
  timeFormat: TimeFormat;

  // 글꼴 설정
  fontFamily: FontFamily;
  wordSpacing: WordSpacing;
  letterSpacing: LetterSpacing;
  fontSize: FontSize;

  // 타임라인 설정
  bubbleShape: BubbleShape;

  // 할일 완료 설정
  todoCompletion: TodoCompletionSettings;

  // 테마 팔레트 설정
  themePalette: ThemePalette;

  // Actions
  setTimeFormat: (format: TimeFormat) => void;
  setFontFamily: (family: FontFamily) => void;
  setWordSpacing: (spacing: WordSpacing) => void;
  setLetterSpacing: (spacing: LetterSpacing) => void;
  setFontSize: (size: FontSize) => void;
  setBubbleShape: (shape: BubbleShape) => void;
  setCompletionBehavior: (behavior: CompletionBehavior) => void;
  setShowCompletedItems: (show: boolean) => void;
  setCompletedItemsOpacity: (opacity: number) => void;
  setThemePalette: (palette: ThemePalette) => void;
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

        // 기본값: 원형 버블
        bubbleShape: 'circle',

        // 할일 완료 설정 기본값
        todoCompletion: DEFAULT_TODO_COMPLETION_SETTINGS,

        // 테마 팔레트 기본값
        themePalette: DEFAULT_THEME_PALETTE,

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

        setBubbleShape: (shape: BubbleShape) => {
          console.log('⚙️ 버블 형태 설정 변경:', shape);
          set({ bubbleShape: shape });
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

        setThemePalette: (palette: ThemePalette) => {
          console.log('⚙️ 테마 팔레트 설정 변경:', palette);
          set({ themePalette: palette });
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
          bubbleShape: state.bubbleShape,
          todoCompletion: state.todoCompletion,
          themePalette: state.themePalette,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
);