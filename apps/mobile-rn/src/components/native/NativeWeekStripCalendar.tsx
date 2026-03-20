/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {requireNativeComponent} from 'react-native';

interface NativeWeekStripCalendarProps {
  selectedDate: string;
  primaryColor: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number; animated?: boolean}}) => void;
  onExpandChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  gradientColors?: string[];
  gradientStartX?: number;
  gradientStartY?: number;
  gradientEndX?: number;
  gradientEndY?: number;
  style?: any;
}

const NativeWeekStripCalendarView =
  requireNativeComponent<NativeWeekStripCalendarProps>('NativeWeekStripCalendar');

export function NativeWeekStripCalendarNative(
  props: NativeWeekStripCalendarProps,
): React.ReactElement {
  return <NativeWeekStripCalendarView {...props} />;
}
