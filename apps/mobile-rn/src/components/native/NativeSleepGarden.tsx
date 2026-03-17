/**
 * NativeSleepGarden — 수면 정원 4-뷰 네이티브 컴포넌트 TS 래퍼
 */
import React from 'react';
import {requireNativeComponent} from 'react-native';

interface NativeSleepGardenProps {
  viewMode: 'day' | 'week' | 'month' | 'year';
  selectedDate: string; // yyyy-MM-dd
  primaryColor: string;
  gardenData: string; // JSON string
  goalMinutes: number;
  streak: number;
  onDateSelect?: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange?: (e: {nativeEvent: {height: number}}) => void;
  onViewModeChange?: (e: {nativeEvent: {mode: string}}) => void;
  onMonthChange?: (e: {nativeEvent: {year: number; month: number}}) => void;
  style?: any;
}

const NativeSleepGardenView =
  requireNativeComponent<NativeSleepGardenProps>('NativeSleepGarden');

export function NativeSleepGardenNative(
  props: NativeSleepGardenProps,
): React.ReactElement {
  return <NativeSleepGardenView {...props} />;
}
