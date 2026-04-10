/**
 * CleaningGardenView — 청소 정원 데이터 오케스트레이션
 * cleaningStore → NativeCleaningGarden 네이티브 컴포넌트 연결
 * iOS: SwiftUI, Android: Jetpack Compose
 */
import React, {useMemo, useState, useCallback, useEffect} from 'react';
import {StyleSheet, Platform, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useTheme} from '@/theme';
import {format, startOfMonth, endOfMonth} from 'date-fns';

// 네이티브 컴포넌트 (iOS + Android)
const NativeCleaningGardenNative =
  require('@/components/native/NativeCleaningGarden').NativeCleaningGardenNative;

interface CleaningGardenViewProps {
  onViewModeChange?: (mode: 'day' | 'week' | 'month' | 'year') => void;
}

export function CleaningGardenView({onViewModeChange}: CleaningGardenViewProps) {
  const {primaryColor} = useTheme();
  const {
    gardenViewMode,
    gardenSelectedDate,
    cleaningRecords,
    setGardenViewMode,
    setGardenSelectedDate,
    getGardenPayload,
    fetchCleaningRecords,
  } = useCleaningStore();

  // 높이 애니메이션
  const gardenHeight = useSharedValue(450);
  const [androidGardenHeight, setAndroidGardenHeight] = useState(450);
  const gardenAnimatedStyle = useAnimatedStyle(() => ({
    height: gardenHeight.value,
    overflow: 'hidden' as const,
  }));

  // 최초 마운트 시 현재 월 데이터 fetch
  useEffect(() => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    fetchCleaningRecords(start, end);
  }, []);

  // 정원 데이터 JSON
  const gardenDataJson = useMemo(() => {
    return getGardenPayload();
  }, [cleaningRecords, getGardenPayload]);

  const handleDateSelect = useCallback((e: {nativeEvent: {date: string}}) => {
    setGardenSelectedDate(e.nativeEvent.date);
  }, [setGardenSelectedDate]);

  const handleHeightChange = useCallback((e: {nativeEvent: {height: number}}) => {
    const h = e.nativeEvent.height;
    if (Platform.OS === 'ios') {
      gardenHeight.value = withSpring(h, {damping: 20, stiffness: 150});
    } else {
      // Android: 직접 높이 state 업데이트 (Animated.View 대신 View 사용)
      setAndroidGardenHeight(Math.max(h, 100));
    }
  }, [gardenHeight]);

  const handleViewModeChange = useCallback((e: {nativeEvent: {mode: string}}) => {
    const mode = e.nativeEvent.mode as 'day' | 'week' | 'month' | 'year';
    setGardenViewMode(mode);
    onViewModeChange?.(mode);
  }, [setGardenViewMode, onViewModeChange]);

  const handleMonthChange = useCallback((e: {nativeEvent: {year: number; month: number}}) => {
    const {year, month} = e.nativeEvent;
    if (month === 0) {
      // 년 뷰: 1년 전체 fetch
      fetchCleaningRecords(`${year}-01-01`, `${year}-12-31`);
    } else {
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(monthStart);
      fetchCleaningRecords(
        format(monthStart, 'yyyy-MM-dd'),
        format(monthEnd, 'yyyy-MM-dd'),
      );
    }
  }, [fetchCleaningRecords]);

  if (!NativeCleaningGardenNative) {
    return null;
  }

  if (Platform.OS === 'ios') {
    return (
      <Animated.View style={gardenAnimatedStyle}>
        <NativeCleaningGardenNative
          viewMode={gardenViewMode}
          selectedDate={gardenSelectedDate}
          primaryColor={primaryColor}
          gardenData={gardenDataJson}
          onDateSelect={handleDateSelect}
          onHeightChange={handleHeightChange}
          onViewModeChange={handleViewModeChange}
          onMonthChange={handleMonthChange}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }

  // Android: View + state height (SleepGarden 패턴)
  return (
    <View style={[styles.gardenCardAndroid, {height: androidGardenHeight}]}>
      <NativeCleaningGardenNative
        viewMode={gardenViewMode}
        selectedDate={gardenSelectedDate}
        primaryColor={primaryColor}
        gardenData={gardenDataJson}
        onDateSelect={handleDateSelect}
        onHeightChange={handleHeightChange}
        onViewModeChange={handleViewModeChange}
        onMonthChange={handleMonthChange}
        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  gardenCardAndroid: {
    minHeight: 100,
  },
});
