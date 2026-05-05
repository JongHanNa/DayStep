/**
 * NativeMonthCalendar — 월간 캘린더 TS 래퍼
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {requireNativeComponent} from 'react-native';

interface NativeMonthCalendarProps {
  selectedDate: string;
  primaryColor: string;
  monthData: string;
  eventData: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  onMonthChange: (e: {nativeEvent: {year: number; month: number}}) => void;
  onNavigateToPlanner: (e: {nativeEvent: {date: string}}) => void;
  style?: any;
}

const NativeMonthCalendarView =
  requireNativeComponent<NativeMonthCalendarProps>('NativeMonthCalendar');

export function NativeMonthCalendarNative(
  props: NativeMonthCalendarProps,
): React.ReactElement {
  return <NativeMonthCalendarView {...props} />;
}
