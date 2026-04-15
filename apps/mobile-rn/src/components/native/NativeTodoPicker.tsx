/**
 * NativeTodoPicker — 할일 연결 피커 TS 래퍼
 * iOS: SwiftUI List(.insetGrouped) + .searchable
 * Android: Jetpack Compose LazyColumn + SearchBar
 * 네이티브 미등록 시 null export (RN 폴백 사용)
 */
import React from 'react';
import {UIManager, requireNativeComponent, Platform} from 'react-native';

interface NativeTodoPickerProps {
  todosData: string;
  linkedTodoIds: string[];
  primaryColor: string;
  onTodoToggle: (e: {nativeEvent: {todoId: string; todoTitle: string; isLinked: boolean}}) => void;
  onClose: (e: {nativeEvent: {}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  style?: any;
}

const hasNativeModule = UIManager.getViewManagerConfig('NativeTodoPicker') != null;

const NativeTodoPickerView = hasNativeModule
  ? requireNativeComponent<NativeTodoPickerProps>('NativeTodoPicker')
  : null;

function NativeTodoPickerComponent(
  props: NativeTodoPickerProps,
): React.ReactElement | null {
  if (!NativeTodoPickerView) return null;
  return <NativeTodoPickerView {...props} />;
}

/** null when native module not registered */
export const NativeTodoPickerNative = hasNativeModule
  ? NativeTodoPickerComponent
  : null;
