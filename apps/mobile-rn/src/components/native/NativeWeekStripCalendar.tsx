/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * iOS: SwiftUI/UIKit 네이티브 컴포넌트 (자체 드래그 처리)
 * Android: Jetpack Compose + Reanimated useAnimatedProps로
 *          expandProgress(0~1)를 UI 스레드에서 직접 네이티브 뷰에 전달
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, requireNativeComponent, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';

interface NativeWeekStripCalendarProps {
  selectedDate: string;
  primaryColor: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number; animated?: boolean}}) => void;
  onExpandChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  isExpanded?: boolean;
  expandProgress?: number;
  /** Android: 부모에서 생성한 SharedValue를 직접 전달 */
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
 * Android 전용 래퍼: 부모에서 받은 SharedValue로 expandProgress를
 * UI 스레드에서 직접 제어 → 캘린더 + 콘텐츠 모두 60fps
 */
function AndroidWeekStripCalendar(props: NativeWeekStripCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  // 부모에서 전달받은 SharedValue 사용 (없으면 자체 생성)
  const internalProgress = useSharedValue(0);
  const progress = props.expandProgressValue ?? internalProgress;

  const DRAG_THRESHOLD = 200;

  const handleHeightChange = useCallback(
    (e: {nativeEvent: {height: number; animated?: boolean}}) => {
      props.onHeightChange(e);
    },
    [props.onHeightChange],
  );

  const handleExpandChange = useCallback(
    (isExp: boolean) => {
      expandedRef.current = isExp;
      setExpanded(isExp);
      props.onExpandChange?.({nativeEvent: {expanded: isExp}});
    },
    [props.onExpandChange],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate(e => {
      'worklet';
      const base = expandedRef.current ? 1 : 0;
      const delta = e.translationY / DRAG_THRESHOLD;
      progress.value = Math.max(0, Math.min(1, base + delta));
    })
    .onEnd(e => {
      'worklet';
      const velocity = e.velocityY;
      const current = progress.value;

      let shouldExpand: boolean;
      if (Math.abs(velocity) > 500) {
        shouldExpand = velocity > 0;
      } else {
        shouldExpand = current > 0.5;
      }

      progress.value = withTiming(shouldExpand ? 1 : 0, {duration: 250});
      runOnJS(handleExpandChange)(shouldExpand);
    });

  // UI 스레드에서 직접 네이티브 prop 업데이트
  const animatedProps = useAnimatedProps(() => ({
    expandProgress: progress.value,
  }));

  // 네이티브에서 날짜 탭 시 축소 요청
  const handleNativeExpandChange = useCallback(
    (e: {nativeEvent: {expanded: boolean}}) => {
      const isExp = e.nativeEvent.expanded;
      expandedRef.current = isExp;
      setExpanded(isExp);
      progress.value = withTiming(isExp ? 1 : 0, {duration: 250});
      props.onExpandChange?.(e);
    },
    [props.onExpandChange, progress],
  );

  const {style, expandProgressValue: _, ...restProps} = props;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={style}>
        <AnimatedNativeWeekStrip
          {...restProps}
          style={{flex: 1}}
          animatedProps={animatedProps}
          isExpanded={expanded}
          onHeightChange={handleHeightChange}
          onExpandChange={handleNativeExpandChange}
        />
      </View>
    </GestureDetector>
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
