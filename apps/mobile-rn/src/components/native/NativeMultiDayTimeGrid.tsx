/**
 * NativeMultiDayTimeGrid — 3일/주 뷰 시간 그리드 TS 래퍼
 *
 * iOS: 네이티브 SwiftUI 멀티데이 시간 그리드
 * Android: 네이티브 Jetpack Compose 멀티데이 시간 그리드
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeMultiDayTimeGridProps {
  dayCount: number;
  centerDate: string;
  primaryColor: string;
  todoData: string;
  eventData: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onTodoPress: (e: {nativeEvent: {todoId: string}}) => void;
  onDateRangeChange: (e: {nativeEvent: {startDate: string; endDate: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle;
}

const NativeMultiDayTimeGridView =
  requireNativeComponent<NativeMultiDayTimeGridProps>('NativeMultiDayTimeGrid');

export function NativeMultiDayTimeGridNative(
  props: NativeMultiDayTimeGridProps,
): React.ReactElement {
  return <NativeMultiDayTimeGridView {...props} />;
}
