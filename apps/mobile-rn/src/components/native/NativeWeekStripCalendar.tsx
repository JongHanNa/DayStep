/**
 * NativeWeekStripCalendar — 주간 스트립 캘린더 TS 래퍼
 *
 * iOS: SwiftUI/UIKit 네이티브 컴포넌트
 * Android: Jetpack Compose 네이티브 컴포넌트 + RN 제스처로 확장/축소
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React, {useCallback, useRef, useState} from 'react';
import {Platform, requireNativeComponent, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';

interface NativeWeekStripCalendarProps {
  selectedDate: string;
  primaryColor: string;
  onDateSelect: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number; animated?: boolean}}) => void;
  onExpandChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  isExpanded?: boolean;
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
 * Android 전용 래퍼: PanGesture로 수직 드래그 감지 → isExpanded prop 전달
 */
function AndroidWeekStripCalendar(props: NativeWeekStripCalendarProps) {
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);

  const handleExpandChange = useCallback(
    (isExp: boolean) => {
      expandedRef.current = isExp;
      setExpanded(isExp);
      props.onExpandChange?.({nativeEvent: {expanded: isExp}});
    },
    [props.onExpandChange],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetY([-15, 15])
    .failOffsetX([-30, 30])
    .onEnd(e => {
      const threshold = 40;
      if (!expandedRef.current && e.translationY > threshold) {
        handleExpandChange(true);
      } else if (expandedRef.current && e.translationY < -threshold) {
        handleExpandChange(false);
      }
    })
    .runOnJS(true);

  // 네이티브에서 날짜 탭 시 축소 요청
  const handleNativeExpandChange = useCallback(
    (e: {nativeEvent: {expanded: boolean}}) => {
      const isExp = e.nativeEvent.expanded;
      expandedRef.current = isExp;
      setExpanded(isExp);
      props.onExpandChange?.(e);
    },
    [props.onExpandChange],
  );

  // style에서 height/alignSelf 등을 래퍼에도 전달
  const {style, ...restProps} = props;

  return (
    <GestureDetector gesture={panGesture}>
      <View style={style}>
        <NativeWeekStripCalendarView
          {...restProps}
          style={{flex: 1}}
          isExpanded={expanded}
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
