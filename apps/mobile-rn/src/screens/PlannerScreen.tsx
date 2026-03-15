/**
 * PlannerScreen — 통합 플래너 화면
 * LiquidGlassMenu로 5개 뷰 전환: 일 / 3일 / 주 / 하루 계획하기 / 월간 계획하기
 * 뷰 전환 시 FadeIn/FadeOut 네이티브 모션 적용
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {FadeIn, FadeOut} from 'react-native-reanimated';
import {ScreenContainer} from '@/components/core';
import {LiquidGlassMenu} from '@/components/native';
import {DailyPlannerView} from '@/components/planner/DailyPlannerView';
import {MonthlyPlannerView} from '@/components/planner/MonthlyPlannerView';
import {NativeDayTimeGridNative} from '@/components/native/NativeDayTimeGrid';
import {NativeMultiDayTimeGridNative} from '@/components/native/NativeMultiDayTimeGrid';
import {useSettingsStore, type PlannerViewMode} from '@/stores/settingsStore';
import {useTodoStore} from '@/stores/todoStore';
import {useCalendarStore} from '@/stores/calendarStore';
import {useTheme} from '@/theme';
import {Calendar} from 'lucide-react-native';
import {format, addDays, subDays} from 'date-fns';
import type {Todo} from '@daystep/shared-core';

const MENU_ITEMS = [
  {title: '일', key: 'day'},
  {title: '3일', key: '3day'},
  {title: '주', key: 'week'},
  {title: '하루 계획하기', key: 'dailyPlanner'},
  {title: '월간 계획하기', key: 'monthlyPlanner'},
];

const GRADIENT_MAP: Record<PlannerViewMode, 'calmBackground' | 'warmBackground'> = {
  day: 'calmBackground',
  '3day': 'calmBackground',
  week: 'calmBackground',
  dailyPlanner: 'calmBackground',
  monthlyPlanner: 'warmBackground',
};

export default function PlannerScreen() {
  const viewMode = useSettingsStore(s => s.plannerViewMode);
  const setPlannerViewMode = useSettingsStore(s => s.setPlannerViewMode);
  const {primaryColor} = useTheme();
  const {selectedDate, setSelectedDate, todos, fetchTodosForDateRange} = useTodoStore();
  const {isConnected, monthEvents, fetchEventsForMonth} = useCalendarStore();

  // 3일/주 뷰용 날짜 범위 데이터
  const [multiDayTodoMap, setMultiDayTodoMap] = useState<Record<string, Todo[]>>({});
  const [multiDayEventMap, setMultiDayEventMap] = useState<Record<string, any[]>>({});

  const handleMenuSelect = useCallback(
    (key: string) => {
      setPlannerViewMode(key as PlannerViewMode);
    },
    [setPlannerViewMode],
  );

  // 3일/주 뷰 날짜 범위 계산
  const multiDayRange = useMemo(() => {
    if (viewMode !== '3day' && viewMode !== 'week') return null;
    const dayCount = viewMode === '3day' ? 3 : 7;
    const center = new Date(selectedDate);
    const startOffset = Math.floor(dayCount / 2);
    const startDate = format(subDays(center, startOffset), 'yyyy-MM-dd');
    const endDate = format(addDays(center, dayCount - startOffset - 1), 'yyyy-MM-dd');
    return {startDate, endDate, dayCount};
  }, [viewMode, selectedDate]);

  // 3일/주 뷰 데이터 로드
  useEffect(() => {
    if (!multiDayRange) return;
    const {startDate, endDate} = multiDayRange;

    fetchTodosForDateRange(startDate, endDate).then(result => {
      setMultiDayTodoMap(result);
    });

    // 캘린더 이벤트 fetch
    if (isConnected) {
      const [y, m] = startDate.split('-').map(Number);
      fetchEventsForMonth(y, m);
    }
  }, [multiDayRange, fetchTodosForDateRange, isConnected, fetchEventsForMonth]);

  // 일 뷰 날짜 변경 시 데이터 로드
  useEffect(() => {
    if (viewMode === 'day' && isConnected && selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      fetchEventsForMonth(y, m);
    }
  }, [viewMode, selectedDate, isConnected, fetchEventsForMonth]);

  // 일 뷰용 데이터
  const dayTodoData = useMemo(() => {
    const items = todos.map(t => ({
      id: t.id,
      title: t.title,
      start_time: t.start_time,
      end_time: t.end_time,
      completed: t.completed,
      project_color: t.color || '#6366F1',
    }));
    return JSON.stringify(items);
  }, [todos]);

  const dayEventData = useMemo(() => {
    if (!isConnected) return '[]';
    const events = monthEvents[selectedDate] ?? [];
    const items = events.map((e: any) => ({
      id: e.id,
      title: e.title || e.summary,
      start: e.start,
      end: e.end,
      color: e.color || '#4285F4',
      isAllDay: e.isAllDay || false,
    }));
    return JSON.stringify(items);
  }, [isConnected, monthEvents, selectedDate]);

  // 3일/주 뷰 데이터를 JSON 직렬화
  const multiDayTodoDataJson = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const [dateStr, dateTodos] of Object.entries(multiDayTodoMap)) {
      result[dateStr] = dateTodos.map(t => ({
        id: t.id,
        title: t.title,
        start_time: t.start_time,
        end_time: t.end_time,
        completed: t.completed,
        project_color: t.color || '#6366F1',
      }));
    }
    return JSON.stringify(result);
  }, [multiDayTodoMap]);

  const multiDayEventDataJson = useMemo(() => {
    if (!isConnected) return '{}';
    // monthEvents를 범위 내 날짜별로 필터
    const result: Record<string, any[]> = {};
    if (multiDayRange) {
      const start = new Date(multiDayRange.startDate);
      const end = new Date(multiDayRange.endDate);
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const events = monthEvents[dateStr] ?? [];
        result[dateStr] = events.map((e: any) => ({
          id: e.id,
          title: e.title || e.summary,
          start: e.start,
          end: e.end,
          color: e.color || '#4285F4',
          isAllDay: e.isAllDay || false,
        }));
      }
    }
    return JSON.stringify(result);
  }, [isConnected, monthEvents, multiDayRange]);

  const handleDayDateSelect = useCallback(
    (e: {nativeEvent: {date: string}}) => {
      setSelectedDate(e.nativeEvent.date);
    },
    [setSelectedDate],
  );

  const handleTodoPress = useCallback(
    (_e: {nativeEvent: {todoId: string}}) => {
      // TODO: 할일 상세 열기
    },
    [],
  );

  const handleDateRangeChange = useCallback(
    (e: {nativeEvent: {startDate: string; endDate: string}}) => {
      // 스와이프 시 새 범위의 중앙 날짜를 selectedDate로 설정
      const start = new Date(e.nativeEvent.startDate);
      const end = new Date(e.nativeEvent.endDate);
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      setSelectedDate(format(mid, 'yyyy-MM-dd'));
    },
    [setSelectedDate],
  );

  const gradient = GRADIENT_MAP[viewMode];

  const menuOverlay = (
    <View style={styles.menuOverlay} pointerEvents="box-none">
      <LiquidGlassMenu
        systemIconName="calendar"
        iconColor={primaryColor}
        size={36}
        menuItems={MENU_ITEMS}
        onSelect={handleMenuSelect}
        fallbackIcon={<Calendar size={18} color={primaryColor} />}
      />
    </View>
  );

  const renderView = () => {
    switch (viewMode) {
      case 'dailyPlanner':
        return (
          <DailyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
      case 'monthlyPlanner':
        return (
          <MonthlyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
      case 'day':
        return (
          <View style={{flex: 1, position: 'relative'}}>
            <NativeDayTimeGridNative
              selectedDate={selectedDate}
              primaryColor={primaryColor}
              todoData={dayTodoData}
              eventData={dayEventData}
              onDateSelect={handleDayDateSelect}
              onTodoPress={handleTodoPress}
              onHeightChange={() => {}}
              style={{flex: 1}}
            />
            {menuOverlay}
          </View>
        );
      case '3day':
        return (
          <View style={{flex: 1, position: 'relative'}}>
            <NativeMultiDayTimeGridNative
              dayCount={3}
              centerDate={selectedDate}
              primaryColor={primaryColor}
              todoData={multiDayTodoDataJson}
              eventData={multiDayEventDataJson}
              onDateSelect={handleDayDateSelect}
              onTodoPress={handleTodoPress}
              onDateRangeChange={handleDateRangeChange}
              onHeightChange={() => {}}
              style={{flex: 1}}
            />
            {menuOverlay}
          </View>
        );
      case 'week':
        return (
          <View style={{flex: 1, position: 'relative'}}>
            <NativeMultiDayTimeGridNative
              dayCount={7}
              centerDate={selectedDate}
              primaryColor={primaryColor}
              todoData={multiDayTodoDataJson}
              eventData={multiDayEventDataJson}
              onDateSelect={handleDayDateSelect}
              onTodoPress={handleTodoPress}
              onDateRangeChange={handleDateRangeChange}
              onHeightChange={() => {}}
              style={{flex: 1}}
            />
            {menuOverlay}
          </View>
        );
      default:
        return (
          <DailyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
    }
  };

  return (
    <ScreenContainer gradient={gradient}>
      {/* 뷰 컨텐츠 (FadeIn/FadeOut 전환) */}
      <Animated.View
        key={viewMode}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{flex: 1}}>
        {renderView()}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
