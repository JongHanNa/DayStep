/**
 * NativeDayTimeGrid — 일 뷰 시간 그리드 TS 래퍼
 *
 * iOS: 네이티브 SwiftUI 시간 그리드
 * Android: 네이티브 Jetpack Compose 시간 그리드
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeDayTimeGridProps {
  selectedDate: string;
  primaryColor: string;
  todoData: string;
  eventData: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onTodoPress: (e: {nativeEvent: {todoId: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  /** Long-press + drag로 시간을 변경했을 때 발화. start_time/end_time은 ISO8601 */
  onTodoEdit?: (e: {nativeEvent: {id: string; start_time: string; end_time: string}}) => void;
  style?: ViewStyle;
}

const NativeDayTimeGridView =
  requireNativeComponent<NativeDayTimeGridProps>('NativeDayTimeGrid');

export function NativeDayTimeGridNative(
  props: NativeDayTimeGridProps,
): React.ReactElement {
  return <NativeDayTimeGridView {...props} />;
}
