/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * iOS: SwiftUI/UIKit 네이티브 컴포넌트 (자체 드래그 처리)
 * Android: Jetpack Compose 네이티브 컴포넌트 (자체 드래그/스와이프/탭 처리)
 *          → onExpandProgressChange 이벤트로 expandProgress를 RN SharedValue에 전달
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, requireNativeComponent, View} from 'react-native';
import {
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

interface NativeWeekStripCalendarProps {
  selectedDate: string;
  primaryColor: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number; animated?: boolean}}) => void;
  onExpandChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  onExpandProgressChange?: (e: {nativeEvent: {progress: number}}) => void;
  isExpanded?: boolean;
  expandProgress?: number;
  /** Android: 부모에서 생성한 SharedValue — expandProgress 이벤트로 업데이트 */
  expandProgressValue?: SharedValue<number>;
  gradientColors?: string[];
  gradientStartX?: number;
  gradientStartY?: number;
  gradientEndX?: number;
  gradientEndY?: number;
  style?: any;
}

const NativeWeekStripCalendarView =
  requireNativeComponent<NativeWeekStripCalendarProps>('NativeWeekStripCalendar');

/**
 * Android 전용 래퍼: 네이티브 Compose가 드래그/스와이프/탭 모두 자체 처리
 * onExpandProgressChange → JS 콜백으로 SharedValue 업데이트
 */
function AndroidWeekStripCalendar(props: NativeWeekStripCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const internalProgress = useSharedValue(0);
  const progress = props.expandProgressValue ?? internalProgress;

  const handleHeightChange = useCallback(
    (e: {nativeEvent: {height: number; animated?: boolean}}) => {
      props.onHeightChange(e);
    },
    [props.onHeightChange],
  );

  const handleExpandChange = useCallback(
    (e: {nativeEvent: {expanded: boolean}}) => {
      const isExp = e.nativeEvent.expanded;
      expandedRef.current = isExp;
      setExpanded(isExp);
      props.onExpandChange?.(e);
    },
    [props.onExpandChange],
  );

  const handleProgressChange = useCallback(
    (e: {nativeEvent: {progress: number}}) => {
      progress.value = e.nativeEvent.progress;
    },
    [progress],
  );

  const {style, expandProgressValue: _, ...restProps} = props;

  return (
    <View style={style}>
      <NativeWeekStripCalendarView
        {...restProps}
        style={{flex: 1}}
        isExpanded={expanded}
        onHeightChange={handleHeightChange}
        onExpandChange={handleExpandChange}
        onExpandProgressChange={handleProgressChange}
      />
    </View>
  );
}

export function NativeWeekStripCalendarNative(
  props: NativeWeekStripCalendarProps,
): React.ReactElement {
  if (Platform.OS === 'ios') {
    return <NativeWeekStripCalendarView {...props} />;
  }
  return <AndroidWeekStripCalendar {...props} />;
}
