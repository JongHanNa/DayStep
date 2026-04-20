/**
 * NativeMotivationJournal — 원동력 새기기/편집 네이티브 시트 TS wrapper
 * iOS: SwiftUI NavigationStack + Form + TextEditor + .swipeActions
 * Android: TBD (Jetpack Compose Material3)
 * 네이티브 미등록 시 null export → RN 폴백 사용
 */
import React from 'react';
import {UIManager, requireNativeComponent} from 'react-native';

export interface NativeMotivationJournalNoteData {
  id?: string;
  title: string;
  content: string;
  is_banner_pinned: boolean;
  created_at?: string; // ISO8601
}

export interface NativeMotivationJournalLinkedTodo {
  id: string;
  title: string;
}

interface NativeMotivationJournalProps {
  mode: 'create' | 'edit';
  primaryColor: string;
  prompt?: string;
  noteData: string; // JSON of NativeMotivationJournalNoteData
  linkedTodosData: string; // JSON of NativeMotivationJournalLinkedTodo[]
  onSave: (e: {nativeEvent: {title: string; content: string; isPinned: boolean}}) => void;
  onPinToggle: (e: {nativeEvent: {isPinned: boolean}}) => void;
  onDelete: (e: {nativeEvent: {}}) => void;
  onUnlinkTodo: (e: {nativeEvent: {todoId: string}}) => void;
  onLinkTodoRequest: (e: {nativeEvent: {}}) => void;
  onClose: (e: {nativeEvent: {}}) => void;
  style?: any;
}

const hasNativeModule =
  UIManager.getViewManagerConfig('NativeMotivationJournal') != null;

const NativeMotivationJournalView = hasNativeModule
  ? requireNativeComponent<NativeMotivationJournalProps>('NativeMotivationJournal')
  : null;

function NativeMotivationJournalComponent(
  props: NativeMotivationJournalProps,
): React.ReactElement | null {
  if (!NativeMotivationJournalView) return null;
  return <NativeMotivationJournalView {...props} />;
}

/** null when native module not registered (e.g. Android build) */
export const NativeMotivationJournalNative = hasNativeModule
  ? NativeMotivationJournalComponent
  : null;
