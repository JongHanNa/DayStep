/**
 * NativeFeedbackEditor — 새 제보(버그/기능) 작성 네이티브 시트 TS wrapper
 * iOS: SwiftUI NavigationView + Form + Picker + TextField + TextEditor
 * Android: TBD (현재 BottomSheet 폴백 사용)
 * 네이티브 미등록 시 null export → RN 폴백 사용
 */
import React from 'react';
import {UIManager, requireNativeComponent} from 'react-native';

export type NativeFeedbackEditorType = 'bug' | 'feature';

export interface NativeFeedbackEditorData {
  type: NativeFeedbackEditorType;
  title: string;
  content: string;
}

interface NativeFeedbackEditorProps {
  primaryColor: string;
  editorData: string; // JSON of NativeFeedbackEditorData
  submitting?: boolean;
  onSubmit: (e: {
    nativeEvent: {type: NativeFeedbackEditorType; title: string; content: string};
  }) => void;
  onClose: (e: {nativeEvent: {}}) => void;
  style?: any;
}

const hasNativeModule =
  UIManager.getViewManagerConfig('NativeFeedbackEditor') != null;

const NativeFeedbackEditorView = hasNativeModule
  ? requireNativeComponent<NativeFeedbackEditorProps>('NativeFeedbackEditor')
  : null;

function NativeFeedbackEditorComponent(
  props: NativeFeedbackEditorProps,
): React.ReactElement | null {
  if (!NativeFeedbackEditorView) return null;
  return <NativeFeedbackEditorView {...props} />;
}

/** null when native module not registered (e.g. Android build) */
export const NativeFeedbackEditorNative = hasNativeModule
  ? NativeFeedbackEditorComponent
  : null;
