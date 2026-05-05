/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * iOS: SwiftUI/UIKit 네이티브 컴포넌트 (자체 드래그 처리)
 * Android: Jetpack Compose 네이티브 컴포넌트 (자체 드래그/스와이프/탭 처리)
 *          → onExpandProgressChange를 Reanimated useEvent로 UI thread에서 직접 수신
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, requireNativeComponent, View} from 'react-native';
import Animated, {
  useSharedValue,
  useEvent,
  type SharedValue,
} from 'react-native-reanimated';

interface NativeWeekStripCalendarProps {
  selectedDate: string;
  primaryColor: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number; animated?: boolean}}) => void;
  onExpandChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  onExpandProgressChange?: any;
  isExpanded?: boolean;
  expandProgress?: number;
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

const AnimatedNativeWeekStrip = Animated.createAnimatedComponent(
  NativeWeekStripCalendarView,
);

/**
 * Android 전용 래퍼: 네이티브 Compose가 드래그/스와이프/탭 모두 자체 처리
 * useEvent로 onExpandProgressChange를 UI thread에서 직접 수신 → SharedValue 60fps 업데이트
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

  // Reanimated useEvent: UI thread에서 expandProgress 직접 수신 (브릿지 우회, 60fps)
  const progressHandler = useEvent<{progress: number}>(
    (event) => {
      'worklet';
      progress.value = event.progress;
    },
    ['onExpandProgressChange'],
  );

  const {style, expandProgressValue: _, ...restProps} = props;

  return (
    <View style={style}>
      <AnimatedNativeWeekStrip
        {...restProps}
        style={{flex: 1}}
        isExpanded={expanded}
        onHeightChange={handleHeightChange}
        onExpandChange={handleExpandChange}
        onExpandProgressChange={progressHandler}
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
