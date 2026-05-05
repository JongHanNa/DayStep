/**
 * FocusGardenView — 집중 정원 데이터 오케스트레이션
 * pomodoroStore → iOS 네이티브 (있으면) / JS 폴백
 */
import React, {useMemo} from 'react';
import {Platform, useWindowDimensions, View, StyleSheet, UIManager} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';
import {JSFocusGardenView} from './JSFocusGardenView';

// iOS 네이티브 컴포넌트 — Xcode에 Swift 파일이 등록되어 있을 때만 사용
// hasViewManagerConfig로 런타임 등록 여부를 체크해 미등록 시 JS 폴백
const hasNativeFocusGarden =
  Platform.OS === 'ios' &&
  typeof (UIManager as any).hasViewManagerConfig === 'function' &&
  (UIManager as any).hasViewManagerConfig('NativeFocusGarden');

let NativeFocusGardenNative: any = null;
if (hasNativeFocusGarden) {
  try {
    NativeFocusGardenNative = require('@/components/native/NativeFocusGarden').NativeFocusGardenNative;
  } catch {
    // TS wrapper 미존재 — JS 폴백
  }
}

export function FocusGardenView() {
  const {primaryColor} = useTheme();
  const {width: screenWidth} = useWindowDimensions();
  const {
    focusGardenViewMode,
    focusGardenSelectedDate,
    setFocusGardenViewMode,
    setFocusGardenSelectedDate,
    getFocusGardenPayload,
    sessions,
  } = usePomodoroStore();

  const gardenDataJson = useMemo(() => {
    return JSON.stringify(getFocusGardenPayload());
    // sessions 변경 시 payload 재계산
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, getFocusGardenPayload]);

  // iOS 네이티브 높이 애니메이션 (네이티브 컴포넌트가 있을 때만 사용)
  const gardenHeight = useSharedValue(450);
  const gardenAnimatedStyle = useAnimatedStyle(() => ({
    height: gardenHeight.value,
    overflow: 'hidden' as const,
  }));

  const handleHeightChange = (e: {nativeEvent: {height: number}}) => {
    gardenHeight.value = withSpring(e.nativeEvent.height, {damping: 20, stiffness: 150});
  };

  const handleViewModeChange = (e: {nativeEvent: {mode: string}}) => {
    const mode = e.nativeEvent.mode as 'day' | 'week' | 'month' | 'year';
    setFocusGardenViewMode(mode);
  };

  const handleDateSelect = (e: {nativeEvent: {date: string}}) => {
    setFocusGardenSelectedDate(e.nativeEvent.date);
  };

  // iOS + 네이티브 등록된 경우만 네이티브 사용
  if (Platform.OS === 'ios' && NativeFocusGardenNative) {
    return (
      <Animated.View style={gardenAnimatedStyle}>
        <NativeFocusGardenNative
          viewMode={focusGardenViewMode}
          selectedDate={focusGardenSelectedDate}
          primaryColor={primaryColor}
          gardenData={gardenDataJson}
          onDateSelect={handleDateSelect}
          onHeightChange={handleHeightChange}
          onViewModeChange={handleViewModeChange}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }

  // JS 폴백 (Android + iOS 네이티브 미등록 시)
  return (
    <View style={styles.jsContainer}>
      <JSFocusGardenView
        gardenDataJson={gardenDataJson}
        viewMode={focusGardenViewMode}
        primaryColor={primaryColor}
        screenWidth={screenWidth}
        onViewModeChange={setFocusGardenViewMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  jsContainer: {
    paddingVertical: 8,
  },
});
