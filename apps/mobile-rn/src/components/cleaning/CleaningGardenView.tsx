/**
 * CleaningGardenView — 청소 정원 데이터 오케스트레이션
 * cleaningStore → NativeCleaningGarden 네이티브 컴포넌트 연결
 */
import React, {useMemo, useState, useCallback, useEffect} from 'react';
import {StyleSheet, Platform} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useTheme} from '@/theme';
import {format, startOfMonth, endOfMonth} from 'date-fns';

// iOS 전용 네이티브 컴포넌트
const NativeCleaningGardenNative = Platform.OS === 'ios'
  ? require('@/components/native/NativeCleaningGarden').NativeCleaningGardenNative
  : null;

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
  const gardenHeight = useSharedValue(300);
  const gardenAnimatedStyle = useAnimatedStyle(() => ({
    height: gardenHeight.value,
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
    gardenHeight.value = withTiming(e.nativeEvent.height, {duration: 250});
  }, []);

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

  if (Platform.OS !== 'ios' || !NativeCleaningGardenNative) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, gardenAnimatedStyle]}>
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

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
