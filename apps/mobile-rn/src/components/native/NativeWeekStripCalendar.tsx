/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * iOS: SwiftUI/UIKit 네이티브 컴포넌트 (자체 드래그 처리)
 * Android: Jetpack Compose 네이티브 컴포넌트 (자체 드래그/스와이프/탭 처리)
 *          → onExpandProgressChange 이벤트로 expandProgress를 RN SharedValue에 전달
 *          → Reanimated useEvent로 UI thread에서 직접 처리 (60fps)
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, requireNativeComponent, View} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useEvent,
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

const AnimatedNativeWeekStrip = Animated.createAnimatedComponent(
  NativeWeekStripCalendarView,
);

/**
 * Android 전용 래퍼: 네이티브 Compose가 드래그/스와이프/탭 모두 자체 처리
 * → onExpandProgressChange 이벤트를 useEvent로 UI thread에서 수신하여 SharedValue 업데이트
 */
function AndroidWeekStripCalendar(props: NativeWeekStripCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  // 부모에서 전달받은 SharedValue 사용 (없으면 자체 생성)
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

  // Reanimated useEvent: 네이티브 expandProgressChange 이벤트를 UI thread에서 직접 수신
  const progressEventHandler = useEvent<{progress: number}>(
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
        onExpandProgressChange={progressEventHandler}
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
